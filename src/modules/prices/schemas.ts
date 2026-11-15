import { z } from "zod";
import { CurrencySchema, IdSchema, InstantSchema, PageParamsSchema } from "../../core/schemas";

export const PriceStatus = { ACTIVE: "active", INACTIVE: "inactive", ARCHIVED: "archived" } as const;
export const PriceStatusSchema = z.enum(PriceStatus);
export type PriceStatus = z.infer<typeof PriceStatusSchema>;

export const PriceType = { RECURRING: "recurring", ONE_TIME: "one_time" } as const;
export const PriceTypeSchema = z.enum(PriceType);
export type PriceType = z.infer<typeof PriceTypeSchema>;

export const PriceInterval = { DAY: "day", WEEK: "week", MONTH: "month", YEAR: "year" } as const;
export const PriceIntervalSchema = z.enum(PriceInterval);
export type PriceInterval = z.infer<typeof PriceIntervalSchema>;

export const TaxBehavior = { INCLUDE: "include", EXCLUDE: "exclude", UNSPECIFIED: "unspecified" } as const;
export const TaxBehaviorSchema = z.enum(TaxBehavior);
export type TaxBehavior = z.infer<typeof TaxBehaviorSchema>;

export const PriceBillingScheme = { PER_UNIT: "per_unit", TIERED: "tiered" } as const;
export const PriceBillingSchemeSchema = z.enum(PriceBillingScheme);
export type PriceBillingScheme = z.infer<typeof PriceBillingSchemeSchema>;

export const PriceUsageType = { LICENSED: "licensed", METERED: "metered" } as const;
export const PriceUsageTypeSchema = z.enum(PriceUsageType);
export type PriceUsageType = z.infer<typeof PriceUsageTypeSchema>;

/** graduated: each unit is priced by the tier it falls into. volume: the tier reached by the total prices every unit. */
export const PriceTiersMode = { GRADUATED: "graduated", VOLUME: "volume" } as const;
export const PriceTiersModeSchema = z.enum(PriceTiersMode);
export type PriceTiersMode = z.infer<typeof PriceTiersModeSchema>;

export const PriceTransformQuantityRound = { UP: "up", DOWN: "down" } as const;
export const PriceTransformQuantityRoundSchema = z.enum(PriceTransformQuantityRound);
export type PriceTransformQuantityRound = z.infer<typeof PriceTransformQuantityRoundSchema>;

export const MAX_CATALOG_METADATA_KEYS = 50;
export const MAX_CATALOG_METADATA_KEY_LENGTH = 40;
export const MAX_CATALOG_METADATA_VALUE_LENGTH = 500;

/** Flat scalars only: up to 50 keys, keys up to 40 and string values up to 500 characters. */
export const CatalogMetadataSchema = z
  .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
  .superRefine((value, ctx) => {
    const entries = Object.entries(value);
    if (entries.length > MAX_CATALOG_METADATA_KEYS) {
      ctx.addIssue({ code: "custom", message: `must not exceed ${MAX_CATALOG_METADATA_KEYS} keys` });
    }
    for (const [key, item] of entries) {
      if (key.length > MAX_CATALOG_METADATA_KEY_LENGTH) {
        ctx.addIssue({ code: "custom", path: [key], message: `key must not exceed ${MAX_CATALOG_METADATA_KEY_LENGTH} characters` });
      }
      if (typeof item === "string" && item.length > MAX_CATALOG_METADATA_VALUE_LENGTH) {
        ctx.addIssue({ code: "custom", path: [key], message: `value must not exceed ${MAX_CATALOG_METADATA_VALUE_LENGTH} characters` });
      }
    }
  });
export type CatalogMetadata = z.infer<typeof CatalogMetadataSchema>;

/* ---------- responses ---------- */

export const PriceTierSchema = z.object({
  /** Upper bound of the tier; null for the last tier. */
  up_to: z.number().nullable(),
  unit_amount: z.number().nullable(),
  flat_amount: z.number().nullable(),
});
export type PriceTier = z.infer<typeof PriceTierSchema>;

export const PriceRecurringSchema = z.object({
  interval: PriceIntervalSchema,
  interval_count: z.number(),
  usage_type: PriceUsageTypeSchema,
  trial_period_days: z.number().nullable(),
});
export type PriceRecurring = z.infer<typeof PriceRecurringSchema>;

/** Amounts are integers in minor units (cents). */
export const PriceSchema = z.looseObject({
  object: z.literal("price"),
  id: z.string(),
  product_id: z.string(),
  lookup_key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: PriceStatusSchema,
  active: z.boolean(),
  type: PriceTypeSchema,
  interval: PriceIntervalSchema.nullable(),
  interval_count: z.number(),
  recurring: PriceRecurringSchema.nullable(),
  amount: z.number(),
  currency: CurrencySchema,
  tax_behavior: TaxBehaviorSchema,
  billing_scheme: PriceBillingSchemeSchema,
  usage_type: PriceUsageTypeSchema,
  meter_id: z.string().nullable(),
  tiers_mode: PriceTiersModeSchema.nullable(),
  tiers: z.array(PriceTierSchema).nullable(),
  custom_unit_amount: z
    .object({ minimum: z.number().nullable(), maximum: z.number().nullable(), preset: z.number().nullable() })
    .nullable(),
  transform_quantity: z.object({ divide_by: z.number(), round: PriceTransformQuantityRoundSchema }).nullable(),
  trial_period_days: z.number().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  archived_at: InstantSchema.nullable(),
  created_at: InstantSchema,
  updated_at: InstantSchema,
});
export type Price = z.infer<typeof PriceSchema>;

/* ---------- request parameters ---------- */

/**
 * Wire shape of a new price. Shared by `products.prices.create` and `default_price_data` of `products.create`.
 * Structural rules (tiers, intervals, custom amounts) are enforced by the API.
 */
export const PriceDraftSchema = z.strictObject({
  /** Unique per account. Generated when omitted. */
  lookup_key: z.string().optional(),
  /** Internal nickname. Defaults to the product name. */
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  status: z.enum([PriceStatus.ACTIVE, PriceStatus.INACTIVE]).optional(),
  type: PriceTypeSchema,
  interval: PriceIntervalSchema.nullable().optional(),
  interval_count: z.number().int().optional(),
  /** Minor units. 0 for tiered or customer-chosen prices. */
  amount: z.number().int().optional(),
  currency: CurrencySchema,
  tax_behavior: TaxBehaviorSchema.optional(),
  billing_scheme: PriceBillingSchemeSchema.optional(),
  usage_type: PriceUsageTypeSchema.optional(),
  /** Required for metered usage and refused otherwise. Must be an active meter of the account. */
  meter_id: z.string().min(1).nullable().optional(),
  tiers_mode: PriceTiersModeSchema.nullable().optional(),
  tiers: z
    .array(
      z.strictObject({
        up_to: z.number().int().nullable(),
        unit_amount: z.number().int().nullable().optional(),
        flat_amount: z.number().int().nullable().optional(),
      }),
    )
    .nullable()
    .optional(),
  /** Lets the payer choose the amount (one-time prices only). */
  custom_unit_amount: z
    .strictObject({
      minimum: z.number().int().nullable().optional(),
      maximum: z.number().int().nullable().optional(),
      preset: z.number().int().nullable().optional(),
    })
    .nullable()
    .optional(),
  transform_quantity: z
    .strictObject({ divide_by: z.number().int(), round: PriceTransformQuantityRoundSchema })
    .nullable()
    .optional(),
  trial_period_days: z.number().int().nullable().optional(),
  metadata: CatalogMetadataSchema.optional(),
});
export type PriceDraft = z.input<typeof PriceDraftSchema>;

export const CreatePriceParamsSchema = PriceDraftSchema.extend({
  /** Defaults to true when the product has no default price yet. */
  set_as_default: z.boolean().optional(),
});
export type CreatePriceParams = z.input<typeof CreatePriceParamsSchema>;

/** Bookkeeping fields only. Amount, currency, type and tiers are immutable (the API answers 400 `immutable_field`). */
export const UpdatePriceParamsSchema = z.strictObject({
  lookup_key: z.string().optional(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  /** Can only be set once. */
  tax_behavior: TaxBehaviorSchema.optional(),
  /** Fixed after creation; a different value answers 400 `immutable_field`. */
  meter_id: z.string().min(1).nullable().optional(),
  metadata: CatalogMetadataSchema.optional(),
});
export type UpdatePriceParams = z.input<typeof UpdatePriceParamsSchema>;

const priceListFilters = {
  status: PriceStatusSchema.optional(),
  type: PriceTypeSchema.optional(),
  currency: CurrencySchema.optional(),
};

/** Prices of one product. */
export const ListProductPricesParamsSchema = PageParamsSchema.extend(priceListFilters);
export type ListProductPricesParams = z.input<typeof ListProductPricesParamsSchema>;

export const MAX_LOOKUP_KEYS = 10;

/** Account-wide price list. */
export const ListPricesParamsSchema = PageParamsSchema.extend({
  account_id: IdSchema.optional(),
  product_id: IdSchema.optional(),
  /** At most 10. Sent comma separated. */
  lookup_keys: z.array(IdSchema).min(1).max(MAX_LOOKUP_KEYS).optional(),
  ...priceListFilters,
});
export type ListPricesParams = z.input<typeof ListPricesParamsSchema>;
