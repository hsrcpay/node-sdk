import { z } from "zod";
import { CurrencySchema, IdSchema, InstantSchema, PageParamsSchema } from "../../core/schemas";

export const RefundReason = {
  DEFAULT: "DEFAULT",
  CUSTOMER_REQUEST: "CUSTOMER_REQUEST",
  RESTOCK: "RESTOCK",
  FRAUD: "FRAUD",
  OTHER: "OTHER",
} as const;
export const RefundReasonSchema = z.enum(RefundReason);
export type RefundReason = z.infer<typeof RefundReasonSchema>;

export const RefundSchema = z.looseObject({
  object: z.literal("refund"),
  id: z.string(),
  charge_id: z.string(),
  status: z.string(),
  reason: z.string(),
  reason_other: z.string().nullable(),
  metadata: z.unknown(),
  amount: z.number(),
  currency: CurrencySchema,
  created_at: InstantSchema,
  updated_at: InstantSchema,
});
export type Refund = z.infer<typeof RefundSchema>;

export const ListRefundsParamsSchema = PageParamsSchema.extend({
  account_id: IdSchema.optional(),
  payment_id: IdSchema.optional(),
  charge_id: IdSchema.optional(),
});
export type ListRefundsParams = z.input<typeof ListRefundsParamsSchema>;
