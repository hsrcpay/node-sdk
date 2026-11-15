import { z } from "zod";

export const Currency = { USD: "USD", TRY: "TRY", EUR: "EUR", GBP: "GBP" } as const;
export const CurrencySchema = z.enum(Currency);
export type Currency = z.infer<typeof CurrencySchema>;

/** Non-empty resource id. */
export const IdSchema = z.string().min(1);

export const MAX_METADATA_KEYS = 100;

export const MetadataSchema = z
  .record(z.string(), z.unknown())
  .refine((value) => Object.keys(value).length <= MAX_METADATA_KEYS, `must not exceed ${MAX_METADATA_KEYS} key-value pairs`);
export type Metadata = z.infer<typeof MetadataSchema>;

/** ISO-8601 timestamp as serialized by the API. */
export const InstantSchema = z.string();

/** Minor units (cents), integer. */
export const MinorAmountSchema = z.number().int();

export const PageParamsSchema = z.strictObject({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
});

export const pageSchema = <T extends z.ZodType>(item: T) =>
  z.looseObject({
    data: z.array(item),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    pages: z.number().int().nonnegative(),
  });

/** Envelope of a paginated list endpoint. */
export type Page<T> = { data: T[]; total: number; page: number; limit: number; pages: number };

/** Per-call overrides accepted by every method. */
export type RequestOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Retry budget for this call; defaults to the client setting. */
  maxRetries?: number;
};

export type MutationOptions = RequestOptions & {
  /** Sent as `Idempotency-Key`. Required for a POST or PATCH to be retried automatically. */
  idempotencyKey?: string;
};
