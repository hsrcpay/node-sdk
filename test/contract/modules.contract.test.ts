/** Customers, catalog and checkout: requests must satisfy the backend schemas, replies both sides' schemas. */
import { describe, expect, test } from "bun:test";
import {
  AddressType,
  AfterCompletionType,
  AmountMode,
  CheckoutSessionSchema,
  CheckoutSessionStatus,
  CollectAddress,
  CustomerSchema,
  HsrcpayClient,
  HsrcpayPublicClient,
  LineItemSourceType,
  PriceBillingScheme,
  PriceInterval,
  PriceSchema,
  PriceStatus,
  PriceTiersMode,
  PriceTransformQuantityRound,
  PriceType,
  PriceUsageType,
  ProductSchema,
  ProductStatus,
  ProductType,
  ProductUsageSchema,
  TaxBehavior,
} from "../../src";
import { payment } from "../fixtures";
import { address, checkoutSession, customer, price, product, productUsage } from "../fixtures.more";
import { mockFetch, ok, page, queryOf } from "../helpers";
import {
  AddressCreateBodySchema,
  AddressDtoSchema,
  AddressUpdateBodySchema,
  CheckoutAmountBodySchema,
  CheckoutCreateBodySchema,
  CheckoutCreateQuerySchema,
  CheckoutListQuerySchema,
  CheckoutPrepareBodySchema,
  CheckoutSearchQuerySchema,
  CheckoutSessionDtoSchema,
  CheckoutUpdateBodySchema,
  CustomerCreateBodySchema,
  CustomerCreateQuerySchema,
  CustomerDtoSchema,
  CustomerListQuerySchema,
  CustomerUpdateBodySchema,
  MORE_ENUMS,
  PriceCreateBodySchema,
  PriceDtoSchema,
  PriceListQuerySchema,
  PriceStatusBodySchema,
  PriceUpdateBodySchema,
  ProductCreateBodySchema,
  ProductDtoSchema,
  ProductListQuerySchema,
  ProductPriceListQuerySchema,
  ProductStatusBodySchema,
  ProductUpdateBodySchema,
  ProductUsageDtoSchema,
} from "./backend-schemas.more";

const secret = (reply: Response = ok({})) => {
  const mock = mockFetch(reply);
  return { client: new HsrcpayClient({ apiKey: "sk_test_k", baseUrl: "http://api.test", fetch: mock.fetch }), calls: mock.calls };
};

describe("enum parity with the backend", () => {
  test.each([
    ["AddressType", AddressType, MORE_ENUMS.addressType],
    ["ProductStatus", ProductStatus, MORE_ENUMS.productStatus],
    ["ProductType", ProductType, MORE_ENUMS.productType],
    ["PriceStatus", PriceStatus, MORE_ENUMS.priceStatus],
    ["PriceType", PriceType, MORE_ENUMS.priceType],
    ["PriceInterval", PriceInterval, MORE_ENUMS.priceInterval],
    ["TaxBehavior", TaxBehavior, MORE_ENUMS.taxBehavior],
    ["PriceBillingScheme", PriceBillingScheme, MORE_ENUMS.billingScheme],
    ["PriceUsageType", PriceUsageType, MORE_ENUMS.usageType],
    ["PriceTiersMode", PriceTiersMode, MORE_ENUMS.tiersMode],
    ["PriceTransformQuantityRound", PriceTransformQuantityRound, MORE_ENUMS.transformRound],
    ["CheckoutSessionStatus", CheckoutSessionStatus, MORE_ENUMS.checkoutStatus],
    ["AmountMode", AmountMode, MORE_ENUMS.amountMode],
    ["CollectAddress", CollectAddress, MORE_ENUMS.collectAddress],
    ["AfterCompletionType", AfterCompletionType, MORE_ENUMS.afterCompletion],
    ["LineItemSourceType", LineItemSourceType, MORE_ENUMS.lineItemSource],
  ] as const)("%s has exactly the backend values", (_name, sdk, backend) => {
    expect(Object.values(sdk).sort()).toEqual([...backend].sort());
  });
});

describe("response fixtures agree on both sides", () => {
  test("customer and address", () => {
    expect(CustomerDtoSchema.safeParse(customer()).success).toBe(true);
    expect(CustomerSchema.safeParse(customer()).success).toBe(true);
    expect(AddressDtoSchema.safeParse(address()).success).toBe(true);
    expect(CustomerSchema.safeParse(customer({ external_reference: "crm", alternate_emails: ["a@b.co"] })).success).toBe(true);
  });

  test.each(MORE_ENUMS.priceType)("price type %s", (type) => {
    expect(PriceDtoSchema.safeParse(price({ type })).success).toBe(true);
    expect(PriceSchema.safeParse(price({ type })).success).toBe(true);
  });

  test("price with tiers, custom amount and transform quantity", () => {
    const sample = price({
      billing_scheme: "tiered",
      tiers_mode: "volume",
      tiers: [{ up_to: 10, unit_amount: 5, flat_amount: null }, { up_to: null, unit_amount: 3, flat_amount: 100 }],
      custom_unit_amount: { minimum: 100, maximum: 10000, preset: 500 },
      transform_quantity: { divide_by: 10, round: "up" },
    });
    expect(PriceDtoSchema.safeParse(sample).success).toBe(true);
    expect(PriceSchema.safeParse(sample).success).toBe(true);
  });

  test("product, usage and session", () => {
    expect(ProductDtoSchema.safeParse(product()).success).toBe(true);
    expect(ProductSchema.safeParse(product()).success).toBe(true);
    expect(ProductUsageDtoSchema.safeParse(productUsage()).success).toBe(true);
    expect(ProductUsageSchema.safeParse(productUsage()).success).toBe(true);
    expect(CheckoutSessionDtoSchema.safeParse(checkoutSession()).success).toBe(true);
    expect(CheckoutSessionSchema.safeParse(checkoutSession()).success).toBe(true);
  });

  test.each(MORE_ENUMS.checkoutStatus)("checkout status %s", (status) => {
    expect(CheckoutSessionSchema.safeParse(checkoutSession({ status })).success).toBe(true);
  });

  test.each(MORE_ENUMS.amountMode)("amount mode %s", (amount_mode) => {
    expect(CheckoutSessionSchema.safeParse(checkoutSession({ amount_mode })).success).toBe(true);
  });

  test("unknown fields are tolerated and bad enums rejected", () => {
    expect(CustomerSchema.safeParse(customer({ extra: 1 })).success).toBe(true);
    expect(ProductSchema.safeParse(product({ status: "deleted" })).success).toBe(false);
    expect(PriceSchema.safeParse(price({ currency: "JPY" })).success).toBe(false);
    expect(CheckoutSessionSchema.safeParse(checkoutSession({ token: undefined })).success).toBe(false);
  });
});

describe("customer requests", () => {
  test.each([
    [{ name: "Ada" }],
    [{ name: "Ada", email: "a@b.co", phone: "+90", country: "TR", external_reference: "x", alternate_emails: ["z@b.co"], metadata: { a: 1 } }],
    [{ name: "Ada", email: null }],
    [{ name: "Ada", data: {} }],
    [{ name: "Ada", addresses: [{ type: "SHIPPING", country: "TR" }, { type: "BOTH", country: "US", is_default: true, city: "NYC", line1: "1 Main", zip: "1" }] }],
    [{ account_id: "acc_1", name: "Ada" }],
  ])("create %j", async (params) => {
    const { client, calls } = secret(ok(customer()));
    await client.customers.create(params as never);
    expect(CustomerCreateBodySchema.safeParse(calls[0]!.body).success).toBe(true);
    expect(CustomerCreateQuerySchema.safeParse(queryOf(calls[0]!.url)).success).toBe(true);
  });

  test.each([
    [{}],
    [{ name: "G", email: "g@b.co", phone: "1", country: "TR", metadata: { a: { b: 1 } } }],
    [{ address: "1 Main", city: "X", state: "Y", zip: "1" }],
  ])("update %j", async (params) => {
    const { client, calls } = secret(ok(customer()));
    await client.customers.update("cus_1", params);
    expect(CustomerUpdateBodySchema.safeParse(calls[0]!.body).success).toBe(true);
  });

  test("list", async () => {
    const { client, calls } = secret(page([customer()]));
    await client.customers.list({ account_id: "a", external_reference: "x", page: 1, limit: 10 });
    expect(CustomerListQuerySchema.safeParse(queryOf(calls[0]!.url)).success).toBe(true);
  });

  test.each([
    [{ type: "BILLING", is_default: false, country: "TR" }],
    [{ type: "BOTH", is_default: true, country: "TR", label: "home", city: "c", state: "s", line1: "l1", line2: "l2", zip: "z" }],
  ])("address create %j", async (params) => {
    const { client, calls } = secret(ok(address()));
    await client.customers.addresses.create("cus_1", params as never);
    expect(AddressCreateBodySchema.safeParse(calls[0]!.body).success).toBe(true);
  });

  test("address update", async () => {
    const { client, calls } = secret(ok(address()));
    await client.customers.addresses.update("cus_1", "addr_1", { label: "l", country: "US", city: "c", state: "s", line1: "a", line2: "b", zip: "z" });
    expect(AddressUpdateBodySchema.safeParse(calls[0]!.body).success).toBe(true);
  });
});

describe("catalog requests", () => {
  const drafts = [
    { type: "one_time", amount: 500, currency: "USD" },
    { type: "recurring", interval: "month", interval_count: 3, amount: 2900, currency: "EUR", trial_period_days: 14, tax_behavior: "include" },
    { type: "recurring", interval: "year", amount: 0, currency: "GBP", billing_scheme: "tiered", tiers_mode: "graduated", tiers: [{ up_to: 10, unit_amount: 5 }, { up_to: null, flat_amount: 100 }] },
    { type: "recurring", interval: "month", currency: "USD", usage_type: "metered", meter_id: "m1", billing_scheme: "per_unit" },
    { type: "one_time", amount: 0, currency: "TRY", custom_unit_amount: { minimum: 100, maximum: 5000, preset: 500 } },
    { type: "one_time", amount: 100, currency: "TRY", transform_quantity: { divide_by: 5, round: "down" } },
    { type: "one_time", amount: 100, currency: "TRY", status: "inactive", lookup_key: "lk", name: "n", description: null, metadata: { a: 1, b: null } },
  ] as const;

  test.each(drafts)("price create %j", async (draft) => {
    const { client, calls } = secret(ok(price()));
    await client.products.prices.create("prod_1", { ...draft, set_as_default: false } as never);
    expect(PriceCreateBodySchema.safeParse(calls[0]!.body).success).toBe(true);
  });

  test.each(drafts)("product create with default_price_data %j", async (draft) => {
    const { client, calls } = secret(ok(product()));
    await client.products.create({ name: "P", default_price_data: draft as never });
    expect(ProductCreateBodySchema.safeParse(calls[0]!.body).success).toBe(true);
  });

  test("price update and status", async () => {
    const { client, calls } = secret(ok(price()));
    await client.products.prices.update("p", "pr", { lookup_key: "x", name: "n", description: null, tax_behavior: "exclude", meter_id: null, metadata: { a: "b" } });
    await client.products.prices.updateStatus("p", "pr", "archived");
    expect(PriceUpdateBodySchema.safeParse(calls[0]!.body).success).toBe(true);
    expect(PriceStatusBodySchema.safeParse(calls[1]!.body).success).toBe(true);
  });

  test("price lists", async () => {
    const { client, calls } = secret(page([price()]));
    await client.prices.list({ account_id: "a", product_id: "p", lookup_keys: ["a", "b"], status: "active", type: "one_time", currency: "TRY", page: 1, limit: 2 });
    await client.products.prices.list("p", { status: "inactive", type: "recurring", currency: "USD", page: 3, limit: 4 });
    expect(PriceListQuerySchema.safeParse(queryOf(calls[0]!.url)).success).toBe(true);
    expect(ProductPriceListQuerySchema.safeParse(queryOf(calls[1]!.url)).success).toBe(true);
  });

  test.each([
    [{ name: "P" }],
    [{ name: "P", lookup_key: "p", status: "inactive", type: "good", category: "c", description: "d", url: "https://x.test" }],
    [{ name: "P", images: ["https://x.test/a.png"], marketing_features: [{ name: "f" }], shippable: true, tax_code: "t", unit_label: "seat", entitlement_priority: 3 }],
  ])("product create %j", async (params) => {
    const { client, calls } = secret(ok(product()));
    await client.products.create(params as never);
    expect(ProductCreateBodySchema.safeParse(calls[0]!.body).success).toBe(true);
  });

  test("product update, status and list", async () => {
    const { client, calls } = secret(ok(product()));
    await client.products.update("p", { name: "n", lookup_key: "k", default_price_id: "price_1", metadata: { a: 1 } });
    await client.products.updateStatus("p", "inactive");
    await client.products.list({ account_id: "a", status: "active", type: "service", category: "c", query: "q", page: 1, limit: 2 });
    expect(ProductUpdateBodySchema.safeParse(calls[0]!.body).success).toBe(true);
    expect(ProductStatusBodySchema.safeParse(calls[1]!.body).success).toBe(true);
    expect(ProductListQuerySchema.safeParse(queryOf(calls[2]!.url)).success).toBe(true);
  });
});

describe("checkout requests", () => {
  test.each([
    [{ amount: 100, currency: "TRY", url: "https://x.test/c" }],
    [{ currency: "USD", line_items: [{ price_id: "p1" }, { price_id: "p2", quantity: 3 }] }],
    [{ currency: "USD", line_items: [{ price_id: "p1" }], success_url: "https://x.test/s", cancel_url: "https://x.test/c", return_url: "https://x.test/r", metadata: { a: 1 }, customer_id: "c", expires_at: new Date("2030-01-01T00:00:00Z") }],
    [{ account_id: "acc_1", currency: "EUR", line_items: [{ price_id: "p" }] }],
  ])("create %j", async (params) => {
    const { client, calls } = secret(ok(checkoutSession()));
    await client.checkoutSessions.create(params as never);
    expect(CheckoutCreateBodySchema.safeParse(calls[0]!.body).success).toBe(true);
    expect(CheckoutCreateQuerySchema.safeParse(queryOf(calls[0]!.url)).success).toBe(true);
  });

  test("list, update and search", async () => {
    const { client, calls } = secret(ok([]));
    await client.checkoutSessions.list({ account_id: "a", page: 1, limit: 2 });
    await client.checkoutSessions.update("cs", { status: "FAILED", metadata: { a: 1 } });
    await client.checkoutSessions.search({ q: "x", account_id: "a" });
    expect(CheckoutListQuerySchema.safeParse(queryOf(calls[0]!.url)).success).toBe(true);
    expect(CheckoutUpdateBodySchema.safeParse(calls[1]!.body).success).toBe(true);
    expect(CheckoutSearchQuerySchema.safeParse(queryOf(calls[2]!.url)).success).toBe(true);
  });

  test("publishable-key calls", async () => {
    const mock = mockFetch(ok({ checkout_session: checkoutSession(), payment: payment() }));
    const client = new HsrcpayPublicClient({ publishableKey: "pk_test_k", baseUrl: "http://api.test", fetch: mock.fetch });
    await client.checkoutSessions.updateAmount("tok", { amount: 1500 });
    await client.checkoutSessions.prepare("tok", { payer: { name: "A", email: "a@b.co", phone: "1", locale: "tr", billing_address: null, shipping_address: { city: "x" }, custom_fields_values: { k: "v" } } });
    await client.checkoutSessions.prepare("tok");
    expect(CheckoutAmountBodySchema.safeParse(mock.calls[0]!.body).success).toBe(true);
    expect(CheckoutPrepareBodySchema.safeParse(mock.calls[1]!.body).success).toBe(true);
    expect(CheckoutPrepareBodySchema.safeParse(mock.calls[2]!.body).success).toBe(true);
  });
});
