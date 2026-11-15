/**
 * Where `account_id` travels, per endpoint, mirroring the backend handlers:
 * - "query": `query.account_id || actor account`
 * - "body": `body.account_id || actor account` (products.create only)
 * - "none": the resource id identifies the account, the parameter does not exist
 */
import { describe, expect, test } from "bun:test";
import { HsrcpayClient } from "../src";
import { card } from "./fixtures";
import { mockFetch, ok, queryOf } from "./helpers";

type Call = (c: HsrcpayClient, accountId: string) => Promise<unknown>;

const cases: Array<[string, "query" | "body" | "none", Call]> = [
  ["payments.create", "query", (c, a) => c.payments.create({ amount: 100, account_id: a })],
  ["payments.list", "query", (c, a) => c.payments.list({ account_id: a })],
  ["payments.retrieve", "query", (c, a) => c.payments.retrieve("pay_1", { account_id: a })],
  ["payments.confirm", "none", (c) => c.payments.confirm("pay_1", { payment_method: { type: "card", data: card } })],
  ["payments.capture", "none", (c) => c.payments.capture("pay_1")],
  ["payments.cancel", "none", (c) => c.payments.cancel("pay_1")],
  ["payments.refund", "none", (c) => c.payments.refund("pay_1")],
  ["payments.timeline", "none", (c) => c.payments.timeline("pay_1")],
  ["charges.list", "query", (c, a) => c.charges.list({ account_id: a })],
  ["charges.retrieve", "none", (c) => c.charges.retrieve("ch_1")],
  ["refunds.list", "query", (c, a) => c.refunds.list({ account_id: a })],
  ["refunds.retrieve", "none", (c) => c.refunds.retrieve("ref_1")],
  ["customers.create", "query", (c, a) => c.customers.create({ name: "A", account_id: a })],
  ["customers.list", "query", (c, a) => c.customers.list({ account_id: a })],
  ["customers.retrieve", "none", (c) => c.customers.retrieve("cus_1")],
  ["customers.update", "none", (c) => c.customers.update("cus_1", { name: "B" })],
  ["customers.delete", "none", (c) => c.customers.delete("cus_1")],
  ["customers.addresses.create", "none", (c) => c.customers.addresses.create("cus_1", { type: "BILLING", is_default: true, country: "TR" })],
  ["products.create", "body", (c, a) => c.products.create({ name: "P", account_id: a })],
  ["products.list", "query", (c, a) => c.products.list({ account_id: a })],
  ["products.retrieve", "none", (c) => c.products.retrieve("prod_1")],
  ["products.usage", "none", (c) => c.products.usage("prod_1")],
  ["products.update", "none", (c) => c.products.update("prod_1", { name: "N" })],
  ["products.updateStatus", "none", (c) => c.products.updateStatus("prod_1", "inactive")],
  ["products.delete", "none", (c) => c.products.delete("prod_1")],
  ["products.prices.list", "none", (c) => c.products.prices.list("prod_1")],
  ["products.prices.create", "none", (c) => c.products.prices.create("prod_1", { type: "one_time", amount: 1, currency: "USD" })],
  ["products.prices.retrieve", "none", (c) => c.products.prices.retrieve("prod_1", "price_1")],
  ["products.prices.update", "none", (c) => c.products.prices.update("prod_1", "price_1", { name: "N" })],
  ["products.prices.updateStatus", "none", (c) => c.products.prices.updateStatus("prod_1", "price_1", "inactive")],
  ["prices.list", "query", (c, a) => c.prices.list({ account_id: a })],
  ["prices.retrieve", "none", (c) => c.prices.retrieve("price_1")],
  ["checkoutSessions.create", "query", (c, a) => c.checkoutSessions.create({ currency: "TRY", line_items: [{ price_id: "p" }], account_id: a })],
  ["checkoutSessions.list", "query", (c, a) => c.checkoutSessions.list({ account_id: a })],
  ["checkoutSessions.search", "query", (c, a) => c.checkoutSessions.search({ q: "x", account_id: a })],
  ["checkoutSessions.retrieve", "none", (c) => c.checkoutSessions.retrieve("cs_1")],
  ["checkoutSessions.update", "none", (c) => c.checkoutSessions.update("cs_1", { metadata: {} })],
  ["checkoutSessions.expire", "none", (c) => c.checkoutSessions.expire("cs_1")],
];

describe("account_id placement", () => {
  test.each(cases)("%s -> %s", async (_name, where, call) => {
    const mock = mockFetch(ok({ entries: [], has_more: false }));
    const client = new HsrcpayClient({ apiKey: "sk_test_k", baseUrl: "http://api.test", fetch: mock.fetch });
    await call(client, "acc_7");
    const sent = mock.calls[0]!;
    const inQuery = queryOf(sent.url).account_id;
    const inBody = (sent.body as { account_id?: string } | undefined)?.account_id;
    expect(inQuery).toBe(where === "query" ? "acc_7" : undefined);
    expect(inBody).toBe(where === "body" ? "acc_7" : undefined);
  });

  test("with an API key account_id can always be omitted", async () => {
    const calls: Array<() => Promise<unknown>> = [];
    const mock = mockFetch(ok({}));
    const c = new HsrcpayClient({ apiKey: "sk_test_k", baseUrl: "http://api.test", fetch: mock.fetch });
    calls.push(
      () => c.payments.create({ amount: 100 }),
      () => c.payments.list(),
      () => c.charges.list(),
      () => c.refunds.list(),
      () => c.customers.create({ name: "A" }),
      () => c.customers.list(),
      () => c.products.create({ name: "P" }),
      () => c.products.list(),
      () => c.prices.list(),
      () => c.checkoutSessions.create({ currency: "TRY", line_items: [{ price_id: "p" }] }),
      () => c.checkoutSessions.list(),
    );
    for (const call of calls) await call();
    for (const sent of mock.calls) {
      expect(queryOf(sent.url).account_id).toBeUndefined();
      expect((sent.body as { account_id?: string } | undefined)?.account_id).toBeUndefined();
    }
  });

  test("checkoutSessions.search is the one list-like call that requires account_id", () => {
    const c = new HsrcpayClient({ apiKey: "sk_test_k", fetch: mockFetch(ok([])).fetch });
    expect(() => c.checkoutSessions.search({ q: "x" } as never)).toThrow("account_id");
  });
});
