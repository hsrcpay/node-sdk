import { HttpClient, type FetchLike } from "./http";
import { KeyKind, detectKeyKind, isBrowserLike } from "./key";

export const DEFAULT_BASE_URL = "https://api.hsrcpay.com";
export const DEFAULT_TIMEOUT_MS = 30_000;
export const DEFAULT_MAX_RETRIES = 2;
export const DEFAULT_RETRY_DELAY_MS = 500;

/** Injected by the build from package.json; the fallback covers tests and source runs. */
declare const __SDK_VERSION__: string | undefined;
export const SDK_VERSION = typeof __SDK_VERSION__ === "string" ? __SDK_VERSION__ : "0.0.0-dev";

export type BaseClientOptions = {
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  /** Base delay of the retry backoff in milliseconds. */
  retryDelayMs?: number;
  /** Parse every reply with the SDK schemas and throw `HsrcpayResponseError` on a mismatch. Off by default. */
  validateResponses?: boolean;
  /** Custom fetch implementation, mainly for tests. Defaults to the global `fetch`. */
  fetch?: FetchLike;
};

/** Validates the key kind and the options, then builds the HTTP client. Throws `TypeError` on misuse. */
export function createHttpClient(
  apiKey: string,
  expected: KeyKind,
  options: BaseClientOptions,
  clientName: string,
): HttpClient {
  if (typeof apiKey !== "string" || apiKey.trim() === "") throw new TypeError("apiKey is required");
  const key = apiKey.trim();
  const kind = detectKeyKind(key);

  if (expected === KeyKind.SECRET) {
    if (kind === KeyKind.PUBLISHABLE) {
      throw new TypeError(`${clientName} needs a secret key (sk_...). This is a publishable key: use HsrcpayPublicClient.`);
    }
    if (kind === undefined) throw new TypeError(`${clientName} needs a secret API key (sk_live_... or sk_test_...)`);
  } else {
    if (kind === KeyKind.SECRET) {
      throw new TypeError(`${clientName} needs a publishable key (pk_...). Never use a secret key (sk_...) in client-side code.`);
    }
    if (kind === undefined) throw new TypeError(`${clientName} needs a publishable API key (pk_live_... or pk_test_...)`);
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) throw new TypeError("timeoutMs must be a positive integer");
  if (!Number.isInteger(maxRetries) || maxRetries < 0) throw new TypeError("maxRetries must be a non-negative integer");

  return new HttpClient({
    apiKey: key,
    baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
    timeoutMs,
    maxRetries,
    retryDelayMs: options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS,
    validateResponses: options.validateResponses ?? false,
    fetch: options.fetch ?? ((input, init) => fetch(input, init)),
    userAgent: `hsrcpay-node/${SDK_VERSION}`,
  });
}

export const assertServerEnvironment = (dangerouslyAllowBrowser: boolean | undefined): void => {
  if (isBrowserLike() && !dangerouslyAllowBrowser) {
    throw new Error(
      "HsrcpayClient holds a secret key and must not run in a browser. Use HsrcpayPublicClient with a publishable key, " +
        "or pass dangerouslyAllowBrowser: true if you understand the risk.",
    );
  }
};
