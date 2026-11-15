import { z } from "zod";
import { CurrencySchema, IdSchema, InstantSchema, PageParamsSchema } from "../../core/schemas";

export const DisputeStatus = {
  NEEDS_RESPONSE: "needs_response",
  UNDER_REVIEW: "under_review",
  WON: "won",
  LOST: "lost",
} as const;
export const DisputeStatusSchema = z.enum(DisputeStatus);
export type DisputeStatus = z.infer<typeof DisputeStatusSchema>;

export const DisputeReason = {
  FRAUDULENT: "fraudulent",
  DUPLICATE: "duplicate",
  PRODUCT_NOT_RECEIVED: "product_not_received",
  PRODUCT_UNACCEPTABLE: "product_unacceptable",
  SUBSCRIPTION_CANCELED: "subscription_canceled",
  CREDIT_NOT_PROCESSED: "credit_not_processed",
  UNRECOGNIZED: "unrecognized",
  GENERAL: "general",
} as const;
export const DisputeReasonSchema = z.enum(DisputeReason);
export type DisputeReason = z.infer<typeof DisputeReasonSchema>;

/** Decision played on a test dispute. */
export const DisputeOutcome = { WON: "won", LOST: "lost" } as const;
export const DisputeOutcomeSchema = z.enum(DisputeOutcome);
export type DisputeOutcome = z.infer<typeof DisputeOutcomeSchema>;

/** Upper bound of each free-text evidence field. */
export const DISPUTE_EVIDENCE_TEXT_MAX = 5000;
/** Upper bound of each evidence reference (tracking number, date, name). */
export const DISPUTE_EVIDENCE_REFERENCE_MAX = 500;

const evidenceText = z.string().trim().max(DISPUTE_EVIDENCE_TEXT_MAX);
const evidenceReference = z.string().trim().max(DISPUTE_EVIDENCE_REFERENCE_MAX);

/** Merchant answer to a dispute. Every field is optional; an empty string clears a saved field. */
export const DisputeEvidenceParamsSchema = z.strictObject({
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
export type DisputeEvidenceParams = z.input<typeof DisputeEvidenceParamsSchema>;

/* ---------- responses ---------- */

export const DisputeEvidenceSchema = z.looseObject({
  product_description: z.string().optional(),
  customer_name: z.string().optional(),
  customer_email: z.string().optional(),
  customer_communication: z.string().optional(),
  shipping_carrier: z.string().optional(),
  shipping_tracking_number: z.string().optional(),
  shipping_date: z.string().optional(),
  refund_policy: z.string().optional(),
  cancellation_policy: z.string().optional(),
  uncategorized_text: z.string().optional(),
});
export type DisputeEvidence = z.infer<typeof DisputeEvidenceSchema>;

export const DisputeSchema = z.looseObject({
  id: z.string(),
  account_id: z.string(),
  payment_id: z.string(),
  charge_id: z.string(),
  /** Minor units. */
  amount: z.number().int(),
  currency: CurrencySchema,
  reason: DisputeReasonSchema,
  status: DisputeStatusSchema,
  evidence: DisputeEvidenceSchema,
  /** The merchant must respond before this instant. */
  evidence_due_by: InstantSchema,
  provider_reference: z.string().nullable(),
  metadata: z.record(z.string(), z.string()),
  submitted_at: InstantSchema.nullable(),
  closed_at: InstantSchema.nullable(),
  created_at: InstantSchema,
  updated_at: InstantSchema,
});
export type Dispute = z.infer<typeof DisputeSchema>;

/* ---------- request parameters ---------- */

const DisputeMetadataSchema = z.record(z.string(), z.string());

export const ListDisputesParamsSchema = PageParamsSchema.extend({
  /** Omit with an API key (it is the key's account). */
  account_id: IdSchema.optional(),
  status: DisputeStatusSchema.optional(),
  payment_id: IdSchema.optional(),
});
export type ListDisputesParams = z.input<typeof ListDisputesParamsSchema>;

/** Id-based calls take the account from the dispute; the optional `account_id` only narrows it, as on the API. */
export const DisputeAccountParamsSchema = z.strictObject({ account_id: IdSchema.optional() });
export type DisputeAccountParams = z.input<typeof DisputeAccountParamsSchema>;

export const UpdateDisputeParamsSchema = z.strictObject({
  account_id: IdSchema.optional(),
  evidence: DisputeEvidenceParamsSchema.optional(),
  metadata: DisputeMetadataSchema.optional(),
  /** Sends the evidence to the issuer: the dispute moves to `under_review` and the evidence locks. */
  submit: z.boolean().optional(),
});
export type UpdateDisputeParams = z.input<typeof UpdateDisputeParamsSchema>;

/** Test mode only (a live key gets 403 `dispute_test_mode_only`). */
export const CreateTestDisputeParamsSchema = z.strictObject({
  account_id: IdSchema.optional(),
  payment_id: IdSchema,
  reason: DisputeReasonSchema.optional(),
  /** Minor units; defaults to the captured amount still held on the payment. */
  amount: z.number().int().positive().optional(),
  metadata: DisputeMetadataSchema.optional(),
});
export type CreateTestDisputeParams = z.input<typeof CreateTestDisputeParamsSchema>;

/** Test mode only. */
export const CloseTestDisputeParamsSchema = z.strictObject({
  account_id: IdSchema.optional(),
  outcome: DisputeOutcomeSchema,
});
export type CloseTestDisputeParams = z.input<typeof CloseTestDisputeParamsSchema>;
