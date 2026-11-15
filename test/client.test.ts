import { afterEach, describe, expect, test } from "bun:test";
import {
  DEFAULT_BASE_URL,
  HsrcpayClient,
  HsrcpayPublicClient,
  KeyKind,
  SDK_VERSION,
  detectKeyKind,
  isTestKey,
} from "../src";
import { mockFetch, ok, samplePayment } from "./helpers";

describe("HsrcpayClient construction", () => {
  test("requires an api key", () => {
    expect(() => new HsrcpayClient({ apiKey: "" })).toThrow("apiKey is required");
    expect(() => new HsrcpayClient({ apiKey: "   " })).toThrow("apiKey is required");
    expect(() => new HsrcpayClient({ apiKey: undefined as never })).toThrow("apiKey is required");
  });

  test("validates timeout and retry settings", () => {
    expect(() => new HsrcpayClient({ apiKey: "sk_test_k", timeoutMs: 0 })).toThrow("timeoutMs");
    expect(() => new HsrcpayClient({ apiKey: "sk_test_k", timeoutMs: 1.5 })).toThrow("timeoutMs");
    expect(() => new HsrcpayClient({ apiKey: "sk_test_k", maxRetries: -1 })).toThrow("maxRetries");
    expect(() => new HsrcpayClient({ apiKey: "sk_test_k", maxRetries: 0.5 })).toThrow("maxRetries");
  });

  test("uses the default base url", async () => {
    const { fetch, calls } = mockFetch(ok(samplePayment()));
    await new HsrcpayClient({ apiKey: "sk_test_k", fetch }).payments.retrieve("pay_1");
    expect(calls[0]?.url.startsWith(`${DEFAULT_BASE_URL}/v1/payments/pay_1`)).toBe(true);
  });

  test("honors a custom base url", async () => {
    const { fetch, calls } = mockFetch(ok(samplePayment()));
    await new HsrcpayClient({ apiKey: "sk_test_k", baseUrl: "http://localhost:3000", fetch }).payments.retrieve("pay_1");
    expect(calls[0]?.url).toBe("http://localhost:3000/v1/payments/pay_1");
  });

  test("sends bearer auth and a user agent", async () => {
    const { fetch, calls } = mockFetch(ok(samplePayment()));
    await new HsrcpayClient({ apiKey: "sk_test_abc", fetch }).payments.retrieve("pay_1");
    expect(calls[0]?.headers.Authorization).toBe("Bearer sk_test_abc");
    expect(calls[0]?.headers["User-Agent"]).toBe(`hsrcpay-node/${SDK_VERSION}`);
  });

  test("trims the api key", async () => {
    const { fetch, calls } = mockFetch(ok(samplePayment()));
    await new HsrcpayClient({ apiKey: "  sk_test_abc  ", fetch }).payments.retrieve("pay_1");
    expect(calls[0]?.headers.Authorization).toBe("Bearer sk_test_abc");
  });

  test("exposes every account resource", () => {
    const c = new HsrcpayClient({ apiKey: "sk_live_abc" });
    for (const name of ["payments", "charges", "refunds", "customers", "products", "prices", "checkoutSessions"] as const) {
      expect(c[name]).toBeDefined();
    }
    expect(c.customers.addresses).toBeDefined();
    expect(c.products.prices).toBeDefined();
  });
});

describe("key kinds", () => {
  test.each([
    ["sk_live_abc", "secret"],
    ["sk_test_abc", "secret"],
    ["pk_live_abc", "publishable"],
    ["pk_test_abc", "publishable"],
    ["acct_sk_live_abc", "secret"],
    ["acct_pk_test_abc", "publishable"],
    ["eyJhbGciOiJIUzI1NiJ9.payload.sig", undefined],
    ["random", undefined],
    ["x".repeat(40) + "sk_live", undefined],
  ])("detects %s", (key, kind) => {
    expect(detectKeyKind(key)).toBe(kind as never);
  });

  test("the secret key wins when both markers appear", () => {
    expect(detectKeyKind("sk_pk_live")).toBe(KeyKind.SECRET);
  });

  test.each([
    ["sk_test_abc", true],
    ["pk_test_abc", true],
    ["sk_live_abc", false],
  ])("isTestKey(%s)", (key, expected) => {
    expect(isTestKey(key)).toBe(expected);
  });
});

describe("key guards", () => {
  test("the server client rejects a publishable key and points to the public client", () => {
    expect(() => new HsrcpayClient({ apiKey: "pk_test_abc" })).toThrow("HsrcpayPublicClient");
  });

  test("the server client rejects keys that are not API keys", () => {
    expect(() => new HsrcpayClient({ apiKey: "not-a-key" })).toThrow("secret API key");
  });

  test("the public client rejects a secret key", () => {
    expect(() => new HsrcpayPublicClient({ publishableKey: "sk_live_abc" })).toThrow("Never use a secret key");
  });

  test("the public client rejects keys that are not API keys", () => {
    expect(() => new HsrcpayPublicClient({ publishableKey: "nope" })).toThrow("publishable API key");
    expect(() => new HsrcpayPublicClient({ publishableKey: "" })).toThrow("apiKey is required");
  });

  test("the public client only exposes the hosted checkout surface", () => {
    const c = new HsrcpayPublicClient({ publishableKey: "pk_test_abc" }) as unknown as Record<string, unknown>;
    expect(Object.keys(c).sort()).toEqual(["checkoutSessions", "payments"]);
  });

  describe("browser guard", () => {
    const scope = globalThis as { window?: unknown };
    afterEach(() => {
      delete scope.window;
    });

    test("the server client refuses to run in a browser", () => {
      scope.window = { document: {} };
      expect(() => new HsrcpayClient({ apiKey: "sk_test_abc" })).toThrow("must not run in a browser");
    });

    test("unless the caller opts in", () => {
      scope.window = { document: {} };
      expect(() => new HsrcpayClient({ apiKey: "sk_test_abc", dangerouslyAllowBrowser: true })).not.toThrow();
    });

    test("the public client runs in a browser", () => {
      scope.window = { document: {} };
      expect(() => new HsrcpayPublicClient({ publishableKey: "pk_test_abc" })).not.toThrow();
    });
  });
});
