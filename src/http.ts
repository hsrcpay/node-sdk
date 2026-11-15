import { HsrcpayAbortError, HsrcpayApiError, HsrcpayConnectionError, HsrcpayTimeoutError } from "./errors";
import type { MutationOptions, Page } from "./types";

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export type HttpClientConfig = {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
  maxRetries: number;
  /** Base delay of the exponential backoff. */
  retryDelayMs: number;
  fetch: FetchLike;
  userAgent: string;
};

export type Query = Record<string, string | number | boolean | undefined>;

export type HttpRequest = {
  method: "GET" | "POST";
  path: string;
  query?: Query;
  body?: unknown;
} & MutationOptions;

const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);
const MAX_BACKOFF_MS = 8_000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class HttpClient {
  constructor(private readonly config: HttpClientConfig) {}

  async data<T>(req: HttpRequest): Promise<T> {
    const body = await this.send(req);
    return (body as { data: T }).data;
  }

  async page<T>(req: HttpRequest): Promise<Page<T>> {
    const body = (await this.send(req)) as Page<T>;
    return { data: body.data, total: body.total, page: body.page, limit: body.limit, pages: body.pages };
  }

  private buildUrl(path: string, query?: Query): string {
    const url = new URL(path, this.config.baseUrl);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    return url.toString();
  }

  private buildInit(req: HttpRequest, signal: AbortSignal): RequestInit {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.apiKey}`,
      Accept: "application/json",
      "User-Agent": this.config.userAgent,
    };
    if (req.body !== undefined) headers["Content-Type"] = "application/json";
    if (req.idempotencyKey) headers["Idempotency-Key"] = req.idempotencyKey;
    return {
      method: req.method,
      headers,
      body: req.body === undefined ? undefined : JSON.stringify(req.body),
      signal,
    };
  }

  /** GET is always safe to repeat; POST only with an idempotency key. */
  private canRetry(req: HttpRequest): boolean {
    return req.method === "GET" || Boolean(req.idempotencyKey);
  }

  private backoffMs(attempt: number, retryAfter: string | null): number {
    const seconds = retryAfter ? Number(retryAfter) : NaN;
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, MAX_BACKOFF_MS);
    const exp = this.config.retryDelayMs * 2 ** attempt;
    return Math.min(exp + Math.random() * this.config.retryDelayMs, MAX_BACKOFF_MS);
  }

  private async send(req: HttpRequest): Promise<unknown> {
    const url = this.buildUrl(req.path, req.query);
    const timeoutMs = req.timeoutMs ?? this.config.timeoutMs;
    const maxRetries = this.canRetry(req) ? (req.maxRetries ?? this.config.maxRetries) : 0;

    for (let attempt = 0; ; attempt++) {
      const timeoutSignal = AbortSignal.timeout(timeoutMs);
      const signal = req.signal ? AbortSignal.any([req.signal, timeoutSignal]) : timeoutSignal;

      let response: Response;
      try {
        response = await this.config.fetch(url, this.buildInit(req, signal));
      } catch (error) {
        if (req.signal?.aborted) throw new HsrcpayAbortError();
        const failure = timeoutSignal.aborted
          ? new HsrcpayTimeoutError(timeoutMs)
          : new HsrcpayConnectionError(error instanceof Error ? error.message : "Network error", { cause: error });
        if (attempt >= maxRetries) throw failure;
        await sleep(this.backoffMs(attempt, null));
        continue;
      }

      if (RETRYABLE_STATUS.has(response.status) && attempt < maxRetries) {
        await sleep(this.backoffMs(attempt, response.headers.get("retry-after")));
        continue;
      }
      return this.parse(response);
    }
  }

  private async parse(response: Response): Promise<unknown> {
    const text = await response.text();
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      if (!response.ok) throw new HsrcpayApiError({ status: response.status, message: text.slice(0, 200) || response.statusText });
      throw new HsrcpayConnectionError("Response body is not valid JSON");
    }

    if (response.ok) return body;

    const err = isRecord(body) && isRecord(body.error) ? body.error : undefined;
    const message =
      (err && typeof err.message === "string" && err.message) ||
      (isRecord(body) && typeof body.message === "string" && body.message) ||
      response.statusText ||
      "Request failed";
    throw new HsrcpayApiError({
      status: response.status,
      message,
      code: typeof err?.code === "number" ? err.code : undefined,
      details: err?.details,
      body,
    });
  }
}
