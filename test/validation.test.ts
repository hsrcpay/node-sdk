/** Client-side validation: bad input must fail before any request is sent. */
import { describe, expect, test } from "bun:test";
import { HsrcpayClient, HsrcpayValidationError } from "../src";
import { card } from "./fixtures";
import { mockFetch, ok } from "./helpers";

const setup = () => {
  const mock = mockFetch(ok({}));
  return { client: new HsrcpayClient({ apiKey: "k", baseUrl: "http://api.test", fetch: mock.fetch }), calls: mock.calls };
};

const expectInvalid = (run: (c: HsrcpayClient) => unknown, fragment?: string) => {
  const { client, calls } = setup();
  let thrown: unknown;
  try {
    const result = run(client);
    if (result instanceof Promise) result.catch(() => undefined);
  } catch (e) {
    thrown = e;
  }
  expect(thrown).toBeInstanceOf(HsrcpayValidationError);
  if (fragment) expect((thrown as Error).message).toContain(fragment);
  expect(calls).toHaveLength(0);
};

describe("payments.create params", () => {
  test.each([
    [{ amount: 9 }, "amount"],
    [{ amount: 0 }, "amount"],
    [{ amount: -100 }, "amount"],
    [{ amount: 10.5 }, "amount"],
    [{ amount: "100" }, "amount"],
    [{ amount: Number.NaN }, "amount"],
    [{ currency: "JPY" }, "currency"],
    [{ currency: "try" }, "currency"],
    [{ installments: 0 }, "installments"],
    [{ installments: 65 }, "installments"],
    [{ installments: 1.5 }, "installments"],
    [{ auto_capture: false, installments: 3 }, "auto_capture"],
    [{ secure_mode: "yes" }, "secure_mode"],
    [{ customer_id: "" }, "customer_id"],
    [{ price_id: 7 }, "price_id"],
    [{ metadata: "x" }, "metadata"],
    [{ amount: 100, surprise: true }, "surprise"],
  ])("rejects %j", (params, fragment) => {
    expectInvalid((c) => c.payments.create(params as never), fragment);
  });

  test("rejects metadata with more than 100 keys", () => {
    const metadata = Object.fromEntries(Array.from({ length: 101 }, (_, i) => [`k${i}`, i]));
    expectInvalid((c) => c.payments.create({ amount: 100, metadata }), "100");
  });

  test("accepts exactly 100 metadata keys", async () => {
    const { client, calls } = setup();
    const metadata = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`k${i}`, i]));
    await client.payments.create({ amount: 100, metadata });
    expect(calls).toHaveLength(1);
  });

  test("accepts installments with auto_capture true or unset", async () => {
    const { client, calls } = setup();
    await client.payments.create({ amount: 100, installments: 3, auto_capture: true });
    await client.payments.create({ amount: 100, installments: 3 });
    expect(calls).toHaveLength(2);
  });

  test("the issues list names the failing path", () => {
    const { client } = setup();
    try {
      client.payments.create({ amount: 1 });
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as HsrcpayValidationError).issues[0]?.path).toEqual(["amount"]);
    }
  });
});

describe("payments.confirm params", () => {
  const valid = { payment_method: { type: "card" as const, data: card } };

  test.each([
    [{ ...valid, payment_method: { type: "card", data: { ...card, pan: "4111 1111 1111 1111" } } }, "pan"],
    [{ ...valid, payment_method: { type: "card", data: { ...card, pan: "123" } } }, "pan"],
    [{ ...valid, payment_method: { type: "card", data: { ...card, pan: "4".repeat(20) } } }, "pan"],
    [{ ...valid, payment_method: { type: "card", data: { ...card, month: "13" } } }, "month"],
    [{ ...valid, payment_method: { type: "card", data: { ...card, month: "0" } } }, "month"],
    [{ ...valid, payment_method: { type: "card", data: { ...card, year: "203" } } }, "year"],
    [{ ...valid, payment_method: { type: "card", data: { ...card, cvv: "12" } } }, "cvv"],
    [{ ...valid, payment_method: { type: "card", data: { ...card, cvv: "12a" } } }, "cvv"],
    [{ ...valid, payment_method: { type: "card", data: { ...card, name: "" } } }, "name"],
    [{ ...valid, payment_method: { type: "paypal", data: card } }, "payment_method"],
    [{ ...valid, payment_method: { id: "" } }, "payment_method"],
    [{ ...valid, payment_method: { id: "pm_1", type: "card" } }, "payment_method"],
    [{ ...valid, routing_strategy: { provider_identifier: ["only-one"] } }, "routing_strategy"],
    [{ ...valid, routing_strategy: { provider_identifier: "a", payment_provider_config_id: "b" } }, "routing_strategy"],
    [{ ...valid, routing_strategy: {} }, "routing_strategy"],
    [{ ...valid, payer_identity: { ip_address: 5 } }, "payer_identity"],
    [{ payment_method: undefined }, "payment_method"],
    [{}, "payment_method"],
    [{ ...valid, unknown: 1 }, "unknown"],
  ])("rejects %j", (params, fragment) => {
    expectInvalid((c) => c.payments.confirm("pay_1", params as never), fragment);
  });

  test.each(["4111111111111111", "5555555555554444", "378282246310005", "4".repeat(12), "4".repeat(19)])("accepts pan %s", async (pan) => {
    const { client, calls } = setup();
    await client.payments.confirm("pay_1", { payment_method: { type: "card", data: { ...card, pan } } });
    expect(calls).toHaveLength(1);
  });

  test.each(["1", "01", "9", "12"])("accepts month %s", async (month) => {
    const { client, calls } = setup();
    await client.payments.confirm("pay_1", { payment_method: { type: "card", data: { ...card, month } } });
    expect(calls).toHaveLength(1);
  });

  test.each(["30", "2030"])("accepts year %s", async (year) => {
    const { client, calls } = setup();
    await client.payments.confirm("pay_1", { payment_method: { type: "card", data: { ...card, year } } });
    expect(calls).toHaveLength(1);
  });

  test.each(["123", "1234"])("accepts cvv %s", async (cvv) => {
    const { client, calls } = setup();
    await client.payments.confirm("pay_1", { payment_method: { type: "card", data: { ...card, cvv } } });
    expect(calls).toHaveLength(1);
  });
});

describe("other params", () => {
  test.each([
    [(c: HsrcpayClient) => c.payments.refund("pay_1", { reason: "BECAUSE" as never }), "reason"],
    [(c: HsrcpayClient) => c.payments.refund("pay_1", { reason_other: 5 as never }), "reason_other"],
    [(c: HsrcpayClient) => c.payments.timeline("pay_1", { limit: 0 }), "limit"],
    [(c: HsrcpayClient) => c.payments.timeline("pay_1", { limit: 101 }), "limit"],
    [(c: HsrcpayClient) => c.payments.timeline("pay_1", { starting_after: "" }), "starting_after"],
    [(c: HsrcpayClient) => c.payments.list({ page: 0 }), "page"],
    [(c: HsrcpayClient) => c.payments.list({ limit: -1 }), "limit"],
    [(c: HsrcpayClient) => c.payments.list({ page: 1.5 }), "page"],
    [(c: HsrcpayClient) => c.payments.list({ include_charges: "yes" as never }), "include_charges"],
    [(c: HsrcpayClient) => c.payments.list({ unknown: 1 } as never), "unknown"],
    [(c: HsrcpayClient) => c.charges.list({ page: 0 }), "page"],
    [(c: HsrcpayClient) => c.charges.retrieve("ch_1", { include_attempt_details: "yes" as never }), "include_attempt_details"],
    [(c: HsrcpayClient) => c.refunds.list({ payment_id: "" }), "payment_id"],
    [(c: HsrcpayClient) => c.refunds.list({ limit: 0 }), "limit"],
  ])("rejects bad params (%#)", (run, fragment) => {
    expectInvalid(run, fragment);
  });
});

describe("resource ids", () => {
  test.each([
    ["payments.retrieve", (c: HsrcpayClient, id: string) => c.payments.retrieve(id)],
    ["payments.confirm", (c: HsrcpayClient, id: string) => c.payments.confirm(id, { payment_method: { id: "pm" } })],
    ["payments.capture", (c: HsrcpayClient, id: string) => c.payments.capture(id)],
    ["payments.cancel", (c: HsrcpayClient, id: string) => c.payments.cancel(id)],
    ["payments.refund", (c: HsrcpayClient, id: string) => c.payments.refund(id)],
    ["payments.timeline", (c: HsrcpayClient, id: string) => c.payments.timeline(id)],
    ["charges.retrieve", (c: HsrcpayClient, id: string) => c.charges.retrieve(id)],
    ["refunds.retrieve", (c: HsrcpayClient, id: string) => c.refunds.retrieve(id)],
  ])("%s rejects an empty or blank id", (_name, run) => {
    for (const bad of ["", "   "]) expectInvalid((c) => run(c, bad));
    expectInvalid((c) => run(c, undefined as never));
    expectInvalid((c) => run(c, 42 as never));
  });

  test.each([
    ["pay/1", "pay%2F1"],
    ["../admin", "..%2Fadmin"],
    ["a?b=1", "a%3Fb%3D1"],
    ["a#frag", "a%23frag"],
    ["a b", "a%20b"],
    ["çay", "%C3%A7ay"],
    [" pay_1 ", "pay_1"],
  ])("encodes %j as a single path segment", async (id, encoded) => {
    const { client, calls } = setup();
    await client.payments.retrieve(id);
    expect(new URL(calls[0]!.url).pathname).toBe(`/v1/payments/${encoded}`);
  });
});
