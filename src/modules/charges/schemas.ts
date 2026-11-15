import { z } from "zod";
import { CurrencySchema, IdSchema, InstantSchema, PageParamsSchema } from "../../core/schemas";

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
export const ChargeStatusSchema = z.enum(ChargeStatus);
export type ChargeStatus = z.infer<typeof ChargeStatusSchema>;

/** Outcome summary of one provider attempt. */
export const ChargeAttemptSchema = z.object({
  charge_id: z.string(),
  attempt_no: z.number().nullable(),
  attempt_reason: z.string(),
  secure_mode: z.boolean(),
  three_ds_status: z.string().nullable(),
  /** hard | soft | provider_error | indeterminate; null when the attempt did not fail. */
  decline_class: z.string().nullable(),
  decline_code: z.string().nullable(),
  provider_decline_code: z.string().nullable(),
  /** True when another confirm can make sense (soft declines and provider errors). */
  retryable: z.boolean(),
});
export type ChargeAttempt = z.infer<typeof ChargeAttemptSchema>;

export const ChargeSchema = z.looseObject({
  object: z.literal("charge"),
  id: z.string(),
  payment_id: z.string().nullable(),
  payment_method_id: z.string().nullable(),
  customer_id: z.string().nullable(),
  account_id: z.string().nullable(),
  product_id: z.string().nullable(),
  price_id: z.string().nullable(),
  status: ChargeStatusSchema,
  amount: z.number(),
  authorized_amount: z.number(),
  captured_amount: z.number(),
  refunded_amount: z.number(),
  currency: CurrencySchema,
  installments: z.number(),
  created_at: InstantSchema,
  updated_at: InstantSchema,
});
export type Charge = z.infer<typeof ChargeSchema>;

export const ListChargesParamsSchema = PageParamsSchema.extend({ account_id: IdSchema.optional() });
export type ListChargesParams = z.input<typeof ListChargesParamsSchema>;

export const RetrieveChargeParamsSchema = z.strictObject({ include_attempt_details: z.boolean().optional() });
export type RetrieveChargeParams = z.input<typeof RetrieveChargeParamsSchema>;
