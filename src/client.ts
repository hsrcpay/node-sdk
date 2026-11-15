import { HttpClient, type FetchLike } from "./http";
import { PaymentsResource } from "./resources/payments";
import { RefundsResource } from "./resources/refunds";

export const DEFAULT_BASE_URL = "https://api.hsrcpay.com";
export const DEFAULT_TIMEOUT_MS = 30_000;
export const DEFAULT_MAX_RETRIES = 2;

/** Injected by `bun build --define` from package.json; the fallback covers tests and source runs. */
declare const __SDK_VERSION__: string | undefined;
export const SDK_VERSION = typeof __SDK_VERSION__ === "string" ? __SDK_VERSION__ : "0.0.0-dev";

export type HsrcpayClientOptions = {
  /** Secret API key (`sk_live_...` or `sk_test_...`). Test keys use the sandbox. */
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  /** Custom fetch implementation, mainly for tests. Defaults to the global `fetch`. */
  fetch?: FetchLike;
  /** Base delay of the retry backoff in milliseconds. */
  retryDelayMs?: number;
};

export class HsrcpayClient {
  readonly payments: PaymentsResource;
  readonly refunds: RefundsResource;

  constructor(options: HsrcpayClientOptions) {
    if (!options.apiKey || options.apiKey.trim() === "") throw new TypeError("apiKey is required");
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) throw new TypeError("timeoutMs must be a positive integer");
    if (!Number.isInteger(maxRetries) || maxRetries < 0) throw new TypeError("maxRetries must be a non-negative integer");

    const http = new HttpClient({
      apiKey: options.apiKey,
      baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
      timeoutMs,
      maxRetries,
      retryDelayMs: options.retryDelayMs ?? 500,
      fetch: options.fetch ?? ((input, init) => fetch(input, init)),
      userAgent: `hsrcpay-node/${SDK_VERSION}`,
    });
    this.payments = new PaymentsResource(http);
    this.refunds = new RefundsResource(http);
  }
}
