/**
 * Backend request and response schemas for disputes, subscriptions and invoices, copied from the hsrcpay monorepo
 * (packages/core/{payments,billing}/src/**\/infrastructure/in/http and the use-case contracts they reuse).
 * Date and bigint fields of requests are kept as the backend types them; the SDK does not offer those fields.
 * Keep in sync with the backend.
 */
import z from "zod";
import { BACKEND_ENUMS } from "./backend-schemas";

export const BILLING_ENUMS = {
  disputeStatus: ["needs_response", "under_review", "won", "lost"],
  disputeReason: [
    "fraudulent",
    "duplicate",
    "product_not_received",
    "product_unacceptable",
    "subscription_canceled",
    "credit_not_processed",
    "unrecognized",
    "general",
  ],
  disputeOutcome: ["won", "lost"],
  subscriptionStatus: ["active", "trialing", "pending", "past_due", "unpaid", "canceled", "incomplete", "expired"],
  subscriptionItemStatus: ["active", "replaced", "canceled", "pending_activation", "scheduled"],
  dunningStatus: ["none", "active", "exhausted"],
  declineType: ["soft", "hard"],
  changeType: ["replace_item", "add_item", "remove_item", "quantity_change"],
  changeStatus: ["pending_payment", "applied", "payment_failed", "expired", "canceled", "superseded"],
  changeTiming: ["immediate", "period_end"],
  prorationBehavior: ["none", "create_prorations", "always_invoice"],
  collectionBehavior: ["auto_charge", "email", "manual"],
  invoiceStatus: ["draft", "open", "paid", "void", "expired", "uncollectible"],
  invoiceReason: [
    "manual",
    "subscription_create",
    "subscription_renewal",
    "subscription_update",
    "proration",
    "subscription_cancellation",
  ],
  lineType: ["subscription", "proration_credit", "proration_debit", "custom", "discount", "tax", "credit", "usage", "overage"],
} as const;

const currency = z.enum(BACKEND_ENUMS.currency);
const collectionBehavior = z.enum(BILLING_ENUMS.collectionBehavior);
const iso = z.string();
const minor = z.number().int();

/* ---------- disputes ---------- */

const evidenceText = z.string().trim().max(5000);
const evidenceReference = z.string().trim().max(500);
const DisputeEvidence = z.object({
  product_description: evidenceText.optional(),
  customer_name: evidenceReference.optional(),
  customer_email: evidenceReference.optional(),
  customer_communication: evidenceText.optional(),
  shipping_carrier: evidenceReference.optional(),
  shipping_tracking_number: evidenceReference.optional(),
  shipping_date: evidenceReference.optional(),
  refund_policy: evidenceText.optional(),
  cancellation_policy: evidenceText.optional(),
  uncategorized_text: evidenceText.optional(),
});

const accountQuery = z.object({ account_id: z.string().optional() });

export const DisputeListQuerySchema = z.object({
  account_id: z.string().optional(),
  status: z.enum(BILLING_ENUMS.disputeStatus).optional(),
  payment_id: z.string().optional(),
  page: z.coerce.number().positive().optional(),
  limit: z.coerce.number().positive().optional(),
});
export const DisputeAccountQuerySchema = accountQuery;
export const DisputeCreateBodySchema = z.object({
  payment_id: z.string().min(1),
  reason: z.enum(BILLING_ENUMS.disputeReason).optional(),
  amount: z.number().int().positive().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});
export const DisputeUpdateBodySchema = z.object({
  evidence: DisputeEvidence.optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  submit: z.boolean().default(false),
});
export const DisputeCloseBodySchema = z.object({ outcome: z.enum(BILLING_ENUMS.disputeOutcome) });
export const DisputeDtoSchema = z.object({
  id: z.string(),
  account_id: z.string(),
  payment_id: z.string(),
  charge_id: z.string(),
  amount: minor,
  currency,
  reason: z.enum(BILLING_ENUMS.disputeReason),
  status: z.enum(BILLING_ENUMS.disputeStatus),
  evidence: DisputeEvidence,
  evidence_due_by: iso,
  provider_reference: z.string().nullable(),
  metadata: z.record(z.string(), z.string()),
  submitted_at: iso.nullable(),
  closed_at: iso.nullable(),
  created_at: iso,
  updated_at: iso,
});

/* ---------- subscriptions ---------- */

export const SubscriptionListQuerySchema = z.object({
  account_id: z.string().optional(),
  customer_id: z.string().optional(),
  status: z.enum(BILLING_ENUMS.subscriptionStatus).optional(),
  page: z.coerce.number().positive().optional(),
  limit: z.coerce.number().positive().optional(),
});
export const SubscriptionCreateQuerySchema = accountQuery;
export const SubscriptionCreateBodySchema = z.object({
  customer_id: z.string(),
  payment_method_id: z.string().nullable().optional(),
  currency,
  items: z
    .array(
      z.object({
        price_id: z.string().min(1),
        quantity: z.number().int().min(1).default(1),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .min(1)
    .max(20),
  metadata: z.record(z.string(), z.unknown()).optional(),
  trial_period_days: z.number().int().positive().max(730).nullable().optional(),
  billing_cycle_anchor: z.date().nullable().optional(),
  collection_behavior: collectionBehavior.nullable().optional(),
  days_until_due: z.number().int().min(0).max(365).nullable().optional(),
});
export const SubscriptionUpdateBodySchema = z.object({
  subscription: z.object({
    payment_method_id: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    collection_behavior: collectionBehavior.nullable().optional(),
    days_until_due: z.number().int().min(0).max(365).nullable().optional(),
  }),
});
export const SubscriptionCancelBodySchema = z.object({
  cancel: z.object({
    cancel_at_period_end: z.boolean().default(false),
    canceled_reason: z.string().max(500).nullable().optional(),
    prorate: z.boolean().optional(),
  }),
});
export const SubscriptionChangeBodySchema = z.object({
  change_type: z.enum(BILLING_ENUMS.changeType),
  item_id: z.string().optional(),
  price_id: z.string().optional(),
  quantity: z.number().int().min(1).max(1_000_000).optional(),
  timing: z.enum(BILLING_ENUMS.changeTiming).default("immediate"),
  proration_behavior: z.enum(BILLING_ENUMS.prorationBehavior).optional(),
});
export const SubscriptionChangeCancelBodySchema = z
  .object({ canceled_reason: z.string().max(500).nullable().optional() })
  .optional();

const SubscriptionItemDto = z.object({
  id: z.string(),
  subscription_id: z.string(),
  price_id: z.string(),
  status: z.enum(BILLING_ENUMS.subscriptionItemStatus),
  quantity: z.number().default(1),
  period_start: iso,
  period_end: iso,
  replaced_by_item_id: z.string().nullable().default(null),
  replaced_at: iso.nullable(),
  canceled_at: iso.nullable(),
  canceled_reason: z.string().nullable().default(null),
  metadata: z.record(z.string(), z.unknown()).default({}),
  created_at: iso,
  updated_at: iso,
});
const DunningStateDto = z.object({
  id: z.string(),
  subscription_id: z.string(),
  status: z.enum(BILLING_ENUMS.dunningStatus),
  attempt_count: z.number().default(0),
  max_attempts: z.number().default(4),
  next_retry_at: iso.nullable(),
  last_attempt_at: iso.nullable(),
  last_failure_code: z.string().nullable().default(null),
  last_decline_type: z.enum(BILLING_ENUMS.declineType).nullable().default(null),
  invoice_id: z.string().nullable().default(null),
  last_payment_id: z.string().nullable().default(null),
  created_at: iso,
  updated_at: iso,
});
export const SubscriptionDtoSchema = z.object({
  id: z.string(),
  account_id: z.string(),
  customer_id: z.string(),
  payment_method_id: z.string().nullable().default(null),
  currency,
  status: z.enum(BILLING_ENUMS.subscriptionStatus),
  start_date: iso,
  end_date: iso.nullable(),
  trial_start_at: iso.nullable().default(null),
  trial_end_at: iso.nullable().default(null),
  billing_cycle_anchor: iso.nullable().default(null),
  collection_behavior: collectionBehavior.nullable().default(null),
  days_until_due: z.number().int().nullable().default(null),
  trial_will_end_notified_at: iso.nullable().default(null),
  renewal_reminder_sent_for: iso.nullable().default(null),
  cancel_at_period_end: z.boolean().default(false),
  canceled_at: iso.nullable(),
  canceled_reason: z.string().nullable().default(null),
  metadata: z.record(z.string(), z.unknown()).default({}),
  created_at: iso,
  updated_at: iso,
  items: z.array(SubscriptionItemDto).default([]),
  dunning_state: DunningStateDto.nullable().default(null),
});
export const SubscriptionChangeDtoSchema = z.object({
  id: z.string(),
  subscription_id: z.string(),
  change_type: z.enum(BILLING_ENUMS.changeType),
  old_item_id: z.string().nullable().default(null),
  old_price_id: z.string().nullable().default(null),
  new_price_id: z.string().nullable().default(null),
  old_quantity: z.number().nullable().default(null),
  new_quantity: z.number().nullable().default(null),
  effective_at: iso,
  expires_at: iso.nullable(),
  proration_behavior: z.enum(BILLING_ENUMS.prorationBehavior),
  proration_amount: minor,
  currency,
  invoice_id: z.string().nullable().default(null),
  status: z.enum(BILLING_ENUMS.changeStatus),
  canceled_at: iso.nullable(),
  canceled_reason: z.string().nullable().default(null),
  superseded_by_id: z.string().nullable().default(null),
  created_at: iso,
  updated_at: iso,
});
export const SubscriptionChangePreviewDtoSchema = z.object({
  subscription_id: z.string(),
  change_type: z.enum(BILLING_ENUMS.changeType),
  effective_at: iso,
  proration_behavior: z.enum(BILLING_ENUMS.prorationBehavior),
  currency,
  amount_due_now: minor,
  credit_amount: minor,
});

/* ---------- invoices ---------- */

export const InvoiceListQuerySchema = z.object({
  account_id: z.string().optional(),
  customer_id: z.string().optional(),
  status: z.enum(BILLING_ENUMS.invoiceStatus).optional(),
  page: z.coerce.number().positive().optional(),
  limit: z.coerce.number().positive().optional(),
});
export const InvoiceCreateQuerySchema = accountQuery;

const CreateInvoiceLineItemInput = z.object({
  type: z.enum(BILLING_ENUMS.lineType),
  description: z.string(),
  quantity: z.number().nullable().default(1),
  quantity_decimal: z.bigint().nullable().optional(),
  unit_amount: z.coerce.bigint().nullable().default(null),
  amount: z.coerce.bigint(),
  currency,
  subscription_id: z.string().nullable().default(null),
  subscription_item_id: z.string().nullable().default(null),
  price_id: z.string().nullable().default(null),
  period_start: z.date().nullable().default(null),
  period_end: z.date().nullable().default(null),
  meter_id: z.string().nullable().optional(),
  usage_quantity: z.bigint().nullable().optional(),
  usage_period_start: z.date().nullable().optional(),
  usage_period_end: z.date().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export const InvoiceCreateBodySchema = z.object({
  customer_id: z.string(),
  subscription_id: z.string().nullable().optional(),
  reason: z.enum(BILLING_ENUMS.invoiceReason).optional(),
  currency,
  due_at: z.date().nullable().optional(),
  description: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  lines: z.array(CreateInvoiceLineItemInput).optional(),
});
export const InvoiceUpdateBodySchema = z.object({
  invoice: z.object({
    due_at: z.date().nullable().optional(),
    description: z.string().nullable().optional(),
    collection_behavior: collectionBehavior.nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
});
export const InvoiceLineCreateBodySchema = z.object({
  type: z.enum(BILLING_ENUMS.lineType),
  description: z.string(),
  quantity: z.number().optional(),
  unit_amount: z.coerce.bigint().nullable().optional(),
  amount: z.coerce.bigint(),
  currency,
  subscription_id: z.string().nullable().optional(),
  subscription_item_id: z.string().nullable().optional(),
  price_id: z.string().nullable().optional(),
  period_start: z.date().nullable().optional(),
  period_end: z.date().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export const InvoiceLineUpdateBodySchema = z.object({
  line: CreateInvoiceLineItemInput.partial().pick({
    type: true,
    description: true,
    quantity: true,
    quantity_decimal: true,
    unit_amount: true,
    amount: true,
    currency: true,
    subscription_id: true,
    subscription_item_id: true,
    price_id: true,
    period_start: true,
    period_end: true,
    meter_id: true,
    usage_quantity: true,
    usage_period_start: true,
    usage_period_end: true,
    metadata: true,
  }),
});

export const InvoiceLineDtoSchema = z.object({
  id: z.string(),
  invoice_id: z.string(),
  type: z.enum(BILLING_ENUMS.lineType),
  description: z.string(),
  quantity: z.number().nullable().default(1),
  quantity_decimal: z.string().nullable(),
  unit_amount: minor.nullable(),
  amount: minor,
  currency,
  subscription_id: z.string().nullable().default(null),
  subscription_item_id: z.string().nullable().default(null),
  price_id: z.string().nullable().default(null),
  period_start: iso.nullable(),
  period_end: iso.nullable(),
  meter_id: z.string().nullable().default(null),
  usage_quantity: z.number().nullable(),
  usage_period_start: iso.nullable().default(null),
  usage_period_end: iso.nullable().default(null),
  metadata: z.record(z.string(), z.unknown()).default({}),
  created_at: iso,
  updated_at: iso,
});
export const InvoiceDtoSchema = z.object({
  id: z.string(),
  account_id: z.string(),
  customer_id: z.string(),
  subscription_id: z.string().nullable().default(null),
  status: z.enum(BILLING_ENUMS.invoiceStatus),
  reason: z.enum(BILLING_ENUMS.invoiceReason),
  currency,
  subtotal: minor,
  tax_amount: minor,
  discount_amount: minor,
  credit_amount: minor,
  total: minor,
  amount_due: minor,
  amount_paid: minor,
  amount_remaining: minor,
  due_at: iso.nullable(),
  finalized_at: iso.nullable(),
  paid_at: iso.nullable(),
  voided_at: iso.nullable(),
  expired_at: iso.nullable(),
  public_token: z.string().nullable().default(null),
  hosted_url: z.string().nullable().default(null),
  pdf_url: z.string().nullable().default(null),
  number: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
  collection_behavior: collectionBehavior.nullable().default(null),
  overdue_at: iso.nullable().default(null),
  idempotency_key: z.string().nullable().default(null),
  customer_snapshot: z.record(z.string(), z.unknown()).nullable().default(null),
  metadata: z.record(z.string(), z.unknown()).default({}),
  created_at: iso,
  updated_at: iso,
  lines: z.array(InvoiceLineDtoSchema).default([]),
});
