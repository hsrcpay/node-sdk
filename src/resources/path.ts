/** Validates and encodes a resource id for use as a URL path segment. */
export function pathId(value: string, name: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return encodeURIComponent(value);
}
