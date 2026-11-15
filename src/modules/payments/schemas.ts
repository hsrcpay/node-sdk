import { z } from "zod";
import {
  CurrencySchema,
  IdSchema,
  InstantSchema,
  MetadataSchema,
  PageParamsSchema,
} from "../../core/schemas";
import { ChargeAttemptSchema, ChargeSchema } from "../charges/schemas";
import { RefundReasonSchema } from "../refunds/schemas";

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
export const PaymentStatusSchema = z.enum(PaymentStatus);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

/** Amounts are integers in minor units (cents). */
export const PaymentSchema = z.looseObject({
  object: z.literal("payment"),
  id: z.string(),
  account_id: z.string().nullable(),
  customer_id: z.string().nullable(),
  product_id: z.string().nullable(),
  price_id: z.string().nullable(),
  amount: z.number(),
  currency: CurrencySchema,
  status: PaymentStatusSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
  created_at: InstantSchema,
  updated_at: InstantSchema,
  checkout_session_id: z.string().nullable(),
  installments: z.number().nullable(),
  charges: z.array(ChargeSchema).optional(),
  latest_attempt: ChargeAttemptSchema.nullable().optional(),
});
export type Payment = z.infer<typeof PaymentSchema>;

export const ConfirmResultSchema = z.looseObject({
  ok: z.boolean(),
  results: z.array(z.unknown()),
  latestResult: z.unknown().optional(),
  /** Set when the payer must be redirected (3D Secure and similar). */
  paymentNextAction: z.unknown().optional(),
  latest_attempt: ChargeAttemptSchema.nullable().optional(),
});
export type ConfirmResult = z.infer<typeof ConfirmResultSchema>;

export const ConfirmedPaymentSchema = z.looseObject({ payment: PaymentSchema, confirmResult: ConfirmResultSchema });
export type ConfirmedPayment = z.infer<typeof ConfirmedPaymentSchema>;

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
export type TimelineEntry = z.infer<typeof TimelineEntrySchema>;

export const PaymentTimelineSchema = z.object({ entries: z.array(TimelineEntrySchema), has_more: z.boolean() });
export type PaymentTimeline = z.infer<typeof PaymentTimelineSchema>;

/* ---------- request parameters ---------- */

const includeFlags = {
  include_charges: z.boolean().optional(),
  include_routing_plans: z.boolean().optional(),
  include_events: z.boolean().optional(),
  include_customer: z.boolean().optional(),
};

export const CreatePaymentParamsSchema = z
  .strictObject({
    /** Minor units, integer, at least 10. Omit when `price_id` sets the amount. */
    amount: z.number().int().min(10, "must be at least 10 (minor units, 10 = 0.10)").optional(),
    currency: CurrencySchema.optional(),
    customer_id: IdSchema.optional(),
    product_id: IdSchema.optional(),
    price_id: IdSchema.optional(),
    auto_capture: z.boolean().optional(),
    secure_mode: z.union([z.literal("auto"), z.boolean()]).optional(),
    installments: z.number().int().min(1).max(64).optional(),
    metadata: MetadataSchema.optional(),
    /** Owning account; defaults to the account of the API key. */
    account_id: IdSchema.optional(),
  })
  .refine((p) => !(p.auto_capture === false && (p.installments ?? 0) > 0), {
    path: ["auto_capture"],
    message: "auto_capture must be enabled for installment payments",
  });
export type CreatePaymentParams = z.input<typeof CreatePaymentParamsSchema>;

export const RetrievePaymentParamsSchema = z.strictObject({ account_id: IdSchema.optional(), ...includeFlags });
export type RetrievePaymentParams = z.input<typeof RetrievePaymentParamsSchema>;

export const ListPaymentsParamsSchema = PageParamsSchema.extend({
  account_id: IdSchema.optional(),
  customer_id: IdSchema.optional(),
  product_id: IdSchema.optional(),
  ...includeFlags,
});
export type ListPaymentsParams = z.input<typeof ListPaymentsParamsSchema>;

export const CardSchema = z.strictObject({
  name: z.string().min(1),
  pan: z.string().regex(/^\d{12,19}$/, "must be 12 to 19 digits without spaces"),
  month: z.string().regex(/^(0?[1-9]|1[0-2])$/, "must be 1 to 12"),
  year: z.string().regex(/^(\d{2}|\d{4})$/, "must be 2 or 4 digits"),
  cvv: z.string().regex(/^\d{3,4}$/, "must be 3 or 4 digits"),
});
export type Card = z.infer<typeof CardSchema>;

export const PaymentMethodInputSchema = z.union([
  z.strictObject({ type: z.literal("card"), data: CardSchema, save: z.boolean().optional() }),
  z.strictObject({ id: IdSchema }),
]);
export type PaymentMethodInput = z.input<typeof PaymentMethodInputSchema>;

/** One explicit id, or at least two ids (autopilot candidate set). */
const providerValue = z.union([IdSchema, z.array(IdSchema).min(2)]);

export const RoutingStrategySchema = z.union([
  z.strictObject({ payment_provider_config_id: providerValue }),
  z.strictObject({ provider_identifier: providerValue }),
]);
export type RoutingStrategy = z.input<typeof RoutingStrategySchema>;

export const PayerIdentitySchema = z.strictObject({
  ip_address: z.string().nullable().optional(),
  user_agent: z.string().nullable().optional(),
  ip_address_details: z.record(z.string(), z.unknown()).nullable().optional(),
});
export type PayerIdentity = z.input<typeof PayerIdentitySchema>;

export const ConfirmPaymentParamsSchema = z.strictObject({
  payment_method: PaymentMethodInputSchema,
  routing_strategy: RoutingStrategySchema.optional(),
  payer_identity: PayerIdentitySchema.optional(),
});
export type ConfirmPaymentParams = z.input<typeof ConfirmPaymentParamsSchema>;

export const RefundPaymentParamsSchema = z.strictObject({
  reason: RefundReasonSchema.optional(),
  reason_other: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type RefundPaymentParams = z.input<typeof RefundPaymentParamsSchema>;

export const PaymentTimelineParamsSchema = z.strictObject({
  limit: z.number().int().min(1).max(100).optional(),
  starting_after: IdSchema.optional(),
});
export type PaymentTimelineParams = z.input<typeof PaymentTimelineParamsSchema>;
