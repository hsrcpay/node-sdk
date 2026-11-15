export const Currency = { USD: "USD", TRY: "TRY", EUR: "EUR", GBP: "GBP" } as const;
export type Currency = (typeof Currency)[keyof typeof Currency];

export const PaymentStatus = {
  CREATED: "CREATED",
  REQUIRES_PAYMENT_METHOD: "REQUIRES_PAYMENT_METHOD",
  REQUIRES_ACTION: "REQUIRES_ACTION",
  PROCESSING: "PROCESSING",
  SUCCEEDED: "SUCCEEDED",
  AUTHORIZED: "AUTHORIZED",
  CANCELED: "CANCELED",
  REFUNDED: "REFUNDED",
  EXPIRED: "EXPIRED",
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const ChargeStatus = {
  CREATED: "CREATED",
  REQUIRES_ACTION: "REQUIRES_ACTION",
  AUTHORIZED: "AUTHORIZED",
  REQUIRES_CAPTURE: "REQUIRES_CAPTURE",
  PARTIALLY_CAPTURED: "PARTIALLY_CAPTURED",
  CAPTURED: "CAPTURED",
  CANCELED: "CANCELED",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
  EXPIRED: "EXPIRED",
  DECLINED: "DECLINED",
} as const;
export type ChargeStatus = (typeof ChargeStatus)[keyof typeof ChargeStatus];

export const RefundReason = {
  DEFAULT: "DEFAULT",
  CUSTOMER_REQUEST: "CUSTOMER_REQUEST",
  RESTOCK: "RESTOCK",
  FRAUD: "FRAUD",
  OTHER: "OTHER",
} as const;
export type RefundReason = (typeof RefundReason)[keyof typeof RefundReason];

export type Metadata = Record<string, unknown>;

/** Envelope of a paginated list endpoint. */
export type Page<T> = { data: T[]; total: number; page: number; limit: number; pages: number };

export type ChargeAttempt = {
  charge_id: string;
  attempt_no: number | null;
  attempt_reason: string;
  secure_mode: boolean;
  three_ds_status: string | null;
  /** hard | soft | provider_error | indeterminate; null when the attempt did not fail. */
  decline_class: string | null;
  decline_code: string | null;
  provider_decline_code: string | null;
  /** True when another confirm can make sense (soft declines and provider errors). */
  retryable: boolean;
};

export type Charge = {
  object: "charge";
  id: string;
  payment_id: string | null;
  status: ChargeStatus;
  amount: number;
  authorized_amount: number;
  captured_amount: number;
  refunded_amount: number;
  currency: Currency;
  installments: number;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
};

/** Amounts are integers in minor units (cents). */
export type Payment = {
  object: "payment";
  id: string;
  account_id: string | null;
  customer_id: string | null;
  product_id: string | null;
  price_id: string | null;
  amount: number;
  currency: Currency;
  status: PaymentStatus;
  metadata?: Metadata;
  created_at: string;
  updated_at: string;
  checkout_session_id: string | null;
  installments: number | null;
  charges?: Charge[];
  latest_attempt?: ChargeAttempt | null;
  [key: string]: unknown;
};

export type Refund = {
  object: "refund";
  id: string;
  charge_id: string;
  status: string;
  reason: string;
  reason_other: string | null;
  metadata: unknown;
  amount: number;
  currency: Currency;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
};

export type CardInput = { name: string; pan: string; month: string; year: string; cvv: string };

export type PaymentMethodInput = { type: "card"; data: CardInput; save?: boolean } | { id: string };

export type RoutingStrategy =
  | { payment_provider_config_id: string | string[] }
  | { provider_identifier: string | string[] };

export type PayerIdentity = {
  ip_address?: string | null;
  user_agent?: string | null;
  ip_address_details?: Record<string, unknown> | null;
};

export type ConfirmResult = {
  ok: boolean;
  results: unknown[];
  latestResult?: unknown;
  /** Set when the payer must be redirected (3D Secure and similar). */
  paymentNextAction?: unknown;
  latest_attempt?: ChargeAttempt | null;
  [key: string]: unknown;
};

export type ConfirmedPayment = { payment: Payment; confirmResult: ConfirmResult };

export type TimelineEntry = {
  id: string;
  type: string;
  reason_code: string | null;
  severity: "neutral" | "info" | "success" | "warning" | "danger";
  actor: "system" | "provider" | "merchant" | "customer";
  params: Record<string, unknown>;
  occurred_at: string;
  refs: Record<string, unknown>;
  default_text: { title: string; description: string };
  [key: string]: unknown;
};

export type PaymentTimeline = { entries: TimelineEntry[]; has_more: boolean };

/** Per-call overrides accepted by every method. */
export type RequestOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Retry budget for this call; defaults to the client setting. */
  maxRetries?: number;
};

export type MutationOptions = RequestOptions & {
  /** Sent as `Idempotency-Key`. Required for a POST to be retried automatically. */
  idempotencyKey?: string;
};
