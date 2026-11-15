import { z } from "zod";
import { IdSchema, InstantSchema, PageParamsSchema } from "../../core/schemas";

export const AddressType = { BILLING: "BILLING", SHIPPING: "SHIPPING", BOTH: "BOTH" } as const;
export const AddressTypeSchema = z.enum(AddressType);
export type AddressType = z.infer<typeof AddressTypeSchema>;

/* ---------- responses ---------- */

export const CustomerAddressSchema = z.looseObject({
  id: z.string(),
  customer_id: z.string(),
  type: AddressTypeSchema,
  is_default: z.boolean(),
  label: z.string().nullable(),
  country: z.string(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  line1: z.string().nullable(),
  line2: z.string().nullable(),
  zip: z.string().nullable(),
  deleted: z.boolean(),
  deleted_at: InstantSchema.nullable(),
  created_at: InstantSchema,
  updated_at: InstantSchema,
});
export type CustomerAddress = z.infer<typeof CustomerAddressSchema>;

export const CustomerSchema = z.looseObject({
  id: z.string(),
  account_id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  country: z.string().nullable(),
  /** The merchant's own id for this customer; unique per account among live customers when set. */
  external_reference: z.string().nullable(),
  alternate_emails: z.array(z.string()),
  is_guest: z.boolean(),
  metadata: z.record(z.string(), z.unknown()),
  deleted: z.boolean(),
  addresses: z.array(CustomerAddressSchema),
  created_at: InstantSchema,
  updated_at: InstantSchema,
});
export type Customer = z.infer<typeof CustomerSchema>;

/* ---------- request parameters ---------- */

/** Address given while creating a customer. */
export const CustomerAddressInputSchema = z.strictObject({
  id: IdSchema.optional(),
  type: AddressTypeSchema,
  is_default: z.boolean().optional(),
  label: z.string().nullable().optional(),
  country: z.string().min(1),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  line1: z.string().nullable().optional(),
  line2: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
});
export type CustomerAddressInput = z.input<typeof CustomerAddressInputSchema>;

export const CreateCustomerParamsSchema = z.strictObject({
  /** Query `account_id`: the account to attach the customer to. Omit with an API key (it is the key's account). */
  account_id: IdSchema.optional(),
  name: z.string(),
  email: z.email().nullable().optional(),
  phone: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  external_reference: z.string().min(1).nullable().optional(),
  alternate_emails: z.array(z.string()).optional(),
  data: z.strictObject({}).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  addresses: z.array(CustomerAddressInputSchema).optional(),
});
export type CreateCustomerParams = z.input<typeof CreateCustomerParamsSchema>;

export const ListCustomersParamsSchema = PageParamsSchema.extend({
  account_id: IdSchema.optional(),
  /** Only customers with this merchant-side id. */
  external_reference: z.string().min(1).optional(),
});
export type ListCustomersParams = z.input<typeof ListCustomersParamsSchema>;

export const UpdateCustomerParamsSchema = z.strictObject({
  name: z.string().optional(),
  email: z.email().optional(),
  phone: z.string().optional(),
  country: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type UpdateCustomerParams = z.input<typeof UpdateCustomerParamsSchema>;

export const CreateCustomerAddressParamsSchema = z.strictObject({
  type: AddressTypeSchema,
  is_default: z.boolean(),
  label: z.string().optional(),
  country: z.string(),
  city: z.string().optional(),
  state: z.string().optional(),
  line1: z.string().optional(),
  line2: z.string().optional(),
  zip: z.string().optional(),
});
export type CreateCustomerAddressParams = z.input<typeof CreateCustomerAddressParamsSchema>;

export const UpdateCustomerAddressParamsSchema = z.strictObject({
  label: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  line1: z.string().optional(),
  line2: z.string().optional(),
  zip: z.string().optional(),
});
export type UpdateCustomerAddressParams = z.input<typeof UpdateCustomerAddressParamsSchema>;
