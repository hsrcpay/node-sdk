/**
 * Backend request and response schemas for customers, catalog and checkout sessions, copied from the hsrcpay
 * monorepo (packages/core/{billing,catalog}/src/**\/infrastructure/in/http). Keep in sync with the backend.
 */
import z from "zod";
import { BACKEND_ENUMS } from "./backend-schemas";

export const MORE_ENUMS = {
  addressType: ["BILLING", "SHIPPING", "BOTH"],
  productStatus: ["active", "inactive", "archived"],
  productType: ["service", "good"],
  priceStatus: ["active", "inactive", "archived"],
  priceType: ["recurring", "one_time"],
  priceInterval: ["day", "week", "month", "year"],
  taxBehavior: ["include", "exclude", "unspecified"],
  billingScheme: ["per_unit", "tiered"],
  usageType: ["licensed", "metered"],
  tiersMode: ["graduated", "volume"],
  transformRound: ["up", "down"],
  checkoutStatus: ["PENDING", "PROCESSING", "COMPLETED", "EXPIRED", "CANCELLED", "FAILED"],
  amountMode: ["FIXED", "CUSTOMER_INPUT", "LINE_ITEMS"],
  collectAddress: ["NONE", "BILLING", "BOTH"],
  afterCompletion: ["HOSTED_PAGE", "MESSAGE", "REDIRECT"],
  lineItemSource: ["CUSTOM", "PRODUCT_PRICE"],
} as const;

const currency = z.enum(BACKEND_ENUMS.currency);
const addressType = z.enum(MORE_ENUMS.addressType);

/* ---------- customers: requests ---------- */

const CreateCustomerAddressInput = z.object({
  id: z.string().optional(),
  type: addressType,
  is_default: z.boolean().default(false),
  label: z.string().nullable().default(null),
  country: z.string(),
  city: z.string().nullable().default(null),
  state: z.string().nullable().default(null),
  line1: z.string().nullable().default(null),
  line2: z.string().nullable().default(null),
  zip: z.string().nullable().default(null),
});

export const CustomerCreateBodySchema = z.object({
  name: z.string(),
  email: z.email().nullable().default(null),
  data: z.object({}).default({}),
  phone: z.string().nullable().default(null),
  country: z.string().nullable().default(null),
  external_reference: z.string().min(1).nullable().default(null),
  alternate_emails: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
  addresses: z.array(CreateCustomerAddressInput).default([]),
});

export const CustomerCreateQuerySchema = z.object({ account_id: z.string().optional() });

export const CustomerUpdateBodySchema = z.object({
  name: z.string().optional(),
  email: z.email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const CustomerListQuerySchema = z.object({
  account_id: z.string().optional(),
  page: z.coerce.number().positive().optional(),
  limit: z.coerce.number().positive().optional(),
  external_reference: z.string().min(1).optional(),
});

export const AddressCreateBodySchema = z.object({
  type: addressType,
  is_default: z.boolean(),
  label: z.string().optional(),
  country: z.string(),
  city: z.string().optional(),
  state: z.string().optional(),
  line1: z.string().optional(),
  line2: z.string().optional(),
  zip: z.string().optional(),
});

export const AddressUpdateBodySchema = z.object({
  label: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  line1: z.string().optional(),
  line2: z.string().optional(),
  zip: z.string().optional(),
});

/* ---------- customers: responses ---------- */

export const AddressDtoSchema = z.object({
  id: z.string(),
  customer_id: z.string(),
  type: addressType,
  is_default: z.boolean(),
  label: z.string().nullable(),
  country: z.string(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  line1: z.string().nullable(),
  line2: z.string().nullable(),
  zip: z.string().nullable(),
  deleted: z.boolean(),
  deleted_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CustomerDtoSchema = z.object({
  id: z.string(),
  account_id: z.string(),
  name: z.string().nullable(),
  email: z.email().nullable(),
  phone: z.string().nullable(),
  country: z.string().nullable(),
  external_reference: z.string().nullable(),
  alternate_emails: z.array(z.email()),
  is_guest: z.boolean(),
  metadata: z.record(z.string(), z.unknown()),
  deleted: z.boolean(),
  addresses: z.array(AddressDtoSchema),
  created_at: z.string(),
  updated_at: z.string(),
});

/* ---------- catalog: requests ---------- */

export const CatalogMetadataBodySchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]));

export const PriceDraftBodySchema = z.object({
  lookup_key: z.string().optional(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  type: z.enum(MORE_ENUMS.priceType),
  interval: z.enum(MORE_ENUMS.priceInterval).nullable().optional(),
  interval_count: z.number().int().optional(),
  amount: z.number().int().optional(),
  currency,
  tax_behavior: z.enum(MORE_ENUMS.taxBehavior).optional(),
  billing_scheme: z.enum(MORE_ENUMS.billingScheme).optional(),
  usage_type: z.enum(MORE_ENUMS.usageType).optional(),
  meter_id: z.string().min(1).nullable().optional(),
  tiers_mode: z.enum(MORE_ENUMS.tiersMode).nullable().optional(),
  tiers: z
    .array(
      z.object({
        up_to: z.number().int().nullable(),
        unit_amount: z.number().int().nullable().optional(),
        flat_amount: z.number().int().nullable().optional(),
      }),
    )
    .nullable()
    .optional(),
  custom_unit_amount: z
    .object({
      minimum: z.number().int().nullable().optional(),
      maximum: z.number().int().nullable().optional(),
      preset: z.number().int().nullable().optional(),
    })
    .nullable()
    .optional(),
  transform_quantity: z.object({ divide_by: z.number().int(), round: z.enum(MORE_ENUMS.transformRound) }).nullable().optional(),
  trial_period_days: z.number().int().nullable().optional(),
  metadata: CatalogMetadataBodySchema.optional(),
});

export const PriceCreateBodySchema = z.object({ ...PriceDraftBodySchema.shape, set_as_default: z.boolean().optional() });

export const PriceUpdateBodySchema = z.object({
  lookup_key: z.string().optional(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  tax_behavior: z.enum(MORE_ENUMS.taxBehavior).optional(),
  meter_id: z.string().min(1).nullable().optional(),
  metadata: CatalogMetadataBodySchema.optional(),
});

export const PriceStatusBodySchema = z.object({ status: z.enum(MORE_ENUMS.priceStatus) });

const priceListFilters = {
  status: z.enum(MORE_ENUMS.priceStatus).optional(),
  type: z.enum(MORE_ENUMS.priceType).optional(),
  currency: currency.optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
};
export const ProductPriceListQuerySchema = z.object(priceListFilters);
export const PriceListQuerySchema = z.object({
  account_id: z.string().optional(),
  product_id: z.string().optional(),
  lookup_keys: z.union([z.string(), z.array(z.string())]).optional(),
  ...priceListFilters,
});

const productFields = {
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  images: z.array(z.string()).optional(),
  marketing_features: z.array(z.object({ name: z.string() })).optional(),
  package_dimensions: z
    .object({ height: z.number(), length: z.number(), weight: z.number(), width: z.number() })
    .nullable()
    .optional(),
  shippable: z.boolean().nullable().optional(),
  statement_descriptor: z.string().nullable().optional(),
  tax_code: z.string().nullable().optional(),
  unit_label: z.string().nullable().optional(),
  entitlement_priority: z.number().int().optional(),
  url: z.string().nullable().optional(),
  metadata: CatalogMetadataBodySchema.optional(),
};

export const ProductCreateBodySchema = z.object({
  account_id: z.string().optional(),
  name: z.string(),
  lookup_key: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  type: z.enum(MORE_ENUMS.productType).optional(),
  ...productFields,
  default_price_data: PriceDraftBodySchema.nullable().optional(),
});

export const ProductUpdateBodySchema = z.object({
  lookup_key: z.string().optional(),
  name: z.string().optional(),
  default_price_id: z.string().nullable().optional(),
  ...productFields,
});

export const ProductStatusBodySchema = z.object({ status: z.enum(MORE_ENUMS.productStatus) });

export const ProductListQuerySchema = z.object({
  account_id: z.string().optional(),
  status: z.enum(MORE_ENUMS.productStatus).optional(),
  type: z.enum(MORE_ENUMS.productType).optional(),
  category: z.string().optional(),
  query: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

/* ---------- catalog: responses ---------- */

export const PriceDtoSchema = z.looseObject({
  object: z.literal("price"),
  id: z.string(),
  product_id: z.string(),
  lookup_key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.enum(MORE_ENUMS.priceStatus),
  active: z.boolean(),
  type: z.enum(MORE_ENUMS.priceType),
  interval: z.enum(MORE_ENUMS.priceInterval).nullable(),
  interval_count: z.number(),
  recurring: z
    .object({
      interval: z.enum(MORE_ENUMS.priceInterval),
      interval_count: z.number(),
      usage_type: z.enum(MORE_ENUMS.usageType),
      trial_period_days: z.number().nullable(),
    })
    .nullable(),
  amount: z.number(),
  currency,
  tax_behavior: z.enum(MORE_ENUMS.taxBehavior),
  billing_scheme: z.enum(MORE_ENUMS.billingScheme),
  usage_type: z.enum(MORE_ENUMS.usageType),
  meter_id: z.string().nullable(),
  tiers_mode: z.enum(MORE_ENUMS.tiersMode).nullable(),
  tiers: z.array(z.object({ up_to: z.number().nullable(), unit_amount: z.number().nullable(), flat_amount: z.number().nullable() })).nullable(),
  custom_unit_amount: z.object({ minimum: z.number().nullable(), maximum: z.number().nullable(), preset: z.number().nullable() }).nullable(),
  transform_quantity: z.object({ divide_by: z.number(), round: z.enum(MORE_ENUMS.transformRound) }).nullable(),
  trial_period_days: z.number().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  archived_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const ProductDtoSchema = z.looseObject({
  object: z.literal("product"),
  id: z.string(),
  account_id: z.string(),
  lookup_key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.enum(MORE_ENUMS.productStatus),
  active: z.boolean(),
  type: z.enum(MORE_ENUMS.productType),
  category: z.string().nullable(),
  images: z.array(z.string()),
  marketing_features: z.array(z.object({ name: z.string() })),
  package_dimensions: z.object({ height: z.number(), length: z.number(), weight: z.number(), width: z.number() }).nullable(),
  shippable: z.boolean().nullable(),
  statement_descriptor: z.string().nullable(),
  tax_code: z.string().nullable(),
  unit_label: z.string().nullable(),
  entitlement_priority: z.number().int(),
  url: z.string().nullable(),
  default_price_id: z.string().nullable(),
  default_price: PriceDtoSchema.nullable(),
  metadata: z.record(z.string(), z.unknown()),
  prices: z.array(PriceDtoSchema).default([]),
  archived_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const ProductUsageDtoSchema = z.object({
  object: z.literal("product_usage"),
  product_id: z.string(),
  prices: z.number(),
  payments: z.number(),
  charges: z.number(),
  checkout_session_line_items: z.number(),
  payment_link_line_items: z.number(),
  invoice_line_items: z.number(),
  deletable: z.boolean(),
});

/* ---------- checkout sessions ---------- */

export const CheckoutCreateBodySchema = z.object({
  customer_id: z.string().optional(),
  amount: z.number().positive().optional(),
  currency,
  url: z.url().optional(),
  line_items: z.array(z.object({ price_id: z.string(), quantity: z.number().int().min(1).optional() })).min(1).optional(),
  success_url: z.url().optional(),
  cancel_url: z.url().optional(),
  return_url: z.url().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  expires_at: z.string().datetime().optional(),
});
export const CheckoutCreateQuerySchema = z.object({ account_id: z.string().optional() });
export const CheckoutListQuerySchema = z.object({
  account_id: z.string().optional(),
  page: z.coerce.number().positive().optional(),
  limit: z.coerce.number().positive().optional(),
});
export const CheckoutUpdateBodySchema = z.object({
  status: z.enum(MORE_ENUMS.checkoutStatus).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export const CheckoutSearchQuerySchema = z.object({ q: z.string(), account_id: z.string() });
export const CheckoutAmountBodySchema = z.object({ amount: z.coerce.bigint() });
export const CheckoutPrepareBodySchema = z.object({
  payer: z
    .object({
      name: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      locale: z.string().optional(),
      billing_address: z.record(z.string(), z.unknown()).nullable().optional(),
      shipping_address: z.record(z.string(), z.unknown()).nullable().optional(),
      custom_fields_values: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
});

export const CheckoutSessionDtoSchema = z.looseObject({
  object: z.literal("checkout_session"),
  id: z.string(),
  account_id: z.string(),
  status: z.enum(MORE_ENUMS.checkoutStatus),
  currency,
  token: z.string(),
  amount_mode: z.enum(MORE_ENUMS.amountMode),
  collect_address: z.enum(MORE_ENUMS.collectAddress),
  collect_name: z.boolean(),
  collect_phone: z.boolean(),
  after_completion_type: z.enum(MORE_ENUMS.afterCompletion),
  created_at: z.string(),
  updated_at: z.string(),
  metadata: z.record(z.string(), z.unknown()),
});
