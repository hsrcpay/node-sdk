import { z } from "zod";
import { CurrencySchema, IdSchema, InstantSchema, PageParamsSchema } from "../../core/schemas";

export const CheckoutSessionStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
  FAILED: "FAILED",
} as const;
export const CheckoutSessionStatusSchema = z.enum(CheckoutSessionStatus);
export type CheckoutSessionStatus = z.infer<typeof CheckoutSessionStatusSchema>;

export const AmountMode = { FIXED: "FIXED", CUSTOMER_INPUT: "CUSTOMER_INPUT", LINE_ITEMS: "LINE_ITEMS" } as const;
export const AmountModeSchema = z.enum(AmountMode);
export type AmountMode = z.infer<typeof AmountModeSchema>;

export const CollectAddress = { NONE: "NONE", BILLING: "BILLING", BOTH: "BOTH" } as const;
export const CollectAddressSchema = z.enum(CollectAddress);
export type CollectAddress = z.infer<typeof CollectAddressSchema>;

export const AfterCompletionType = { HOSTED_PAGE: "HOSTED_PAGE", MESSAGE: "MESSAGE", REDIRECT: "REDIRECT" } as const;
export const AfterCompletionTypeSchema = z.enum(AfterCompletionType);
export type AfterCompletionType = z.infer<typeof AfterCompletionTypeSchema>;

export const LineItemSourceType = { CUSTOM: "CUSTOM", PRODUCT_PRICE: "PRODUCT_PRICE" } as const;
export const LineItemSourceTypeSchema = z.enum(LineItemSourceType);
export type LineItemSourceType = z.infer<typeof LineItemSourceTypeSchema>;

/* ---------- responses ---------- */

export const CheckoutSessionLineItemSchema = z.looseObject({
  object: z.literal("checkout_session_line_item"),
  id: z.string(),
  checkout_session_id: z.string(),
  source_type: LineItemSourceTypeSchema,
  product_id: z.string().nullable().optional(),
  price_id: z.string().nullable().optional(),
  name: z.string(),
  description: z.string().nullable().optional(),
  unit_amount: z.number(),
  currency: CurrencySchema,
  quantity: z.number(),
  subtotal: z.number(),
  display_order: z.number().optional(),
  created_at: InstantSchema,
  /** Display snapshot of the catalog product and price on hosted-checkout reads; null for custom lines. */
  catalog: z.unknown().optional(),
});
export type CheckoutSessionLineItem = z.infer<typeof CheckoutSessionLineItemSchema>;

export const CheckoutSessionSchema = z.looseObject({
  object: z.literal("checkout_session"),
  id: z.string(),
  account_id: z.string(),
  payment_link_id: z.string().nullable().optional(),
  business_logo_url: z.string().nullable().optional(),
  business_name: z.string().nullable().optional(),
  status: CheckoutSessionStatusSchema,
  currency: CurrencySchema,
  /** Public token of the hosted checkout; pass it to the publishable-key methods. */
  token: z.string(),
  amount_mode: AmountModeSchema,
  fixed_amount: z.number().nullable().optional(),
  customer_input_min: z.number().nullable().optional(),
  customer_input_max: z.number().nullable().optional(),
  customer_input_preset: z.number().nullable().optional(),
  customer_entered_amount: z.number().nullable().optional(),
  final_amount: z.number().nullable().optional(),
  collect_address: CollectAddressSchema,
  collect_name: z.boolean(),
  collect_phone: z.boolean(),
  after_completion_type: AfterCompletionTypeSchema,
  after_completion_url: z.string().nullable().optional(),
  after_completion_message: z.string().nullable().optional(),
  custom_fields_schema: z.unknown().optional(),
  custom_fields_values: z.unknown().optional(),
  payer_name: z.string().nullable().optional(),
  payer_email: z.string().nullable().optional(),
  payer_phone: z.string().nullable().optional(),
  payer_ip_address: z.string().nullable().optional(),
  payer_user_agent: z.string().nullable().optional(),
  payer_locale: z.string().nullable().optional(),
  billing_address: z.record(z.string(), z.unknown()).nullable().optional(),
  shipping_address: z.record(z.string(), z.unknown()).nullable().optional(),
  customer_id: z.string().nullable().optional(),
  payment_id: z.string().nullable().optional(),
  expires_at: InstantSchema.nullable().optional(),
  completed_at: InstantSchema.nullable().optional(),
  cancelled_at: InstantSchema.nullable().optional(),
  created_at: InstantSchema,
  updated_at: InstantSchema,
  metadata: z.record(z.string(), z.unknown()),
  line_items: z.array(CheckoutSessionLineItemSchema).optional(),
  sandbox_mode: z.boolean().optional(),
});
export type CheckoutSession = z.infer<typeof CheckoutSessionSchema>;

/** `payment` is the freshly created (or reused) payment; confirm it with `payments.confirm`. */
export const PreparedCheckoutSchema = z.looseObject({
  checkout_session: CheckoutSessionSchema,
  payment: z.looseObject({ id: z.string() }),
});
export type PreparedCheckout = z.infer<typeof PreparedCheckoutSchema>;

/* ---------- request parameters (secret key) ---------- */

export const CreateCheckoutSessionParamsSchema = z
  .strictObject({
    /** Query `account_id`. Omit with an API key (it is the key's account). */
    account_id: IdSchema.optional(),
    customer_id: IdSchema.optional(),
    /** Required unless `line_items` is given. */
    amount: z.number().positive().optional(),
    currency: CurrencySchema,
    /** Hosted page URL the payer opens. Required unless `line_items` is given. */
    url: z.url().optional(),
    /** Catalog prices to sell. The total is their sum; a paid recurring price becomes a subscription. */
    line_items: z
      .array(z.strictObject({ price_id: IdSchema, quantity: z.number().int().min(1).optional() }))
      .min(1)
      .optional(),
    success_url: z.url().optional(),
    cancel_url: z.url().optional(),
    return_url: z.url().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    /** ISO-8601 string or a Date. */
    expires_at: z.union([z.iso.datetime(), z.date().transform((date) => date.toISOString())]).optional(),
  })
  .refine((p) => p.line_items !== undefined || (p.amount !== undefined && p.url !== undefined), {
    path: ["line_items"],
    message: "provide line_items, or both amount and url",
  });
export type CreateCheckoutSessionParams = z.input<typeof CreateCheckoutSessionParamsSchema>;

export const ListCheckoutSessionsParamsSchema = PageParamsSchema.extend({ account_id: IdSchema.optional() });
export type ListCheckoutSessionsParams = z.input<typeof ListCheckoutSessionsParamsSchema>;

export const UpdateCheckoutSessionParamsSchema = z.strictObject({
  status: CheckoutSessionStatusSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type UpdateCheckoutSessionParams = z.input<typeof UpdateCheckoutSessionParamsSchema>;

/** Both fields are required: the search is always scoped to one account. */
export const SearchCheckoutSessionsParamsSchema = z.strictObject({ q: z.string(), account_id: IdSchema });
export type SearchCheckoutSessionsParams = z.input<typeof SearchCheckoutSessionsParamsSchema>;

/* ---------- request parameters (publishable key) ---------- */

/** Amount in minor units, for sessions whose `amount_mode` is `CUSTOMER_INPUT` and within the session bounds. */
export const UpdateCheckoutAmountParamsSchema = z.strictObject({ amount: z.number().int().positive() });
export type UpdateCheckoutAmountParams = z.input<typeof UpdateCheckoutAmountParamsSchema>;

export const PrepareCheckoutParamsSchema = z.strictObject({
  payer: z
    .strictObject({
      name: z.string().optional(),
      email: z.email().optional(),
      phone: z.string().optional(),
      locale: z.string().optional(),
      billing_address: z.record(z.string(), z.unknown()).nullable().optional(),
      shipping_address: z.record(z.string(), z.unknown()).nullable().optional(),
      custom_fields_values: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
});
export type PrepareCheckoutParams = z.input<typeof PrepareCheckoutParamsSchema>;
