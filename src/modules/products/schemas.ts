import { z } from "zod";
import { IdSchema, InstantSchema, PageParamsSchema } from "../../core/schemas";
import { CatalogMetadataSchema, PriceDraftSchema, PriceSchema } from "../prices/schemas";

export const ProductStatus = { ACTIVE: "active", INACTIVE: "inactive", ARCHIVED: "archived" } as const;
export const ProductStatusSchema = z.enum(ProductStatus);
export type ProductStatus = z.infer<typeof ProductStatusSchema>;

/** `good` is a physical product (shipping fields allowed); `service` is everything else. */
export const ProductType = { SERVICE: "service", GOOD: "good" } as const;
export const ProductTypeSchema = z.enum(ProductType);
export type ProductType = z.infer<typeof ProductTypeSchema>;

export const MAX_PRODUCT_IMAGES = 8;
export const MAX_MARKETING_FEATURES = 15;
export const STATEMENT_DESCRIPTOR_LENGTH = { min: 5, max: 22 } as const;
export const MAX_UNIT_LABEL_LENGTH = 12;

/* ---------- responses ---------- */

export const PackageDimensionsSchema = z.object({
  height: z.number(),
  length: z.number(),
  weight: z.number(),
  width: z.number(),
});
export type PackageDimensions = z.infer<typeof PackageDimensionsSchema>;

export const ProductSchema = z.looseObject({
  object: z.literal("product"),
  id: z.string(),
  account_id: z.string(),
  lookup_key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: ProductStatusSchema,
  active: z.boolean(),
  type: ProductTypeSchema,
  category: z.string().nullable(),
  images: z.array(z.string()),
  marketing_features: z.array(z.object({ name: z.string() })),
  package_dimensions: PackageDimensionsSchema.nullable(),
  shippable: z.boolean().nullable(),
  statement_descriptor: z.string().nullable(),
  tax_code: z.string().nullable(),
  unit_label: z.string().nullable(),
  entitlement_priority: z.number().int(),
  url: z.string().nullable(),
  default_price_id: z.string().nullable(),
  default_price: PriceSchema.nullable(),
  metadata: z.record(z.string(), z.unknown()),
  prices: z.array(PriceSchema),
  archived_at: InstantSchema.nullable(),
  created_at: InstantSchema,
  updated_at: InstantSchema,
});
export type Product = z.infer<typeof ProductSchema>;

export const ProductUsageSchema = z.object({
  object: z.literal("product_usage"),
  product_id: z.string(),
  prices: z.number(),
  payments: z.number(),
  charges: z.number(),
  checkout_session_line_items: z.number(),
  payment_link_line_items: z.number(),
  invoice_line_items: z.number(),
  /** False once anything references the product; archive it instead. */
  deletable: z.boolean(),
});
export type ProductUsage = z.infer<typeof ProductUsageSchema>;

export const DeleteProductResultSchema = z.object({ success: z.boolean() });
export type DeleteProductResult = z.infer<typeof DeleteProductResultSchema>;

/* ---------- request parameters ---------- */

const httpsUrl = z.url().refine((value) => value.startsWith("https://"), "must be an https URL");

/** Optional catalog detail fields shared by create and update. */
const productFields = {
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  /** Up to 8 absolute https URLs. */
  images: z.array(httpsUrl).max(MAX_PRODUCT_IMAGES).optional(),
  /** Up to 15 bullet points shown on checkout. */
  marketing_features: z.array(z.strictObject({ name: z.string() })).max(MAX_MARKETING_FEATURES).optional(),
  /** Goods only. */
  package_dimensions: PackageDimensionsSchema.nullable().optional(),
  /** Goods only. */
  shippable: z.boolean().nullable().optional(),
  /** 5 to 22 characters shown on card statements. */
  statement_descriptor: z
    .string()
    .min(STATEMENT_DESCRIPTOR_LENGTH.min)
    .max(STATEMENT_DESCRIPTOR_LENGTH.max)
    .nullable()
    .optional(),
  tax_code: z.string().nullable().optional(),
  /** For example `seat` or `GB`, up to 12 characters. */
  unit_label: z.string().max(MAX_UNIT_LABEL_LENGTH).nullable().optional(),
  /** Config entitlement merge: the highest value wins. */
  entitlement_priority: z.number().int().optional(),
  /** Public product page. */
  url: z.string().nullable().optional(),
  metadata: CatalogMetadataSchema.optional(),
};

export const CreateProductParamsSchema = z.strictObject({
  /** Sent in the request body. Defaults to the account of the API key, so omit it with an API key. */
  account_id: IdSchema.optional(),
  name: z.string(),
  /** Unique per account. Generated when omitted. */
  lookup_key: z.string().optional(),
  status: z.enum([ProductStatus.ACTIVE, ProductStatus.INACTIVE]).optional(),
  /** Immutable after creation. */
  type: ProductTypeSchema.optional(),
  ...productFields,
  /** Creates the first price and sets it as the default, atomically with the product. */
  default_price_data: PriceDraftSchema.nullable().optional(),
});
export type CreateProductParams = z.input<typeof CreateProductParamsSchema>;

/** Status changes go through `products.updateStatus`; the type is immutable. */
export const UpdateProductParamsSchema = z.strictObject({
  lookup_key: z.string().optional(),
  name: z.string().optional(),
  /** An active price of this product; null unsets it. */
  default_price_id: z.string().nullable().optional(),
  ...productFields,
});
export type UpdateProductParams = z.input<typeof UpdateProductParamsSchema>;

export const ListProductsParamsSchema = PageParamsSchema.extend({
  account_id: IdSchema.optional(),
  status: ProductStatusSchema.optional(),
  type: ProductTypeSchema.optional(),
  category: z.string().optional(),
  /** Matches id, name, lookup key or description. */
  query: z.string().optional(),
});
export type ListProductsParams = z.input<typeof ListProductsParamsSchema>;
