/** Every request the SDK emits must be accepted by the backend schemas (copied in backend-schemas.ts). */
import { describe, expect, test } from "bun:test";
import { HsrcpayClient } from "../../src";
import { card, confirmData, payment, refund } from "../fixtures";
import { mockFetch, ok, page, queryOf } from "../helpers";
import {
  ConfirmHeadersSchema,
  PaymentConfirmBodySchema,
  PaymentCreateBodySchema,
  PaymentCreateQuerySchema,
  PaymentGetQuerySchema,
  PaymentListQuerySchema,
  PaymentRefundBodySchema,
  PaymentTimelineQuerySchema,
  RefundListQuerySchema,
} from "./backend-schemas";

const setup = (reply = ok(payment())) => {
  const mock = mockFetch(reply);
  const client = new HsrcpayClient({ apiKey: "sk_test_x", baseUrl: "http://api.test", fetch: mock.fetch });
  return { client, calls: mock.calls };
};

const createCases = [
  {},
  { amount: 10 },
  { amount: 2500, currency: "TRY" },
  { amount: 2500, currency: "USD", customer_id: "cus_1" },
  { price_id: "price_1" },
  { product_id: "prod_1", price_id: "price_1", currency: "EUR" },
  { amount: 5000, auto_capture: false },
  { amount: 5000, auto_capture: true, installments: 3 },
  { amount: 5000, secure_mode: "auto" },
  { amount: 5000, secure_mode: true },
  { amount: 5000, secure_mode: false },
  { amount: 5000, installments: 64 },
  { amount: 5000, metadata: { order_id: "o1", nested: { a: [1, 2] } } },
  { amount: 5000, account_id: "acc_1" },
] as const;

describe("payments.create request contract", () => {
  test.each(createCases)("accepted by the backend: %j", async (params) => {
    const { client, calls } = setup();
    await client.payments.create(params);
    const call = calls[0]!;
    const { account_id, ...rest } = params as { account_id?: string };
    expect(PaymentCreateBodySchema.safeParse(call.body).success).toBe(true);
    expect(PaymentCreateQuerySchema.safeParse(queryOf(call.url)).success).toBe(true);
    expect(queryOf(call.url).account_id).toBe(account_id);
    expect(call.body).toEqual(rest);
  });
});

describe("payments.confirm request contract", () => {
  const methods = [
    { type: "card" as const, data: card },
    { type: "card" as const, data: card, save: true },
    { type: "card" as const, data: card, save: false },
    { id: "pm_1" },
  ];
  const routing = [
    undefined,
    { provider_identifier: "iyzico" },
    { provider_identifier: ["iyzico", "stripe"] },
    { payment_provider_config_id: "ppc_1" },
    { payment_provider_config_id: ["ppc_1", "ppc_2"] },
  ];
  const identities = [
    undefined,
    { ip_address: "203.0.113.4" },
    { ip_address: null, user_agent: null },
    { ip_address: "203.0.113.4", user_agent: "Mozilla/5.0", ip_address_details: { country: "TR" } },
  ];

  for (const [mi, payment_method] of methods.entries()) {
    for (const [ri, routing_strategy] of routing.entries()) {
      for (const [ii, payer_identity] of identities.entries()) {
        test(`method #${mi}, routing #${ri}, identity #${ii}`, async () => {
          const { client, calls } = setup(ok(confirmData()));
          await client.payments.confirm("pay_1", { payment_method, routing_strategy, payer_identity }, { idempotencyKey: "key-1" });
          const call = calls[0]!;
          expect(PaymentConfirmBodySchema.safeParse(call.body).success).toBe(true);
          expect(ConfirmHeadersSchema.safeParse({ "idempotency-key": call.headers["Idempotency-Key"] }).success).toBe(true);
        });
      }
    }
  }

  test("the idempotency key respects the backend limit of 255 characters", async () => {
    const { client, calls } = setup(ok(confirmData()));
    await client.payments.confirm("pay_1", { payment_method: { id: "pm_1" } }, { idempotencyKey: "k".repeat(255) });
    expect(ConfirmHeadersSchema.safeParse({ "idempotency-key": calls[0]!.headers["Idempotency-Key"] }).success).toBe(true);
  });
});

describe("payments.refund request contract", () => {
  const cases = [
    {},
    { reason: "DEFAULT" },
    { reason: "CUSTOMER_REQUEST" },
    { reason: "RESTOCK" },
    { reason: "FRAUD" },
    { reason: "OTHER", reason_other: "damaged in transit" },
    { reason: "DEFAULT", metadata: { ticket: "T-1" } },
  ] as const;

  test.each(cases)("accepted by the backend: %j", async (params) => {
    const { client, calls } = setup(ok(payment({ status: "REFUNDED" })));
    await client.payments.refund("pay_1", params);
    expect(PaymentRefundBodySchema.safeParse(calls[0]!.body).success).toBe(true);
  });
});

describe("query contracts", () => {
  test("payments.list", async () => {
    const { client, calls } = setup(page([payment()]));
    await client.payments.list({
      account_id: "acc_1",
      customer_id: "cus_1",
      product_id: "prod_1",
      page: 2,
      limit: 25,
      include_charges: true,
      include_routing_plans: false,
      include_events: true,
      include_customer: false,
    });
    const parsed = PaymentListQuerySchema.safeParse(queryOf(calls[0]!.url));
    expect(parsed.success).toBe(true);
  });

  test("payments.retrieve", async () => {
    const { client, calls } = setup();
    await client.payments.retrieve("pay_1", { account_id: "acc_1", include_charges: true });
    expect(PaymentGetQuerySchema.safeParse(queryOf(calls[0]!.url)).success).toBe(true);
  });

  test("payments.timeline", async () => {
    const { client, calls } = setup(ok({ entries: [], has_more: false }));
    await client.payments.timeline("pay_1", { limit: 100, starting_after: "evt_1" });
    expect(PaymentTimelineQuerySchema.safeParse(queryOf(calls[0]!.url)).success).toBe(true);
  });

  test("refunds.list", async () => {
    const { client, calls } = setup(page([refund()]));
    await client.refunds.list({ account_id: "acc_1", payment_id: "pay_1", charge_id: "ch_1", page: 1, limit: 50 });
    expect(RefundListQuerySchema.safeParse(queryOf(calls[0]!.url)).success).toBe(true);
  });
});

describe("routes and methods", () => {
  const routes: Array<[string, (c: HsrcpayClient) => Promise<unknown>, string, string]> = [
    ["payments.create", (c) => c.payments.create({ amount: 100 }), "POST", "/v1/payments"],
    ["payments.retrieve", (c) => c.payments.retrieve("pay_1"), "GET", "/v1/payments/pay_1"],
    ["payments.list", (c) => c.payments.list(), "GET", "/v1/payments"],
    ["payments.confirm", (c) => c.payments.confirm("pay_1", { payment_method: { id: "pm_1" } }), "POST", "/v1/payments/pay_1/confirm"],
    ["payments.capture", (c) => c.payments.capture("pay_1"), "POST", "/v1/payments/pay_1/capture"],
    ["payments.cancel", (c) => c.payments.cancel("pay_1"), "POST", "/v1/payments/pay_1/cancel"],
    ["payments.refund", (c) => c.payments.refund("pay_1"), "POST", "/v1/payments/pay_1/refund"],
    ["payments.timeline", (c) => c.payments.timeline("pay_1"), "GET", "/v1/payments/pay_1/timeline"],
    ["charges.retrieve", (c) => c.charges.retrieve("ch_1"), "GET", "/v1/charges/ch_1"],
    ["charges.list", (c) => c.charges.list(), "GET", "/v1/charges"],
    ["refunds.retrieve", (c) => c.refunds.retrieve("ref_1"), "GET", "/v1/refunds/ref_1"],
    ["refunds.list", (c) => c.refunds.list(), "GET", "/v1/refunds"],
  ];

  test.each(routes)("%s", async (_name, call, method, path) => {
    const { client, calls } = setup(ok({ entries: [], has_more: false }));
    await call(client);
    expect(calls[0]?.method).toBe(method);
    expect(new URL(calls[0]!.url).pathname).toBe(path);
  });
});
