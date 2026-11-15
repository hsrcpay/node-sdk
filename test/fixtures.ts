/** Wire-accurate sample payloads, shaped like the backend DTOs. */

export const attempt = (overrides: Record<string, unknown> = {}) => ({
  charge_id: "ch_1",
  attempt_no: 1,
  attempt_reason: "INITIAL",
  secure_mode: false,
  three_ds_status: null,
  decline_class: null,
  decline_code: null,
  provider_decline_code: null,
  retryable: false,
  ...overrides,
});

export const charge = (overrides: Record<string, unknown> = {}) => ({
  object: "charge",
  id: "ch_1",
  payment_id: "pay_1",
  payment_method_id: "pm_1",
  customer_id: null,
  account_id: "acc_1",
  product_id: null,
  price_id: null,
  status: "CAPTURED",
  amount: 2500,
  authorized_amount: 2500,
  captured_amount: 2500,
  refunded_amount: 0,
  currency: "TRY",
  installments: 1,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

export const payment = (overrides: Record<string, unknown> = {}) => ({
  object: "payment",
  id: "pay_1",
  account_id: "acc_1",
  customer_id: null,
  product_id: null,
  price_id: null,
  amount: 2500,
  currency: "TRY",
  status: "CREATED",
  metadata: {},
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  checkout_session_id: null,
  installments: null,
  ...overrides,
});

export const refund = (overrides: Record<string, unknown> = {}) => ({
  object: "refund",
  id: "ref_1",
  charge_id: "ch_1",
  status: "SUCCEEDED",
  reason: "DEFAULT",
  reason_other: null,
  metadata: null,
  amount: 2500,
  currency: "TRY",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

export const timelineEntry = (overrides: Record<string, unknown> = {}) => ({
  id: "evt_1",
  type: "fallback.non_secure_started",
  reason_code: null,
  severity: "info",
  actor: "system",
  params: {},
  occurred_at: "2026-01-01T00:00:00.000Z",
  refs: { charge_id: "ch_1", attempt_no: 1, routing_plan_id: null, ingest_event_id: null, provider_identifier: "iyzico" },
  default_text: { title: "Retried without 3D Secure", description: "The first attempt was declined." },
  ...overrides,
});

export const card = { name: "Ada Lovelace", pan: "4111111111111111", month: "12", year: "2030", cvv: "123" };

export const confirmData = (overrides: Record<string, unknown> = {}) => ({
  payment: payment({ status: "SUCCEEDED", charges: [charge()], latest_attempt: attempt() }),
  confirmResult: { ok: true, results: [{ provider: "iyzico" }], latest_attempt: attempt(), ...overrides },
});
