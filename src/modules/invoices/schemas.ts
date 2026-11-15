import { z } from "zod";
import { CurrencySchema, IdSchema, InstantSchema, MetadataSchema, PageParamsSchema } from "../../core/schemas";
import { InvoiceCollectionBehaviorSchema } from "../subscriptions/schemas";

export const InvoiceStatus = {
  DRAFT: "draft",
  OPEN: "open",
  PAID: "paid",
  VOID: "void",
  EXPIRED: "expired",
  UNCOLLECTIBLE: "uncollectible",
} as const;
export const InvoiceStatusSchema = z.enum(InvoiceStatus);
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;

export const InvoiceReason = {
  MANUAL: "manual",
  SUBSCRIPTION_CREATE: "subscription_create",
  SUBSCRIPTION_RENEWAL: "subscription_renewal",
  SUBSCRIPTION_UPDATE: "subscription_update",
  PRORATION: "proration",
  SUBSCRIPTION_CANCELLATION: "subscription_cancellation",
} as const;
export const InvoiceReasonSchema = z.enum(InvoiceReason);
export type InvoiceReason = z.infer<typeof InvoiceReasonSchema>;

export const InvoiceLineItemType = {
  SUBSCRIPTION: "subscription",
  PRORATION_CREDIT: "proration_credit",
  PRORATION_DEBIT: "proration_debit",
  CUSTOM: "custom",
  DISCOUNT: "discount",
  TAX: "tax",
  CREDIT: "credit",
  USAGE: "usage",
  OVERAGE: "overage",
} as const;
export const InvoiceLineItemTypeSchema = z.enum(InvoiceLineItemType);
export type InvoiceLineItemType = z.infer<typeof InvoiceLineItemTypeSchema>;

/* ---------- responses ---------- */

export const InvoiceLineItemSchema = z.looseObject({
  id: z.string(),
  invoice_id: z.string(),
  type: InvoiceLineItemTypeSchema,
  description: z.string(),
  /** Whole units; null on a metered line with fractional usage (read `quantity_decimal`). */
  quantity: z.number().nullable(),
  /** Exact quantity of a metered line as a decimal string; null on licensed lines. */
  quantity_decimal: z.string().nullable(),
  /** Minor units. */
  unit_amount: z.number().nullable(),
  /** Minor units; negative on credits and discounts. */
  amount: z.number(),
  currency: CurrencySchema,
  subscription_id: z.string().nullable(),
  subscription_item_id: z.string().nullable(),
  price_id: z.string().nullable(),
  period_start: InstantSchema.nullable(),
  period_end: InstantSchema.nullable(),
  meter_id: z.string().nullable(),
  usage_quantity: z.number().nullable(),
  usage_period_start: InstantSchema.nullable(),
  usage_period_end: InstantSchema.nullable(),
  metadata: z.record(z.string(), z.unknown()),
  created_at: InstantSchema,
  updated_at: InstantSchema,
});
export type InvoiceLineItem = z.infer<typeof InvoiceLineItemSchema>;

export const InvoiceSchema = z.looseObject({
  id: z.string(),
  account_id: z.string(),
  customer_id: z.string(),
  subscription_id: z.string().nullable(),
  status: InvoiceStatusSchema,
  reason: InvoiceReasonSchema,
  currency: CurrencySchema,
  /** All amounts are minor units. */
  subtotal: z.number(),
  tax_amount: z.number(),
  discount_amount: z.number(),
  credit_amount: z.number(),
  total: z.number(),
  amount_due: z.number(),
  amount_paid: z.number(),
  amount_remaining: z.number(),
  due_at: InstantSchema.nullable(),
  finalized_at: InstantSchema.nullable(),
  paid_at: InstantSchema.nullable(),
  voided_at: InstantSchema.nullable(),
  expired_at: InstantSchema.nullable(),
  public_token: z.string().nullable(),
  hosted_url: z.string().nullable(),
  pdf_url: z.string().nullable(),
  number: z.string().nullable(),
  description: z.string().nullable(),
  collection_behavior: InvoiceCollectionBehaviorSchema.nullable(),
  overdue_at: InstantSchema.nullable(),
  idempotency_key: z.string().nullable(),
  /** Billed-to details frozen at finalize; null on a draft. */
  customer_snapshot: z.record(z.string(), z.unknown()).nullable(),
  metadata: z.record(z.string(), z.unknown()),
  created_at: InstantSchema,
  updated_at: InstantSchema,
  lines: z.array(InvoiceLineItemSchema),
});
export type Invoice = z.infer<typeof InvoiceSchema>;

/* ---------- request parameters ---------- */

/**
 * Line item given by hand. The API turns amounts into bigints, so send integers in minor units. Date and bigint-only
 * fields of the API schema (`period_*`, `quantity_decimal`, `usage_*`, `meter_id`) are not offered: a JSON body
 * cannot carry them. The platform-generated line types are refused by the API with 400
 * `system_line_type_not_allowed`.
 */
export const InvoiceLineItemParamsSchema = z.strictObject({
  type: InvoiceLineItemTypeSchema,
  description: z.string(),
  quantity: z.number().nullable().optional(),
  unit_amount: z.number().int().nullable().optional(),
  amount: z.number().int(),
  currency: CurrencySchema,
  subscription_id: IdSchema.nullable().optional(),
  subscription_item_id: IdSchema.nullable().optional(),
  price_id: IdSchema.nullable().optional(),
  metadata: MetadataSchema.optional(),
});
export type InvoiceLineItemParams = z.input<typeof InvoiceLineItemParamsSchema>;

/** `due_at` is not offered: the API schema types it as a date object, which a JSON body cannot carry. */
export const CreateInvoiceParamsSchema = z.strictObject({
  /** Query `account_id`. Omit with an API key (it is the key's account). */
  account_id: IdSchema.optional(),
  customer_id: IdSchema,
  subscription_id: IdSchema.nullable().optional(),
  /** Defaults to `manual`. */
  reason: InvoiceReasonSchema.optional(),
  currency: CurrencySchema,
  description: z.string().nullable().optional(),
  metadata: MetadataSchema.optional(),
  lines: z.array(InvoiceLineItemParamsSchema).optional(),
});
export type CreateInvoiceParams = z.input<typeof CreateInvoiceParamsSchema>;

export const ListInvoicesParamsSchema = PageParamsSchema.extend({
  /** Omit with an API key. */
  account_id: IdSchema.optional(),
  customer_id: IdSchema.optional(),
  status: InvoiceStatusSchema.optional(),
});
export type ListInvoicesParams = z.input<typeof ListInvoicesParamsSchema>;

/** Only a draft can be updated. */
export const UpdateInvoiceParamsSchema = z.strictObject({
  description: z.string().nullable().optional(),
  collection_behavior: InvoiceCollectionBehaviorSchema.nullable().optional(),
  metadata: MetadataSchema.optional(),
});
export type UpdateInvoiceParams = z.input<typeof UpdateInvoiceParamsSchema>;

export const UpdateInvoiceLineItemParamsSchema = InvoiceLineItemParamsSchema.partial();
export type UpdateInvoiceLineItemParams = z.input<typeof UpdateInvoiceLineItemParamsSchema>;
