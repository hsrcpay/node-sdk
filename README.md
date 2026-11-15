# @hsrcpay/node-sdk

Official Node.js SDK for [HSRCPay](https://hsrcpay.com). Docs: [hsrcpay.com/docs](https://hsrcpay.com/docs).

```sh
bun add @hsrcpay/node-sdk
```

```ts
import { HsrcpayClient } from "@hsrcpay/node-sdk";

const client = new HsrcpayClient({ apiKey: process.env.HSRCPAY_API_KEY! });
```

## Development

Bun only: `bun install`, `bun test`, `bun run build`.

## Release flow

`main` is the only branch. Every push to `main` runs typecheck, tests and build, then publishes to npm.
The version is computed from the latest `v*` tag and the conventional commits since it:

- `feat!:` or `BREAKING CHANGE:` bumps major
- `feat:` bumps minor
- anything else bumps patch

The version is never committed to `main`; it lives in the git tag, the GitHub release and the npm package.
Required repository secret: `NPM_TOKEN`.

## License

HSRCPAY API Client License v1.0, see [LICENSE](./LICENSE).
