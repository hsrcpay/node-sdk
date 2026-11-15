import type { FetchLike } from "../src/http";

export type RecordedCall = { url: string; method: string; headers: Record<string, string>; body: unknown };

export type Reply = Response | Error;

export const ok = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify({ message: "success", success: true, data }), {
    status,
    headers: { "content-type": "application/json" },
  });

export const page = (data: unknown[], extra: Record<string, number> = {}): Response =>
  new Response(
    JSON.stringify({ message: "success", success: true, data, total: data.length, page: 1, limit: 10, pages: 1, ...extra }),
    { status: 200, headers: { "content-type": "application/json" } },
  );

export const fail = (status: number, message: string, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify({ message, success: false, error: { code: status, message, details: { field: "x" } } }), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

/** Replies are consumed in order; the last one repeats. Errors are thrown like a network failure. */
export function mockFetch(...replies: Reply[]): { fetch: FetchLike; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  let index = 0;
  const fetch = (async (url: string, init: RequestInit) => {
    const raw = init.body;
    calls.push({
      url,
      method: init.method ?? "GET",
      headers: (init.headers ?? {}) as Record<string, string>,
      body: typeof raw === "string" ? JSON.parse(raw) : undefined,
    });
    const reply = replies[Math.min(index++, replies.length - 1)];
    if (reply === undefined) throw new Error("mockFetch: no reply configured");
    if (reply instanceof Error) throw reply;
    return reply.clone();
  }) as FetchLike;
  return { fetch, calls };
}

export const samplePayment = (overrides: Record<string, unknown> = {}) => ({
  object: "payment",
  id: "pay_1",
  account_id: "acc_1",
  customer_id: null,
  product_id: null,
  price_id: null,
  amount: 2500,
  currency: "TRY",
  status: "CREATED",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  checkout_session_id: null,
  installments: null,
  ...overrides,
});
