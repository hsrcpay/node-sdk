import type { z } from "zod";
import {
  HsrcpayAbortError,
  HsrcpayApiError,
  HsrcpayConnectionError,
  HsrcpayResponseError,
  HsrcpayTimeoutError,
} from "./errors";
import type { MutationOptions, Page } from "./schemas";

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
  /** Parse every successful reply with the SDK schema and throw `HsrcpayResponseError` on drift. */
  validateResponses: boolean;
};

export type Query = Record<string, string | number | boolean | undefined>;

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type HttpRequest = {
  method: HttpMethod;
  path: string;
  query?: Query;
  body?: unknown;
} & MutationOptions;

const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);
/** Repeating these never changes the outcome beyond the first success (RFC 9110). */
const SAFE_TO_REPEAT = new Set<HttpMethod>(["GET", "PUT", "DELETE"]);
const MAX_BACKOFF_MS = 8_000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class HttpClient {
  constructor(private readonly config: HttpClientConfig) {}

  /** Returns the envelope `data` payload; `undefined` for void responses. */
  async data<S extends z.ZodType>(req: HttpRequest, schema: S): Promise<z.output<S>>;
  async data(req: HttpRequest): Promise<void>;
  async data(req: HttpRequest, schema?: z.ZodType): Promise<unknown> {
    const body = (await this.send(req)) as { data?: unknown } | undefined;
    const data = body?.data;
    return schema ? this.check(schema, data, `${req.method} ${req.path} response`) : undefined;
  }

  async page<S extends z.ZodType>(req: HttpRequest, item: S): Promise<Page<z.output<S>>> {
    const body = (await this.send(req)) as Page<unknown>;
    if (this.config.validateResponses) {
      for (const entry of body.data ?? []) this.check(item, entry, `${req.method} ${req.path} item`);
    }
    return { data: body.data as z.output<S>[], total: body.total, page: body.page, limit: body.limit, pages: body.pages };
  }

  private check<S extends z.ZodType>(schema: S, value: unknown, label: string): z.output<S> {
    if (!this.config.validateResponses) return value as z.output<S>;
    const result = schema.safeParse(value);
    if (!result.success) throw new HsrcpayResponseError(label, result.error.issues);
    return result.data;
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

  private canRetry(req: HttpRequest): boolean {
    return SAFE_TO_REPEAT.has(req.method) || Boolean(req.idempotencyKey);
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
