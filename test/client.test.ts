import { describe, expect, test } from "bun:test";
import { DEFAULT_BASE_URL, HsrcpayClient } from "../src";
import { mockFetch, ok, samplePayment } from "./helpers";

describe("HsrcpayClient construction", () => {
  test("requires an api key", () => {
    expect(() => new HsrcpayClient({ apiKey: "" })).toThrow("apiKey is required");
    expect(() => new HsrcpayClient({ apiKey: "   " })).toThrow("apiKey is required");
  });

  test("validates timeout and retry settings", () => {
    expect(() => new HsrcpayClient({ apiKey: "k", timeoutMs: 0 })).toThrow("timeoutMs");
    expect(() => new HsrcpayClient({ apiKey: "k", maxRetries: -1 })).toThrow("maxRetries");
  });

  test("uses the default base url", async () => {
    const { fetch, calls } = mockFetch(ok(samplePayment()));
    await new HsrcpayClient({ apiKey: "k", fetch }).payments.retrieve("pay_1");
    expect(calls[0]?.url.startsWith(`${DEFAULT_BASE_URL}/v1/payments/pay_1`)).toBe(true);
  });

  test("honors a custom base url", async () => {
    const { fetch, calls } = mockFetch(ok(samplePayment()));
    await new HsrcpayClient({ apiKey: "k", baseUrl: "http://localhost:3000", fetch }).payments.retrieve("pay_1");
    expect(calls[0]?.url).toBe("http://localhost:3000/v1/payments/pay_1");
  });

  test("sends bearer auth and a user agent", async () => {
    const { fetch, calls } = mockFetch(ok(samplePayment()));
    await new HsrcpayClient({ apiKey: "sk_test_abc", fetch }).payments.retrieve("pay_1");
    expect(calls[0]?.headers.Authorization).toBe("Bearer sk_test_abc");
    expect(calls[0]?.headers["User-Agent"]).toStartWith("hsrcpay-node/");
  });
});
