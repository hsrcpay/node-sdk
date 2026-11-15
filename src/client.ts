import { HttpClient, type FetchLike } from "./core/http";
import { ChargesResource } from "./modules/charges";
import { PaymentsResource } from "./modules/payments";
import { RefundsResource } from "./modules/refunds";

export const DEFAULT_BASE_URL = "https://api.hsrcpay.com";
export const DEFAULT_TIMEOUT_MS = 30_000;
export const DEFAULT_MAX_RETRIES = 2;
export const DEFAULT_RETRY_DELAY_MS = 500;

/** Injected by the build from package.json; the fallback covers tests and source runs. */
declare const __SDK_VERSION__: string | undefined;
export const SDK_VERSION = typeof __SDK_VERSION__ === "string" ? __SDK_VERSION__ : "0.0.0-dev";

export type HsrcpayClientOptions = {
  /** Secret API key (`sk_live_...` or `sk_test_...`). Test keys use the sandbox. */
  apiKey: string;
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

export class HsrcpayClient {
  readonly payments: PaymentsResource;
  readonly charges: ChargesResource;
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
      retryDelayMs: options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS,
      validateResponses: options.validateResponses ?? false,
      fetch: options.fetch ?? ((input, init) => fetch(input, init)),
      userAgent: `hsrcpay-node/${SDK_VERSION}`,
    });
    this.payments = new PaymentsResource(http);
    this.charges = new ChargesResource(http);
    this.refunds = new RefundsResource(http);
  }
}
