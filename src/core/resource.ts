import type { z } from "zod";
import { HsrcpayValidationError } from "./errors";
import type { HttpClient } from "./http";
import { IdSchema } from "./schemas";

/** Base of every API module: client-side validation helpers on top of the HTTP client. */
export abstract class Resource {
  constructor(protected readonly http: HttpClient) {}

  /** Parses `value` with `schema` before any request is made; throws `HsrcpayValidationError`. */
  protected input<S extends z.ZodType>(schema: S, value: unknown, label: string): z.output<S> {
    const result = schema.safeParse(value);
    if (!result.success) throw new HsrcpayValidationError(label, result.error.issues);
    return result.data;
  }

  /** Validates and URL-encodes a resource id for use as a path segment. */
  protected id(value: unknown, name: string): string {
    const parsed = IdSchema.safeParse(typeof value === "string" ? value.trim() : value);
    if (!parsed.success) throw new HsrcpayValidationError(name, parsed.error.issues);
    return encodeURIComponent(parsed.data);
  }
}
