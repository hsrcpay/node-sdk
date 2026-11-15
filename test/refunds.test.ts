import { describe, expect, test } from "bun:test";
import { HsrcpayClient } from "../src";
import { mockFetch, ok, page, queryOf } from "./helpers";

const refund = {
  object: "refund",
  id: "ref_1",
  charge_id: "ch_1",
  status: "SUCCEEDED",
  reason: "DEFAULT",
  reason_other: null,
  metadata: null,
  amount: 2500,
  currency: "TRY",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const setup = (...replies: Parameters<typeof mockFetch>) => {
  const mock = mockFetch(...replies);
  return { client: new HsrcpayClient({ apiKey: "k", baseUrl: "http://api.test", fetch: mock.fetch }), calls: mock.calls };
};

describe("refunds", () => {
  test("retrieve", async () => {
    const { client, calls } = setup(ok(refund));
    expect((await client.refunds.retrieve("ref_1")).amount).toBe(2500);
    expect(calls[0]?.url).toBe("http://api.test/v1/refunds/ref_1");
  });

  test("list filters by payment", async () => {
    const { client, calls } = setup(page([refund]));
    const result = await client.refunds.list({ payment_id: "pay_1", page: 2 });
    expect(result.data).toHaveLength(1);
    expect(queryOf(calls[0]!.url)).toEqual({ payment_id: "pay_1", page: "2" });
  });

  test("retrieve rejects an empty id", () => {
    const { client } = setup(ok(refund));
    expect(() => client.refunds.retrieve(" ")).toThrow("refundId");
  });
});
