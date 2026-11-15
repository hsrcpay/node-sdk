import { describe, expect, test } from "bun:test";
import {
  HsrcpayAbortError,
  HsrcpayApiError,
  HsrcpayConnectionError,
  HsrcpayTimeoutError,
  HsrcpayClient,
} from "../src";
import { fail, mockFetch, ok, samplePayment } from "./helpers";

const client = (fetch: ReturnType<typeof mockFetch>["fetch"], extra: { maxRetries?: number; timeoutMs?: number } = {}) =>
  new HsrcpayClient({ apiKey: "k", fetch, retryDelayMs: 1, ...extra });

describe("error mapping", () => {
  test("maps an API error envelope", async () => {
    const { fetch } = mockFetch(fail(404, "Payment not found"));
    const error = await client(fetch).payments.retrieve("pay_x").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HsrcpayApiError);
    const api = error as HsrcpayApiError;
    expect(api.status).toBe(404);
    expect(api.code).toBe(404);
    expect(api.message).toBe("Payment not found");
    expect(api.details).toEqual({ field: "x" });
  });

  test("handles a non-JSON error body", async () => {
    const { fetch } = mockFetch(new Response("Bad gateway", { status: 400 }));
    const error = (await client(fetch).payments.retrieve("p").catch((e: unknown) => e)) as HsrcpayApiError;
    expect(error).toBeInstanceOf(HsrcpayApiError);
    expect(error.message).toBe("Bad gateway");
  });

  test("a 2xx with a malformed body is a connection error", async () => {
    const { fetch } = mockFetch(new Response("<html>", { status: 200 }));
    await expect(client(fetch).payments.retrieve("p")).rejects.toBeInstanceOf(HsrcpayConnectionError);
  });
});

describe("retries", () => {
  test("retries a GET on 503 and succeeds", async () => {
    const { fetch, calls } = mockFetch(fail(503, "down"), ok(samplePayment()));
    const payment = await client(fetch).payments.retrieve("pay_1");
    expect(payment.id).toBe("pay_1");
    expect(calls).toHaveLength(2);
  });

  test("gives up after maxRetries and throws the API error", async () => {
    const { fetch, calls } = mockFetch(fail(503, "down"));
    await expect(client(fetch, { maxRetries: 2 }).payments.retrieve("p")).rejects.toBeInstanceOf(HsrcpayApiError);
    expect(calls).toHaveLength(3);
  });

  test("does not retry a 4xx", async () => {
    const { fetch, calls } = mockFetch(fail(400, "bad"));
    await expect(client(fetch).payments.retrieve("p")).rejects.toBeInstanceOf(HsrcpayApiError);
    expect(calls).toHaveLength(1);
  });

  test("retries a network failure on GET", async () => {
    const { fetch, calls } = mockFetch(new Error("ECONNRESET"), ok(samplePayment()));
    await client(fetch).payments.retrieve("p");
    expect(calls).toHaveLength(2);
  });

  test("does not retry a POST without an idempotency key", async () => {
    const { fetch, calls } = mockFetch(fail(503, "down"), ok(samplePayment()));
    await expect(client(fetch).payments.create({ amount: 100 })).rejects.toBeInstanceOf(HsrcpayApiError);
    expect(calls).toHaveLength(1);
  });

  test("retries a POST that carries an idempotency key", async () => {
    const { fetch, calls } = mockFetch(fail(503, "down"), ok(samplePayment()));
    await client(fetch).payments.create({ amount: 100 }, { idempotencyKey: "k1" });
    expect(calls).toHaveLength(2);
    expect(calls[1]?.headers["Idempotency-Key"]).toBe("k1");
  });

  test("honors a per-call maxRetries override", async () => {
    const { fetch, calls } = mockFetch(fail(503, "down"));
    await expect(client(fetch).payments.retrieve("p", {}, { maxRetries: 0 })).rejects.toBeInstanceOf(HsrcpayApiError);
    expect(calls).toHaveLength(1);
  });
});

describe("timeouts and aborts", () => {
  const hangingFetch = (_url: string, init: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
    });

  test("times out", async () => {
    const c = new HsrcpayClient({ apiKey: "k", fetch: hangingFetch, timeoutMs: 20, maxRetries: 0 });
    await expect(c.payments.retrieve("p")).rejects.toBeInstanceOf(HsrcpayTimeoutError);
  });

  test("surfaces a caller abort as an abort error", async () => {
    const controller = new AbortController();
    const c = new HsrcpayClient({ apiKey: "k", fetch: hangingFetch, timeoutMs: 5_000, maxRetries: 0 });
    const pending = c.payments.retrieve("p", {}, { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toBeInstanceOf(HsrcpayAbortError);
  });
});
