import type { z } from "zod";

export type ValidationIssue = z.core.$ZodIssue;

export class HsrcpayError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** The API answered with a non-2xx status. */
export class HsrcpayApiError extends HsrcpayError {
  readonly status: number;
  /** Platform error code from `error.code`, usually the HTTP status echoed by the server. */
  readonly code: number | undefined;
  readonly details: unknown;
  readonly body: unknown;

  constructor(params: { status: number; message: string; code?: number; details?: unknown; body?: unknown }) {
    super(params.message);
    this.status = params.status;
    this.code = params.code;
    this.details = params.details;
    this.body = params.body;
  }
}

/** The request never produced a usable HTTP response (DNS, socket, TLS, malformed body). */
export class HsrcpayConnectionError extends HsrcpayError {}

export class HsrcpayTimeoutError extends HsrcpayConnectionError {
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
  }
}

export class HsrcpayAbortError extends HsrcpayError {
  constructor() {
    super("Request was aborted");
  }
}

/** Thrown before any request is sent when the arguments violate the API contract. */
export class HsrcpayValidationError extends HsrcpayError {
  readonly issues: ValidationIssue[];

  constructor(label: string, issues: ValidationIssue[]) {
    const summary = issues.map((i) => `${i.path.length ? i.path.join(".") : "(root)"}: ${i.message}`).join("; ");
    super(`Invalid ${label}: ${summary}`);
    this.issues = issues;
  }
}

/** Thrown when `validateResponses` is on and the API reply does not match the SDK schema. */
export class HsrcpayResponseError extends HsrcpayError {
  readonly issues: ValidationIssue[];

  constructor(label: string, issues: ValidationIssue[]) {
    const summary = issues.map((i) => `${i.path.length ? i.path.join(".") : "(root)"}: ${i.message}`).join("; ");
    super(`Unexpected ${label} from the API: ${summary}`);
    this.issues = issues;
  }
}
