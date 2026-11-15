// Smoke test of the built package as a consumer sees it: ESM import, CJS require, declarations, no source maps.
import { createRequire } from "node:module";
import { readdir } from "node:fs/promises";

const EXPECTED = ["HsrcpayClient", "HsrcpayApiError", "HsrcpayConnectionError", "HsrcpayTimeoutError", "HsrcpayAbortError", "Currency", "PaymentsResource"];

const fail = (message: string): never => {
  console.error(`verify-dist: ${message}`);
  process.exit(1);
};

const esm = (await import(`${process.cwd()}/dist/index.js`)) as Record<string, unknown>;
const cjs = createRequire(import.meta.url)(`${process.cwd()}/dist/index.cjs`) as Record<string, unknown>;

for (const name of EXPECTED) {
  if (typeof esm[name] === "undefined") fail(`ESM build is missing export ${name}`);
  if (typeof cjs[name] === "undefined") fail(`CJS build is missing export ${name}`);
}

const files = await readdir("dist");
if (files.some((f) => f.endsWith(".map"))) fail("dist must not contain source maps");
for (const f of ["index.js", "index.cjs", "index.d.ts", "index.d.cts"]) {
  if (!files.includes(f)) fail(`dist/${f} is missing`);
}
for (const f of ["index.js", "index.cjs", "index.d.ts"]) {
  if ((await Bun.file(`dist/${f}`).text()).includes("sourceMappingURL")) fail(`dist/${f} references a source map`);
}

const Client = esm.HsrcpayClient as new (o: { apiKey: string }) => { payments: object; refunds: object };
const client = new Client({ apiKey: "sk_test_smoke" });
if (!client.payments || !client.refunds) fail("client does not expose payments and refunds");

console.log("verify-dist: ESM, CJS and declarations are consistent");
