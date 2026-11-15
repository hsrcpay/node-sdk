import {
  HsrcpayAbortError,
  HsrcpayApiError,
  HsrcpayConnectionError,
  HsrcpayResponseError,
  HsrcpayTimeoutError,
  HsrcpayValidationError,
} from "./errors";

export const ErrorKind = {
  /** Arguments rejected on the client before any request was sent. */
  VALIDATION: "validation",
  /** The API rejected the request as malformed or semantically invalid (400, 422 and other unlisted 4xx). */
  INVALID_REQUEST: "invalid_request",
  /** Missing, invalid or expired API key (401). */
  AUTHENTICATION: "authentication",
  /** The key is valid but not allowed to do this (403). */
  PERMISSION: "permission",
  NOT_FOUND: "not_found",
  /** The resource state forbids the operation (409), for example deleting a customer with subscriptions. */
  CONFLICT: "conflict",
  RATE_LIMITED: "rate_limited",
  /** The API failed (5xx). */
  SERVER: "server",
  /** No usable response: DNS, socket, TLS or a body that is not JSON. */
  NETWORK: "network",
  TIMEOUT: "timeout",
  /** The caller aborted through `signal`. */
  ABORTED: "aborted",
  /** `validateResponses` is on and the reply does not match the SDK schema. */
  RESPONSE_MISMATCH: "response_mismatch",
  UNKNOWN: "unknown",
} as const;
export type ErrorKind = (typeof ErrorKind)[keyof typeof ErrorKind];

export type ErrorClassification = {
  kind: ErrorKind;
  /** Whether repeating the same call can succeed without changing it. Mutating calls still need an idempotency key. */
  retryable: boolean;
  /** HTTP status, for API errors. */
  status?: number;
  /** Machine-readable refusal code (`immutable_field`, `customer_has_active_subscriptions`, ...) when the API sent one. */
  errorCode?: string;
};

const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);

function classifyStatus(status: number): ErrorKind {
  if (status === 401) return ErrorKind.AUTHENTICATION;
  if (status === 403) return ErrorKind.PERMISSION;
  if (status === 404) return ErrorKind.NOT_FOUND;
  if (status === 409) return ErrorKind.CONFLICT;
  if (status === 429) return ErrorKind.RATE_LIMITED;
  if (status >= 500) return ErrorKind.SERVER;
  if (status >= 400) return ErrorKind.INVALID_REQUEST;
  return ErrorKind.UNKNOWN;
}

/** Maps anything thrown by the SDK to a stable category plus a retry hint. Never throws. */
export function classifyError(error: unknown): ErrorClassification {
  if (error instanceof HsrcpayApiError) {
    return {
      kind: classifyStatus(error.status),
      retryable: RETRYABLE_STATUS.has(error.status),
      status: error.status,
      ...(error.errorCode ? { errorCode: error.errorCode } : {}),
    };
  }
  if (error instanceof HsrcpayTimeoutError) return { kind: ErrorKind.TIMEOUT, retryable: true };
  if (error instanceof HsrcpayConnectionError) return { kind: ErrorKind.NETWORK, retryable: true };
  if (error instanceof HsrcpayAbortError) return { kind: ErrorKind.ABORTED, retryable: false };
  if (error instanceof HsrcpayValidationError) return { kind: ErrorKind.VALIDATION, retryable: false };
  if (error instanceof HsrcpayResponseError) return { kind: ErrorKind.RESPONSE_MISMATCH, retryable: false };
  return { kind: ErrorKind.UNKNOWN, retryable: false };
}

export const isRetryableError = (error: unknown): boolean => classifyError(error).retryable;
export const isErrorKind = (error: unknown, kind: ErrorKind): boolean => classifyError(error).kind === kind;
