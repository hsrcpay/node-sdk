import { describe, expect, test } from "bun:test";
import { HsrcpayClient, HsrcpayPublicClient, HsrcpayValidationError } from "../src";
import { confirmData, payment } from "./fixtures";
import { checkoutSession } from "./fixtures.more";
import { mockFetch, ok, page, queryOf } from "./helpers";

const secret = (...replies: Parameters<typeof mockFetch>) => {
  const mock = mockFetch(...replies);
  return { client: new HsrcpayClient({ apiKey: "sk_test_k", baseUrl: "http://api.test", fetch: mock.fetch }), calls: mock.calls };
};
const publicClient = (...replies: Parameters<typeof mockFetch>) => {
  const mock = mockFetch(...replies);
  return { client: new HsrcpayPublicClient({ publishableKey: "pk_test_k", baseUrl: "http://api.test", fetch: mock.fetch }), calls: mock.calls };
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

describe("checkoutSessions (secret key)", () => {
  test("create with a fixed amount", async () => {
    const { client, calls } = secret(ok(checkoutSession(), 201));
    const session = await client.checkoutSessions.create({ amount: 2500, currency: "TRY", url: "https://pay.example.com/c" });
    expect(session.token).toBe("tok_abc");
    expect(new URL(calls[0]!.url).search).toBe("");
    expect(calls[0]?.body).toEqual({ amount: 2500, currency: "TRY", url: "https://pay.example.com/c" });
  });

  test("create with line items moves account_id to the query and Dates to ISO strings", async () => {
    const { client, calls } = secret(ok(checkoutSession()));
    const expires = new Date("2030-01-01T00:00:00.000Z");
    await client.checkoutSessions.create({
      account_id: "acc_1",
      currency: "USD",
      line_items: [{ price_id: "price_1", quantity: 2 }, { price_id: "price_2" }],
      success_url: "https://example.com/ok",
      cancel_url: "https://example.com/cancel",
      expires_at: expires,
      metadata: { order: "1" },
    });
    expect(queryOf(calls[0]!.url)).toEqual({ account_id: "acc_1" });
    expect((calls[0]?.body as { expires_at: string }).expires_at).toBe("2030-01-01T00:00:00.000Z");
  });

  test.each([
    [{ currency: "TRY" }, "line_items"],
    [{ currency: "TRY", amount: 100 }, "line_items"],
    [{ currency: "TRY", url: "https://x.test" }, "line_items"],
    [{ currency: "TRY", amount: 0, url: "https://x.test" }, "amount"],
    [{ currency: "TRY", amount: 100, url: "not a url" }, "url"],
    [{ amount: 100, url: "https://x.test" }, "currency"],
    [{ currency: "TRY", line_items: [] }, "line_items"],
    [{ currency: "TRY", line_items: [{ price_id: "p", quantity: 0 }] }, "line_items"],
    [{ currency: "TRY", line_items: [{ price_id: "" }] }, "line_items"],
    [{ currency: "TRY", line_items: [{ price_id: "p" }], success_url: "nope" }, "success_url"],
    [{ currency: "TRY", line_items: [{ price_id: "p" }], expires_at: "tomorrow" }, "expires_at"],
  ])("create rejects %j", (params, fragment) => {
    const { client, calls } = secret(ok(checkoutSession()));
    invalid(() => client.checkoutSessions.create(params as never), fragment);
    expect(calls).toHaveLength(0);
  });

  test("retrieve, list, update, expire", async () => {
    const { client, calls } = secret(ok(checkoutSession()), page([checkoutSession()]), ok(checkoutSession()), ok(checkoutSession({ status: "EXPIRED" })));
    await client.checkoutSessions.retrieve("cs_1");
    await client.checkoutSessions.list({ account_id: "acc_1", page: 2, limit: 3 });
    await client.checkoutSessions.update("cs_1", { status: "CANCELLED", metadata: { a: 1 } });
    const expired = await client.checkoutSessions.expire("cs_1");
    expect(expired.status).toBe("EXPIRED");
    expect(calls.map((c) => c.method)).toEqual(["GET", "GET", "PUT", "POST"]);
    expect(new URL(calls[3]!.url).pathname).toBe("/v1/checkout-sessions/cs_1/expire");
    expect(queryOf(calls[1]!.url)).toEqual({ account_id: "acc_1", page: "2", limit: "3" });
  });

  test("search needs both q and account_id and returns a plain array", async () => {
    const { client, calls } = secret(ok([checkoutSession()]));
    const result = await client.checkoutSessions.search({ q: "ada", account_id: "acc_1" });
    expect(result).toHaveLength(1);
    expect(queryOf(calls[0]!.url)).toEqual({ q: "ada", account_id: "acc_1" });
    invalid(() => client.checkoutSessions.search({ q: "ada" } as never), "account_id");
    invalid(() => client.checkoutSessions.search({ account_id: "acc_1" } as never), "q");
  });

  test("update rejects an unknown status", () => {
    const { client } = secret(ok(checkoutSession()));
    invalid(() => client.checkoutSessions.update("cs_1", { status: "DONE" as never }), "status");
  });
});

describe("hosted checkout flow (publishable key)", () => {
  test("retrieveByToken", async () => {
    const { client, calls } = publicClient(ok(checkoutSession()));
    const session = await client.checkoutSessions.retrieveByToken("tok_abc");
    expect(session.id).toBe("cs_1");
    expect(calls[0]?.url).toBe("http://api.test/v1/checkout-sessions/token/tok_abc");
    expect(calls[0]?.headers.Authorization).toBe("Bearer pk_test_k");
  });

  test("updateAmount patches the customer-entered amount", async () => {
    const { client, calls } = publicClient(ok(checkoutSession({ customer_entered_amount: 4000 })));
    await client.checkoutSessions.updateAmount("tok_abc", { amount: 4000 });
    expect(calls[0]?.method).toBe("PATCH");
    expect(new URL(calls[0]!.url).pathname).toBe("/v1/checkout-sessions/token/tok_abc/amount");
    expect(calls[0]?.body).toEqual({ amount: 4000 });
  });

  test.each([[0], [-5], [10.5]])("updateAmount rejects %p", (amount) => {
    const { client } = publicClient(ok(checkoutSession()));
    invalid(() => client.checkoutSessions.updateAmount("tok", { amount }), "amount");
  });

  test("prepare creates the payment to confirm", async () => {
    const { client, calls } = publicClient(ok({ checkout_session: checkoutSession({ status: "PROCESSING" }), payment: payment() }));
    const prepared = await client.checkoutSessions.prepare("tok_abc", { payer: { name: "Ada", email: "ada@example.com", locale: "tr" } });
    expect(prepared.payment.id).toBe("pay_1");
    expect(prepared.checkout_session.status).toBe("PROCESSING");
    expect(new URL(calls[0]!.url).pathname).toBe("/v1/checkout-sessions/token/tok_abc/prepare");
    expect(calls[0]?.body).toEqual({ payer: { name: "Ada", email: "ada@example.com", locale: "tr" } });
  });

  test("prepare works without a payer", async () => {
    const { client, calls } = publicClient(ok({ checkout_session: checkoutSession(), payment: payment() }));
    await client.checkoutSessions.prepare("tok_abc");
    expect(calls[0]?.body).toEqual({});
  });

  test("prepare rejects a bad payer email", () => {
    const { client } = publicClient(ok({}));
    invalid(() => client.checkoutSessions.prepare("tok", { payer: { email: "nope" } }), "email");
  });

  test("the token is validated and encoded", async () => {
    const { client, calls } = publicClient(ok(checkoutSession()));
    invalid(() => client.checkoutSessions.retrieveByToken(""), "token");
    await client.checkoutSessions.retrieveByToken("a/b");
    expect(new URL(calls[0]!.url).pathname).toBe("/v1/checkout-sessions/token/a%2Fb");
  });

  test("confirm, retrieve and timeline on a payment", async () => {
    const { client, calls } = publicClient(ok(confirmData()), ok(payment()), ok({ entries: [], has_more: false }));
    const confirmed = await client.payments.confirm(
      "pay_1",
      { payment_method: { type: "card", data: { name: "Ada", pan: "4111111111111111", month: "12", year: "2030", cvv: "123" } } },
      { idempotencyKey: "co-1" },
    );
    expect(confirmed.confirmResult.ok).toBe(true);
    await client.payments.retrieve("pay_1");
    await client.payments.timeline("pay_1", { limit: 10 });
    expect(calls[0]?.headers["Idempotency-Key"]).toBe("co-1");
    expect(new URL(calls[1]!.url).pathname).toBe("/v1/payments/pay_1");
    expect(calls.every((c) => c.headers.Authorization === "Bearer pk_test_k")).toBe(true);
  });

  test("the public payments resource cannot create, capture, cancel or refund", () => {
    const { client } = publicClient(ok({}));
    const resource = client.payments as unknown as Record<string, unknown>;
    for (const method of ["create", "capture", "cancel", "refund", "list"]) expect(resource[method]).toBeUndefined();
  });
});
