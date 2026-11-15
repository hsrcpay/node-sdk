import { expect, test } from "bun:test";
import { DEFAULT_BASE_URL, HsrcpayClient } from "./index";

test("uses the default base url", () => {
  expect(new HsrcpayClient({ apiKey: "k" }).baseUrl).toBe(DEFAULT_BASE_URL);
});

test("rejects a missing api key", () => {
  expect(() => new HsrcpayClient({ apiKey: "" })).toThrow("apiKey is required");
});
