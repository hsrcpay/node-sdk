import { describe, expect, test } from "bun:test";
import {
  ErrorKind,
  HsrcpayAbortError,
  HsrcpayApiError,
  HsrcpayClient,
  HsrcpayConnectionError,
  HsrcpayError,
  HsrcpayResponseError,
  HsrcpayTimeoutError,
  HsrcpayValidationError,
  classifyError,
  isErrorKind,
  isRetryableError,
} from "../src";
import { fail, mockFetch, ok } from "./helpers";

const api = (status: number, extra: { errorCode?: string } = {}) =>
  new HsrcpayApiError({ status, message: "x", ...extra });

describe("classifyError", () => {
  test.each([
    [400, "invalid_request", false],
    [401, "authentication", false],
    [402, "invalid_request", false],
    [403, "permission", false],
    [404, "not_found", false],
    [405, "invalid_request", false],
    [409, "conflict", false],
    [410, "invalid_request", false],
    [413, "invalid_request", false],
    [422, "invalid_request", false],
    [429, "rate_limited", true],
    [500, "server", false],
    [501, "server", false],
    [502, "server", true],
    [503, "server", true],
    [504, "server", true],
    [599, "server", false],
  ])("HTTP %i is %s (retryable: %p)", (status, kind, retryable) => {
    expect(classifyError(api(status))).toEqual({ kind, retryable, status } as never);
  });

  test("carries the machine-readable code of bare refusals", () => {
    expect(classifyError(api(409, { errorCode: "customer_has_active_subscriptions" }))).toEqual({
      kind: ErrorKind.CONFLICT,
      retryable: false,
      status: 409,
      errorCode: "customer_has_active_subscriptions",
    });
    expect(classifyError(api(400, { errorCode: "immutable_field" })).errorCode).toBe("immutable_field");
  });

  test("a non-error status code falls back to unknown", () => {
    expect(classifyError(api(302)).kind).toBe(ErrorKind.UNKNOWN);
  });

  test.each([
    [new HsrcpayTimeoutError(100), ErrorKind.TIMEOUT, true],
    [new HsrcpayConnectionError("down"), ErrorKind.NETWORK, true],
    [new HsrcpayAbortError(), ErrorKind.ABORTED, false],
    [new HsrcpayValidationError("x", []), ErrorKind.VALIDATION, false],
    [new HsrcpayResponseError("x", []), ErrorKind.RESPONSE_MISMATCH, false],
    [new HsrcpayError("base"), ErrorKind.UNKNOWN, false],
    [new Error("plain"), ErrorKind.UNKNOWN, false],
    ["a string", ErrorKind.UNKNOWN, false],
    [undefined, ErrorKind.UNKNOWN, false],
    [null, ErrorKind.UNKNOWN, false],
    [{ status: 503 }, ErrorKind.UNKNOWN, false],
  ])("%p", (error, kind, retryable) => {
    expect(classifyError(error)).toEqual({ kind, retryable });
  });

  test("a timeout is classified as timeout, not network", () => {
    expect(new HsrcpayTimeoutError(1)).toBeInstanceOf(HsrcpayConnectionError);
    expect(classifyError(new HsrcpayTimeoutError(1)).kind).toBe(ErrorKind.TIMEOUT);
  });

  test("helpers", () => {
    expect(isRetryableError(api(503))).toBe(true);
    expect(isRetryableError(api(404))).toBe(false);
    expect(isErrorKind(api(404), ErrorKind.NOT_FOUND)).toBe(true);
    expect(isErrorKind(api(404), ErrorKind.SERVER)).toBe(false);
  });

  test("the error kind values are stable strings", () => {
    expect((Object.values(ErrorKind) as string[]).sort()).toEqual(
      [
        "aborted",
        "authentication",
        "conflict",
        "invalid_request",
        "network",
        "not_found",
        "permission",
        "rate_limited",
        "response_mismatch",
        "server",
        "timeout",
        "unknown",
        "validation",
      ].sort(),
    );
  });
});

describe("classifying real failures end to end", () => {
  const client = (...replies: Parameters<typeof mockFetch>) =>
    new HsrcpayClient({ apiKey: "sk_test_k", fetch: mockFetch(...replies).fetch, retryDelayMs: 1, maxRetries: 0 });

  test("a 401 from the API", async () => {
    const error = await client(fail(401, "Invalid API key")).payments.retrieve("p").catch((e: unknown) => e);
    expect(classifyError(error)).toEqual({ kind: "authentication", retryable: false, status: 401 });
  });

  test("a 403 from the API", async () => {
    const error = await client(fail(403, "Public actor blocked")).customers.list().catch((e: unknown) => e);
    expect(classifyError(error).kind).toBe("permission");
  });

  test("a 404 from the API", async () => {
    const error = await client(fail(404, "Customer not found")).customers.retrieve("c").catch((e: unknown) => e);
    expect(classifyError(error).kind).toBe("not_found");
  });

  test("a 429 from the API", async () => {
    const error = await client(fail(429, "slow down")).payments.list().catch((e: unknown) => e);
    expect(classifyError(error)).toEqual({ kind: "rate_limited", retryable: true, status: 429 });
  });

  test("bad input", async () => {
    const error = await Promise.resolve()
      .then(() => client(ok({})).payments.create({ amount: 1 }))
      .catch((e: unknown) => e);
    expect(classifyError(error).kind).toBe("validation");
  });

  test("a network failure", async () => {
    const error = await client(new Error("ECONNRESET")).payments.retrieve("p").catch((e: unknown) => e);
    expect(classifyError(error)).toEqual({ kind: "network", retryable: true });
  });
});
