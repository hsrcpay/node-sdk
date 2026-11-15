import { z } from "zod";
import { CurrencySchema, IdSchema, InstantSchema, MetadataSchema, PageParamsSchema } from "../../core/schemas";

export const SubscriptionStatus = {
  ACTIVE: "active",
  TRIALING: "trialing",
  PENDING: "pending",
  PAST_DUE: "past_due",
  /** Dunning ended: service suspended, no new invoices until the open one is paid. */
  UNPAID: "unpaid",
  CANCELED: "canceled",
  INCOMPLETE: "incomplete",
  EXPIRED: "expired",
} as const;
export const SubscriptionStatusSchema = z.enum(SubscriptionStatus);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const SubscriptionItemStatus = {
  ACTIVE: "active",
  REPLACED: "replaced",
  CANCELED: "canceled",
  PENDING_ACTIVATION: "pending_activation",
  SCHEDULED: "scheduled",
} as const;
export const SubscriptionItemStatusSchema = z.enum(SubscriptionItemStatus);
export type SubscriptionItemStatus = z.infer<typeof SubscriptionItemStatusSchema>;

export const DunningStatus = { NONE: "none", ACTIVE: "active", EXHAUSTED: "exhausted" } as const;
export const DunningStatusSchema = z.enum(DunningStatus);
export type DunningStatus = z.infer<typeof DunningStatusSchema>;

export const PaymentDeclineType = { SOFT: "soft", HARD: "hard" } as const;
export const PaymentDeclineTypeSchema = z.enum(PaymentDeclineType);
export type PaymentDeclineType = z.infer<typeof PaymentDeclineTypeSchema>;

/** How an invoice is collected. Shared by subscriptions and invoices. */
export const InvoiceCollectionBehavior = { AUTO_CHARGE: "auto_charge", EMAIL: "email", MANUAL: "manual" } as const;
export const InvoiceCollectionBehaviorSchema = z.enum(InvoiceCollectionBehavior);
export type InvoiceCollectionBehavior = z.infer<typeof InvoiceCollectionBehaviorSchema>;

export const SubscriptionChangeType = {
  REPLACE_ITEM: "replace_item",
  ADD_ITEM: "add_item",
  REMOVE_ITEM: "remove_item",
  QUANTITY_CHANGE: "quantity_change",
} as const;
export const SubscriptionChangeTypeSchema = z.enum(SubscriptionChangeType);
export type SubscriptionChangeType = z.infer<typeof SubscriptionChangeTypeSchema>;

export const SubscriptionChangeStatus = {
  PENDING_PAYMENT: "pending_payment",
  APPLIED: "applied",
  PAYMENT_FAILED: "payment_failed",
  EXPIRED: "expired",
  CANCELED: "canceled",
  SUPERSEDED: "superseded",
} as const;
export const SubscriptionChangeStatusSchema = z.enum(SubscriptionChangeStatus);
export type SubscriptionChangeStatus = z.infer<typeof SubscriptionChangeStatusSchema>;

/** When a plan or quantity change takes effect. */
export const SubscriptionChangeTiming = { IMMEDIATE: "immediate", PERIOD_END: "period_end" } as const;
export const SubscriptionChangeTimingSchema = z.enum(SubscriptionChangeTiming);
export type SubscriptionChangeTiming = z.infer<typeof SubscriptionChangeTimingSchema>;

export const ProrationBehavior = {
  NONE: "none",
  CREATE_PRORATIONS: "create_prorations",
  ALWAYS_INVOICE: "always_invoice",
} as const;
export const ProrationBehaviorSchema = z.enum(ProrationBehavior);
export type ProrationBehavior = z.infer<typeof ProrationBehaviorSchema>;

/* ---------- responses ---------- */

export const SubscriptionItemSchema = z.looseObject({
  id: z.string(),
  subscription_id: z.string(),
  price_id: z.string(),
  status: SubscriptionItemStatusSchema,
  quantity: z.number(),
  period_start: InstantSchema,
  period_end: InstantSchema,
  replaced_by_item_id: z.string().nullable(),
  replaced_at: InstantSchema.nullable(),
  canceled_at: InstantSchema.nullable(),
  canceled_reason: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  created_at: InstantSchema,
  updated_at: InstantSchema,
});
export type SubscriptionItem = z.infer<typeof SubscriptionItemSchema>;

export const SubscriptionDunningStateSchema = z.looseObject({
  id: z.string(),
  subscription_id: z.string(),
  status: DunningStatusSchema,
  attempt_count: z.number(),
  max_attempts: z.number(),
  next_retry_at: InstantSchema.nullable(),
  last_attempt_at: InstantSchema.nullable(),
  last_failure_code: z.string().nullable(),
  last_decline_type: PaymentDeclineTypeSchema.nullable(),
  invoice_id: z.string().nullable(),
  last_payment_id: z.string().nullable(),
  created_at: InstantSchema,
  updated_at: InstantSchema,
});
export type SubscriptionDunningState = z.infer<typeof SubscriptionDunningStateSchema>;

export const SubscriptionSchema = z.looseObject({
  id: z.string(),
  account_id: z.string(),
  customer_id: z.string(),
  payment_method_id: z.string().nullable(),
  currency: CurrencySchema,
  status: SubscriptionStatusSchema,
  start_date: InstantSchema,
  end_date: InstantSchema.nullable(),
  trial_start_at: InstantSchema.nullable(),
  trial_end_at: InstantSchema.nullable(),
  billing_cycle_anchor: InstantSchema.nullable(),
  collection_behavior: InvoiceCollectionBehaviorSchema.nullable(),
  days_until_due: z.number().int().nullable(),
  trial_will_end_notified_at: InstantSchema.nullable(),
  renewal_reminder_sent_for: InstantSchema.nullable(),
  cancel_at_period_end: z.boolean(),
  canceled_at: InstantSchema.nullable(),
  canceled_reason: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  created_at: InstantSchema,
  updated_at: InstantSchema,
  items: z.array(SubscriptionItemSchema),
  dunning_state: SubscriptionDunningStateSchema.nullable(),
});
export type Subscription = z.infer<typeof SubscriptionSchema>;

export const SubscriptionChangeSchema = z.looseObject({
  id: z.string(),
  subscription_id: z.string(),
  change_type: SubscriptionChangeTypeSchema,
  old_item_id: z.string().nullable(),
  old_price_id: z.string().nullable(),
  new_price_id: z.string().nullable(),
  old_quantity: z.number().nullable(),
  new_quantity: z.number().nullable(),
  effective_at: InstantSchema,
  expires_at: InstantSchema.nullable(),
  proration_behavior: ProrationBehaviorSchema,
  /** Minor units. */
  proration_amount: z.number().int(),
  currency: CurrencySchema,
  invoice_id: z.string().nullable(),
  status: SubscriptionChangeStatusSchema,
  canceled_at: InstantSchema.nullable(),
  canceled_reason: z.string().nullable(),
  superseded_by_id: z.string().nullable(),
  created_at: InstantSchema,
  updated_at: InstantSchema,
});
export type SubscriptionChange = z.infer<typeof SubscriptionChangeSchema>;

export const SubscriptionChangePreviewSchema = z.looseObject({
  subscription_id: z.string(),
  change_type: SubscriptionChangeTypeSchema,
  effective_at: InstantSchema,
  proration_behavior: ProrationBehaviorSchema,
  currency: CurrencySchema,
  /** Minor units charged right away on a new invoice. */
  amount_due_now: z.number().int(),
  /** Minor units added to the customer's credit balance. */
  credit_amount: z.number().int(),
});
export type SubscriptionChangePreview = z.infer<typeof SubscriptionChangePreviewSchema>;

/* ---------- request parameters ---------- */

export const MAX_SUBSCRIPTION_ITEM_QUANTITY = 1_000_000;

export const SubscriptionItemParamsSchema = z.strictObject({
  price_id: IdSchema,
  /** Defaults to 1. */
  quantity: z.number().int().min(1).optional(),
  metadata: MetadataSchema.optional(),
});
export type SubscriptionItemParams = z.input<typeof SubscriptionItemParamsSchema>;

/**
 * `billing_cycle_anchor` is not offered: the API schema types it as a date object, which a JSON body cannot carry.
 */
export const CreateSubscriptionParamsSchema = z.strictObject({
  /** Query `account_id`. Omit with an API key (it is the key's account). */
  account_id: IdSchema.optional(),
  customer_id: IdSchema,
  payment_method_id: IdSchema.nullable().optional(),
  currency: CurrencySchema,
  /** One to 20 recurring items sharing one billing cadence. */
  items: z.array(SubscriptionItemParamsSchema).min(1).max(20),
  metadata: MetadataSchema.optional(),
  /** Trial length in days (1 to 730); omit for no trial. */
  trial_period_days: z.number().int().positive().max(730).nullable().optional(),
  /** Overrides the account's default collection behavior for this subscription's invoices. */
  collection_behavior: InvoiceCollectionBehaviorSchema.nullable().optional(),
  days_until_due: z.number().int().min(0).max(365).nullable().optional(),
});
export type CreateSubscriptionParams = z.input<typeof CreateSubscriptionParamsSchema>;

export const ListSubscriptionsParamsSchema = PageParamsSchema.extend({
  /** Omit with an API key. */
  account_id: IdSchema.optional(),
  customer_id: IdSchema.optional(),
  status: SubscriptionStatusSchema.optional(),
});
export type ListSubscriptionsParams = z.input<typeof ListSubscriptionsParamsSchema>;

export const UpdateSubscriptionParamsSchema = z.strictObject({
  /** Changing it while in dunning schedules an immediate retry with the new method. */
  payment_method_id: IdSchema.nullable().optional(),
  metadata: MetadataSchema.optional(),
  collection_behavior: InvoiceCollectionBehaviorSchema.nullable().optional(),
  days_until_due: z.number().int().min(0).max(365).nullable().optional(),
});
export type UpdateSubscriptionParams = z.input<typeof UpdateSubscriptionParamsSchema>;

export const CancelSubscriptionParamsSchema = z
  .strictObject({
    /** Flag it and let the period-end job end it. Default: cancel immediately. */
    cancel_at_period_end: z.boolean().optional(),
    canceled_reason: z.string().max(500).nullable().optional(),
    /** Immediate cancel only: credit the customer for the unused part of the paid period. */
    prorate: z.boolean().optional(),
  })
  .refine((value) => !(value.cancel_at_period_end && value.prorate), {
    message: "prorate is only supported for immediate cancellation",
    path: ["prorate"],
  });
export type CancelSubscriptionParams = z.input<typeof CancelSubscriptionParamsSchema>;

export const SubscriptionChangeParamsSchema = z.strictObject({
  change_type: SubscriptionChangeTypeSchema,
  /** The item being replaced, removed or re-quantified. */
  item_id: IdSchema.optional(),
  /** The new price (add or replace). */
  price_id: IdSchema.optional(),
  /** Defaults to 1 on add and to the current quantity on replace. */
  quantity: z.number().int().min(1).max(MAX_SUBSCRIPTION_ITEM_QUANTITY).optional(),
  /** Defaults to `immediate`. */
  timing: SubscriptionChangeTimingSchema.optional(),
  /** Defaults to the account's billing settings. Ignored for period-end changes and during a trial. */
  proration_behavior: ProrationBehaviorSchema.optional(),
});
export type SubscriptionChangeParams = z.input<typeof SubscriptionChangeParamsSchema>;

export const CancelSubscriptionChangeParamsSchema = z.strictObject({
  canceled_reason: z.string().max(500).nullable().optional(),
});
export type CancelSubscriptionChangeParams = z.input<typeof CancelSubscriptionChangeParamsSchema>;
