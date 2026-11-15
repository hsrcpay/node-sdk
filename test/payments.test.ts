import { describe, expect, test } from "bun:test";
import { HsrcpayClient } from "../src";
import { mockFetch, ok, page, queryOf, samplePayment } from "./helpers";

const setup = (...replies: Parameters<typeof mockFetch>) => {
  const mock = mockFetch(...replies);
  const client = new HsrcpayClient({ apiKey: "k", baseUrl: "http://api.test", fetch: mock.fetch, retryDelayMs: 1 });
  return { client, calls: mock.calls };
};

describe("payments.create", () => {
  test("posts the body and moves account_id to the query", async () => {
    const { client, calls } = setup(ok(samplePayment(), 201));
    const payment = await client.payments.create({ amount: 2500, currency: "TRY", account_id: "acc_1", metadata: { order: "1" } });
    expect(payment.id).toBe("pay_1");
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.url).toBe("http://api.test/v1/payments?account_id=acc_1");
    expect(calls[0]?.body).toEqual({ amount: 2500, currency: "TRY", metadata: { order: "1" } });
  });

  test("works without parameters", async () => {
    const { client, calls } = setup(ok(samplePayment()));
    await client.payments.create();
    expect(calls[0]?.url).toBe("http://api.test/v1/payments");
    expect(calls[0]?.body).toEqual({});
  });
});

describe("payments.retrieve and list", () => {
  test("retrieve sends include flags and encodes the id", async () => {
    const { client, calls } = setup(ok(samplePayment()));
    await client.payments.retrieve("pay/1", { include_charges: true });
    expect(calls[0]?.url).toBe("http://api.test/v1/payments/pay%2F1?include_charges=true");
  });

  test("rejects an empty id before any request", () => {
    const { client, calls } = setup(ok(samplePayment()));
    expect(() => client.payments.retrieve("")).toThrow("paymentId");
    expect(calls).toHaveLength(0);
  });

  test("list returns the pagination envelope and skips undefined filters", async () => {
    const { client, calls } = setup(page([samplePayment()], { total: 41, pages: 5 }));
    const result = await client.payments.list({ customer_id: "cus_1", limit: 10, product_id: undefined });
    expect(result).toMatchObject({ total: 41, page: 1, limit: 10, pages: 5 });
    expect(result.data.map((p) => p.id)).toEqual(["pay_1"]);
    expect(new URL(calls[0]!.url).pathname).toBe("/v1/payments");
    expect(queryOf(calls[0]!.url)).toEqual({ customer_id: "cus_1", limit: "10" });
  });
});

describe("payments.confirm", () => {
  const confirmed = { payment: samplePayment({ status: "SUCCEEDED" }), confirmResult: { ok: true, results: [] } };

  test("posts the method and forwards the idempotency key", async () => {
    const { client, calls } = setup(ok(confirmed));
    const card = { name: "A B", pan: "4111111111111111", month: "12", year: "2030", cvv: "123" };
    const result = await client.payments.confirm(
      "pay_1",
      { payment_method: { type: "card", data: card }, routing_strategy: { provider_identifier: "iyzico" } },
      { idempotencyKey: "order-1" },
    );
    expect(result.payment.status).toBe("SUCCEEDED");
    expect(result.confirmResult.ok).toBe(true);
    expect(calls[0]?.url).toBe("http://api.test/v1/payments/pay_1/confirm");
    expect(calls[0]?.headers["Idempotency-Key"]).toBe("order-1");
    expect(calls[0]?.body).toEqual({
      payment_method: { type: "card", data: card },
      routing_strategy: { provider_identifier: "iyzico" },
    });
  });

  test("accepts a saved payment method id", async () => {
    const { client, calls } = setup(ok(confirmed));
    await client.payments.confirm("pay_1", { payment_method: { id: "pm_1" } });
    expect(calls[0]?.body).toEqual({ payment_method: { id: "pm_1" } });
    expect(calls[0]?.headers["Idempotency-Key"]).toBeUndefined();
  });
});

describe("payments capture, cancel, refund, timeline", () => {
  test("capture posts without a body", async () => {
    const { client, calls } = setup(ok(samplePayment({ status: "SUCCEEDED" })));
    await client.payments.capture("pay_1");
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.url).toBe("http://api.test/v1/payments/pay_1/capture");
    expect(calls[0]?.body).toBeUndefined();
  });

  test("cancel posts to the cancel route", async () => {
    const { client, calls } = setup(ok(samplePayment({ status: "CANCELED" })));
    const payment = await client.payments.cancel("pay_1");
    expect(payment.status).toBe("CANCELED");
    expect(calls[0]?.url).toBe("http://api.test/v1/payments/pay_1/cancel");
  });

  test("refund sends the reason, defaulting to an empty body", async () => {
    const { client, calls } = setup(ok(samplePayment({ status: "REFUNDED" })));
    await client.payments.refund("pay_1", { reason: "CUSTOMER_REQUEST", reason_other: "late" });
    await client.payments.refund("pay_1");
    expect(calls[0]?.body).toEqual({ reason: "CUSTOMER_REQUEST", reason_other: "late" });
    expect(calls[1]?.body).toEqual({});
  });

  test("timeline passes the cursor", async () => {
    const { client, calls } = setup(ok({ entries: [], has_more: false }));
    const timeline = await client.payments.timeline("pay_1", { limit: 20, starting_after: "evt_1" });
    expect(timeline).toEqual({ entries: [], has_more: false });
    expect(calls[0]?.url).toBe("http://api.test/v1/payments/pay_1/timeline?limit=20&starting_after=evt_1");
  });
});
