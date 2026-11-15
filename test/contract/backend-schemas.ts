/**
 * Verbatim copies of the backend request and response schemas the SDK talks to
 * (hsrcpay monorepo, packages/core/payments/src/**\/infrastructure/in/http). Every request the SDK
 * emits is parsed against these, and every sample response is parsed against the DTO schemas, so a
 * contract drift on either side fails the suite. Update this file together with the backend.
 */
import z from "zod";

export const BACKEND_ENUMS = {
  currency: ["USD", "TRY", "EUR", "GBP"],
  paymentStatus: [
    "CREATED",
    "REQUIRES_PAYMENT_METHOD",
    "REQUIRES_ACTION",
    "PROCESSING",
    "SUCCEEDED",
    "AUTHORIZED",
    "CANCELED",
    "REFUNDED",
    "EXPIRED",
  ],
  chargeStatus: [
    "CREATED",
    "REQUIRES_ACTION",
    "AUTHORIZED",
    "REQUIRES_CAPTURE",
    "PARTIALLY_CAPTURED",
    "CAPTURED",
    "CANCELED",
    "FAILED",
    "REFUNDED",
    "EXPIRED",
    "DECLINED",
  ],
  refundReason: ["DEFAULT", "CUSTOMER_REQUEST", "RESTOCK", "FRAUD", "OTHER"],
} as const;

const currency = z.enum(BACKEND_ENUMS.currency);
const instant = z.string();

/* ---------- requests ---------- */

export const CardSchema = z.object({ name: z.string(), pan: z.string(), month: z.string(), year: z.string(), cvv: z.string() });

export const PaymentMethodSchema = z.xor([
  z.object({ type: z.literal("card"), data: z.xor([CardSchema]), save: z.boolean().optional() }),
  z.object({ id: z.string() }),
]);

const providerValue = z.union([z.string().min(1), z.array(z.string().min(1)).min(2)]);

export const RoutingStrategySchema = z.xor([
  z.object({ payment_provider_config_id: providerValue }),
  z.object({ provider_identifier: providerValue }),
]);

export const PaymentCreateBodySchema = z
  .object({
    auto_capture: z.boolean().default(true),
    secure_mode: z.xor([z.literal("auto"), z.boolean()]).default("auto"),
    amount: z.coerce.number().int().positive().nonnegative().min(10).optional(),
    installments: z.number().int().min(1).nonnegative().positive().max(64).optional(),
    currency: currency.optional(),
    customer_id: z.string().optional(),
    product_id: z.string().optional(),
    price_id: z.string().optional(),
    metadata: z
      .record(z.string(), z.any())
      .superRefine((val, ctx) => {
        if (val && Object.keys(val).length > 100) ctx.addIssue({ code: "custom", message: "Metadata must not exceed 100 key-value pairs" });
      })
      .optional(),
  })
  .superRefine((c, ctx) => {
    if (!c.auto_capture && (c?.installments || 0) > 0) ctx.addIssue({ code: "custom", message: "Auto capture must be enabled for installment payments" });
  });

export const PaymentCreateQuerySchema = z.object({ account_id: z.string().optional() });

export const PaymentConfirmBodySchema = z.object({
  payment_method: PaymentMethodSchema,
  routing_strategy: RoutingStrategySchema.optional(),
  payer_identity: z
    .object({
      ip_address: z.string().nullable().default(null),
      user_agent: z.string().nullable().default(null),
      ip_address_details: z.record(z.string(), z.unknown()).nullable().default(null),
    })
    .default({ ip_address: null, ip_address_details: null, user_agent: null }),
});

export const ConfirmHeadersSchema = z.looseObject({ "idempotency-key": z.string().min(1).max(255).optional() });

export const PaymentRefundBodySchema = z
  .object({
    reason: z.enum(BACKEND_ENUMS.refundReason).optional(),
    reason_other: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .default({});

const includeFlag = z.coerce.boolean().optional();
const paymentIncludes = {
  include_charges: includeFlag,
  include_routing_plans: includeFlag,
  include_events: includeFlag,
  include_customer: includeFlag,
  include_payment_provider_details: includeFlag,
};

export const PaymentListQuerySchema = z.object({
  account_id: z.string().optional(),
  customer_id: z.string().optional(),
  product_id: z.string().optional(),
  page: z.coerce.number().positive().optional(),
  limit: z.coerce.number().positive().optional(),
  ...paymentIncludes,
});

export const PaymentGetQuerySchema = z.object({ account_id: z.string().optional(), ...paymentIncludes });

export const PaymentTimelineQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  starting_after: z.string().optional(),
});

export const RefundListQuerySchema = z.object({
  account_id: z.string().optional(),
  page: z.coerce.number().positive().optional(),
  limit: z.coerce.number().positive().optional(),
  charge_id: z.string().optional(),
  payment_id: z.string().optional(),
});

/* ---------- responses ---------- */

export const ChargeAttemptDtoSchema = z.object({
  charge_id: z.string(),
  attempt_no: z.number().nullable(),
  attempt_reason: z.string(),
  secure_mode: z.boolean(),
  three_ds_status: z.string().nullable(),
  decline_class: z.string().nullable(),
  decline_code: z.string().nullable(),
  provider_decline_code: z.string().nullable(),
  retryable: z.boolean(),
});

export const ChargeDtoSchema = z.looseObject({
  object: z.literal("charge"),
  id: z.string(),
  payment_id: z.string().nullable(),
  payment_method_id: z.string().nullable(),
  customer_id: z.string().nullable(),
  account_id: z.string().nullable(),
  product_id: z.string().nullable(),
  price_id: z.string().nullable(),
  status: z.enum(BACKEND_ENUMS.chargeStatus),
  amount: z.number(),
  authorized_amount: z.number(),
  captured_amount: z.number(),
  refunded_amount: z.number(),
  currency,
  installments: z.number(),
  created_at: instant,
  updated_at: instant,
});

export const PaymentDtoSchema = z.looseObject({
  object: z.literal("payment"),
  id: z.string(),
  account_id: z.string().nullable(),
  customer_id: z.string().nullable(),
  product_id: z.string().nullable(),
  price_id: z.string().nullable(),
  amount: z.number(),
  currency,
  status: z.enum(BACKEND_ENUMS.paymentStatus),
  metadata: z.record(z.string(), z.unknown()).optional(),
  created_at: instant,
  updated_at: instant,
  checkout_session_id: z.string().nullable(),
  installments: z.number().nullable(),
  charges: z.array(ChargeDtoSchema).optional(),
  latest_attempt: ChargeAttemptDtoSchema.nullable().optional(),
});

export const RefundDtoSchema = z.looseObject({
  object: z.literal("refund"),
  id: z.string(),
  charge_id: z.string(),
  status: z.string(),
  reason: z.string(),
  reason_other: z.string().nullable(),
  metadata: z.unknown(),
  amount: z.number(),
  currency,
  created_at: instant,
  updated_at: instant,
});

export const TimelineEntrySchema = z.looseObject({
  id: z.string(),
  type: z.string(),
  reason_code: z.string().nullable(),
  severity: z.enum(["neutral", "info", "success", "warning", "danger"]),
  actor: z.enum(["system", "provider", "merchant", "customer"]),
  params: z.record(z.string(), z.unknown()),
  occurred_at: z.string(),
  refs: z.looseObject({
    charge_id: z.string().nullable(),
    attempt_no: z.number().nullable(),
    routing_plan_id: z.string().nullable(),
    ingest_event_id: z.string().nullable(),
    provider_identifier: z.string().nullable(),
  }),
  default_text: z.looseObject({ title: z.string(), description: z.string() }),
});

export const ConfirmDataSchema = z.looseObject({
  payment: PaymentDtoSchema,
  confirmResult: z.looseObject({
    ok: z.boolean(),
    results: z.array(z.any()),
    latestResult: z.any().optional(),
    paymentNextAction: z.any().optional(),
    latest_attempt: ChargeAttemptDtoSchema.nullable().optional(),
  }),
});

export const timelineDataSchema = z.object({ entries: z.array(TimelineEntrySchema), has_more: z.boolean() });

export const dataEnvelope = <T extends z.ZodType>(data: T) =>
  z.looseObject({ message: z.literal("success"), success: z.literal(true), data });

export const pageEnvelope = <T extends z.ZodType>(item: T) =>
  z.looseObject({
    message: z.literal("success"),
    success: z.literal(true),
    data: z.array(item),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    pages: z.number().int().nonnegative(),
  });

/** `toHandlerResponse` failure body: `{ message, success: false, error: { code, message, details? } }`. */
export const errorEnvelopeSchema = z.object({
  message: z.string(),
  success: z.literal(false),
  error: z.object({ code: z.number(), message: z.string(), details: z.unknown().optional() }),
});
