import { describe, expect, test } from "bun:test";
import { HsrcpayApiError, HsrcpayClient, HsrcpayValidationError } from "../src";
import { price, product, productUsage } from "./fixtures.more";
import { mockFetch, ok, page, queryOf } from "./helpers";

const setup = (...replies: Parameters<typeof mockFetch>) => {
  const mock = mockFetch(...replies);
  return { client: new HsrcpayClient({ apiKey: "sk_test_k", baseUrl: "http://api.test", fetch: mock.fetch, retryDelayMs: 1 }), calls: mock.calls };
};

const invalid = (run: () => unknown, fragment: string) => {
  try {
    run();
  } catch (e) {
    expect(e).toBeInstanceOf(HsrcpayValidationError);
    expect((e as Error).message).toContain(fragment);
    return;
  }
  throw new Error("expected a validation error");
};

describe("products", () => {
  test("create sends account_id in the body, not the query", async () => {
    const { client, calls } = setup(ok(product(), 201));
    await client.products.create({ account_id: "acc_1", name: "Pro", type: "service", status: "active" });
    expect(new URL(calls[0]!.url).search).toBe("");
    expect(calls[0]?.body).toEqual({ account_id: "acc_1", name: "Pro", type: "service", status: "active" });
  });

  test("create with a default price", async () => {
    const { client, calls } = setup(ok(product()));
    await client.products.create({
      name: "Pro",
      default_price_data: { type: "recurring", interval: "month", amount: 2900, currency: "USD" },
    });
    expect((calls[0]?.body as { default_price_data: unknown }).default_price_data).toEqual({
      type: "recurring",
      interval: "month",
      amount: 2900,
      currency: "USD",
    });
  });

  test("retrieve, usage and list", async () => {
    const { client, calls } = setup(ok(product()), ok(productUsage()), page([product()]));
    expect((await client.products.retrieve("prod_1")).prices).toHaveLength(1);
    expect((await client.products.usage("prod_1")).deletable).toBe(false);
    await client.products.list({ status: "active", type: "good", category: "books", query: "pro", page: 1, limit: 10, account_id: "acc_1" });
    expect(calls[0]?.url).toBe("http://api.test/v1/products/prod_1");
    expect(calls[1]?.url).toBe("http://api.test/v1/products/prod_1/usage");
    expect(queryOf(calls[2]!.url)).toEqual({
      status: "active",
      type: "good",
      category: "books",
      query: "pro",
      page: "1",
      limit: "10",
      account_id: "acc_1",
    });
  });

  test("update is a PUT, updateStatus a POST to /status", async () => {
    const { client, calls } = setup(ok(product()), ok(product({ status: "archived" })));
    await client.products.update("prod_1", { name: "Pro 2", default_price_id: null });
    await client.products.updateStatus("prod_1", "archived");
    expect(calls[0]?.method).toBe("PUT");
    expect(calls[0]?.body).toEqual({ name: "Pro 2", default_price_id: null });
    expect(calls[1]?.method).toBe("POST");
    expect(new URL(calls[1]!.url).pathname).toBe("/v1/products/prod_1/status");
    expect(calls[1]?.body).toEqual({ status: "archived" });
  });

  test("delete returns the success flag", async () => {
    const { client } = setup(ok({ success: true }));
    expect(await client.products.delete("prod_1")).toEqual({ success: true });
  });

  test.each([
    [{}, "name"],
    [{ name: "P", status: "archived" }, "status"],
    [{ name: "P", type: "bundle" }, "type"],
    [{ name: "P", images: Array.from({ length: 9 }, () => "https://x.test/a.png") }, "images"],
    [{ name: "P", images: ["http://x.test/a.png"] }, "images"],
    [{ name: "P", images: ["not a url"] }, "images"],
    [{ name: "P", marketing_features: Array.from({ length: 16 }, () => ({ name: "f" })) }, "marketing_features"],
    [{ name: "P", statement_descriptor: "abcd" }, "statement_descriptor"],
    [{ name: "P", statement_descriptor: "a".repeat(23) }, "statement_descriptor"],
    [{ name: "P", unit_label: "a".repeat(13) }, "unit_label"],
    [{ name: "P", entitlement_priority: 1.5 }, "entitlement_priority"],
    [{ name: "P", package_dimensions: { height: 1 } }, "package_dimensions"],
    [{ name: "P", metadata: { a: { nested: true } } }, "metadata"],
    [{ name: "P", metadata: { ["k".repeat(41)]: "v" } }, "metadata"],
    [{ name: "P", metadata: { k: "v".repeat(501) } }, "metadata"],
    [{ name: "P", metadata: Object.fromEntries(Array.from({ length: 51 }, (_, i) => [`k${i}`, i])) }, "metadata"],
    [{ name: "P", surprise: true }, "surprise"],
  ])("create rejects %j", (params, fragment) => {
    const { client, calls } = setup(ok(product()));
    invalid(() => client.products.create(params as never), fragment);
    expect(calls).toHaveLength(0);
  });

  test.each([
    [{ statement_descriptor: "abcde" }],
    [{ statement_descriptor: "a".repeat(22) }],
    [{ unit_label: "a".repeat(12) }],
    [{ images: Array.from({ length: 8 }, () => "https://x.test/a.png") }],
    [{ metadata: { a: 1, b: "two", c: true, d: null } }],
    [{ package_dimensions: { height: 1, length: 2, weight: 3, width: 4 }, shippable: true, type: "good" }],
  ])("create accepts %j", async (extra) => {
    const { client, calls } = setup(ok(product()));
    await client.products.create({ name: "P", ...(extra as object) });
    expect(calls).toHaveLength(1);
  });

  test("updateStatus rejects an unknown status", () => {
    const { client } = setup(ok(product()));
    invalid(() => client.products.updateStatus("prod_1", "deleted" as never), "status");
  });
});

describe("prices", () => {
  test("account-wide list joins lookup_keys with commas", async () => {
    const { client, calls } = setup(page([price()]));
    await client.prices.list({ lookup_keys: ["a", "b"], product_id: "prod_1", status: "active", type: "recurring", currency: "USD", page: 1, limit: 5 });
    expect(queryOf(calls[0]!.url)).toEqual({
      lookup_keys: "a,b",
      product_id: "prod_1",
      status: "active",
      type: "recurring",
      currency: "USD",
      page: "1",
      limit: "5",
    });
  });

  test("lookup_keys is capped at 10 and cannot be empty", () => {
    const { client } = setup(page([]));
    invalid(() => client.prices.list({ lookup_keys: Array.from({ length: 11 }, (_, i) => `k${i}`) }), "lookup_keys");
    invalid(() => client.prices.list({ lookup_keys: [] }), "lookup_keys");
  });

  test("retrieve by price id", async () => {
    const { client, calls } = setup(ok(price()));
    expect((await client.prices.retrieve("price_1")).amount).toBe(2900);
    expect(calls[0]?.url).toBe("http://api.test/v1/prices/price_1");
  });
});

describe("products.prices", () => {
  test("list, create, retrieve", async () => {
    const { client, calls } = setup(page([price()]), ok(price(), 201), ok(price()));
    await client.products.prices.list("prod_1", { status: "active", page: 1 });
    await client.products.prices.create("prod_1", { type: "one_time", amount: 500, currency: "EUR", set_as_default: true });
    await client.products.prices.retrieve("prod_1", "price_1");
    expect(new URL(calls[0]!.url).pathname).toBe("/v1/products/prod_1/prices");
    expect(calls[1]?.method).toBe("POST");
    expect(calls[1]?.body).toEqual({ type: "one_time", amount: 500, currency: "EUR", set_as_default: true });
    expect(calls[2]?.url).toBe("http://api.test/v1/products/prod_1/prices/price_1");
  });

  test("update is a PUT and updateStatus a POST to /status", async () => {
    const { client, calls } = setup(ok(price()), ok(price({ status: "inactive" })));
    await client.products.prices.update("prod_1", "price_1", { name: "New", metadata: { a: 1 } });
    await client.products.prices.updateStatus("prod_1", "price_1", "inactive");
    expect(calls[0]?.method).toBe("PUT");
    expect(calls[1]?.method).toBe("POST");
    expect(new URL(calls[1]!.url).pathname).toBe("/v1/products/prod_1/prices/price_1/status");
    expect(calls[1]?.body).toEqual({ status: "inactive" });
  });

  test("an immutable field refusal keeps its code and field", async () => {
    const { client } = setup(new Response(JSON.stringify({ code: "immutable_field", field: "amount" }), { status: 400 }));
    const error = (await client.products.prices.update("prod_1", "price_1", { name: "x" }).catch((e: unknown) => e)) as HsrcpayApiError;
    expect(error.status).toBe(400);
    expect(error.errorCode).toBe("immutable_field");
    expect(error.details).toEqual({ field: "amount" });
  });

  test("a price cannot be deleted through the SDK", () => {
    const { client } = setup(ok(price()));
    expect((client.products.prices as unknown as Record<string, unknown>).delete).toBeUndefined();
  });

  test("price immutable fields cannot be updated client-side either", () => {
    const { client } = setup(ok(price()));
    invalid(() => client.products.prices.update("prod_1", "price_1", { amount: 1 } as never), "amount");
    invalid(() => client.products.prices.update("prod_1", "price_1", { currency: "USD" } as never), "currency");
  });

  test.each([
    [{ amount: 100, currency: "USD" }, "type"],
    [{ type: "one_time", amount: 100 }, "currency"],
    [{ type: "monthly", amount: 100, currency: "USD" }, "type"],
    [{ type: "one_time", amount: 1.5, currency: "USD" }, "amount"],
    [{ type: "one_time", amount: 100, currency: "JPY" }, "currency"],
    [{ type: "recurring", interval: "decade", currency: "USD" }, "interval"],
    [{ type: "recurring", interval: "month", interval_count: 0.5, currency: "USD" }, "interval_count"],
    [{ type: "one_time", currency: "USD", tax_behavior: "maybe" }, "tax_behavior"],
    [{ type: "one_time", currency: "USD", tiers: [{ up_to: 1.5 }] }, "tiers"],
    [{ type: "one_time", currency: "USD", transform_quantity: { divide_by: 2, round: "sideways" } }, "transform_quantity"],
    [{ type: "one_time", currency: "USD", meter_id: "" }, "meter_id"],
    [{ type: "one_time", currency: "USD", status: "archived" }, "status"],
    [{ type: "one_time", currency: "USD", surprise: 1 }, "surprise"],
  ])("create rejects %j", (params, fragment) => {
    const { client, calls } = setup(ok(price()));
    invalid(() => client.products.prices.create("prod_1", params as never), fragment);
    expect(calls).toHaveLength(0);
  });

  test("create accepts a tiered metered price", async () => {
    const { client, calls } = setup(ok(price()));
    await client.products.prices.create("prod_1", {
      type: "recurring",
      interval: "month",
      currency: "USD",
      billing_scheme: "tiered",
      usage_type: "metered",
      meter_id: "meter_1",
      tiers_mode: "graduated",
      tiers: [
        { up_to: 100, unit_amount: 10 },
        { up_to: null, unit_amount: 5, flat_amount: null },
      ],
    });
    expect(calls).toHaveLength(1);
  });

  test("ids are validated", () => {
    const { client } = setup(ok(price()));
    invalid(() => client.products.prices.list("", {}), "productId");
    invalid(() => client.products.prices.retrieve("p", ""), "priceId");
  });
});
