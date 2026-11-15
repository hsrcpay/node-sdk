// Release build, run with Bun only: ESM + CJS bundles and one bundled declaration file.
// No source maps. The package version is inlined for the User-Agent header.
import { $ } from "bun";

const pkg = (await Bun.file("package.json").json()) as { version: string };

await $`rm -rf dist`;

const formats = [
  { format: "esm", file: "index.js" },
  { format: "cjs", file: "index.cjs" },
] as const;

for (const { format, file } of formats) {
  const result = await Bun.build({
    entrypoints: ["src/index.ts"],
    outdir: "dist",
    naming: file,
    target: "node",
    format,
    sourcemap: "none",
    external: ["zod"],
    minify: false,
    define: { __SDK_VERSION__: JSON.stringify(pkg.version) },
  });
  if (!result.success) {
    for (const log of result.logs) console.error(log);
    process.exit(1);
  }
}

await $`./node_modules/.bin/dts-bundle-generator --project tsconfig.json --no-banner -o dist/index.d.ts src/index.ts`.quiet();
// CommonJS consumers on node16 resolution need the declaration under the .cts extension.
await Bun.write("dist/index.d.cts", Bun.file("dist/index.d.ts"));

console.log(`Built @hsrcpay/sdk ${pkg.version}: dist/index.js, dist/index.cjs, dist/index.d.ts, dist/index.d.cts`);
