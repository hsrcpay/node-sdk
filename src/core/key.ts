export const KeyKind = { SECRET: "secret", PUBLISHABLE: "publishable" } as const;
export type KeyKind = (typeof KeyKind)[keyof typeof KeyKind];

/** The API recognises a key by `sk_` or `pk_` appearing within its first 32 characters. */
const PREFIX_WINDOW = 32;

/** `sk_live_...` / `sk_test_...` are secret keys, `pk_live_...` / `pk_test_...` are publishable keys. */
export function detectKeyKind(apiKey: string): KeyKind | undefined {
  const head = apiKey.slice(0, PREFIX_WINDOW);
  if (head.includes("sk_")) return KeyKind.SECRET;
  if (head.includes("pk_")) return KeyKind.PUBLISHABLE;
  return undefined;
}

/** Sandbox keys carry `_test_`; the API resolves the sandbox from the key itself. */
export const isTestKey = (apiKey: string): boolean => apiKey.includes("_test_");

/** True in a browser, web worker-less window context. */
export const isBrowserLike = (): boolean => {
  const scope = globalThis as { window?: { document?: unknown } };
  return typeof scope.window !== "undefined" && typeof scope.window.document !== "undefined";
};
