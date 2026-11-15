# @hsrcpay/sdk

Official Node.js SDK for [HSRCPay](https://hsrcpay.com). Docs: [hsrcpay.com/docs](https://hsrcpay.com/docs).

Source repository: [hsrcpay/node-sdk](https://github.com/hsrcpay/node-sdk).

## Install

```sh
bun add @hsrcpay/sdk
```

Requires Node.js 20 or newer. Zero runtime dependencies (uses the built-in `fetch`).

## Quick start

```ts
import { HsrcpayClient } from "@hsrcpay/sdk";

const client = new HsrcpayClient({ apiKey: process.env.HSRCPAY_API_KEY! });

const payment = await client.payments.create({ amount: 2500, currency: "TRY" });

const { payment: confirmed, confirmResult } = await client.payments.confirm(
  payment.id,
  { payment_method: { type: "card", data: { name, pan, month, year, cvv } } },
  { idempotencyKey: "order-1042-confirm" },
);

await client.payments.refund(confirmed.id, { reason: "CUSTOMER_REQUEST" });
```

Amounts are integers in minor units (`2500` is 25.00). Test keys (`sk_test_...`) use the sandbox automatically.

## API

| Resource | Methods |
|---|---|
| `client.payments` | `create`, `retrieve`, `list`, `confirm`, `capture`, `cancel`, `refund`, `timeline` |
| `client.refunds` | `retrieve`, `list` |

Every method takes optional per-call `{ signal, timeoutMs, maxRetries }`.

## Errors

All errors extend `HsrcpayError`.

- `HsrcpayApiError`: the API returned a non-2xx status. Carries `status`, `code`, `details` and the raw `body`.
- `HsrcpayConnectionError`: no usable response (network failure). `HsrcpayTimeoutError` is a subtype.
- `HsrcpayAbortError`: the caller aborted through `signal`.

## Retries

Network failures and `429`, `502`, `503`, `504` responses are retried with exponential backoff and jitter (default 2 retries, `Retry-After` honored). `POST` calls are retried only when an `idempotencyKey` is given.

## Development

Bun only.

```sh
bun install
bun run typecheck
bun test
bun run build
```

## Release flow

`main` is the only branch. Every push to `main` and every pull request runs typecheck, tests and build (CI only, nothing is published).

A release happens only when a new version tag is pushed:

```sh
git tag v1.2.3
git push origin v1.2.3
```

The workflow checks that the tag is a semver version (`vMAJOR.MINOR.PATCH`, optionally `-rc.1` style, published under the `next` dist-tag) and that its commit is on `main`. It then runs CI again, publishes the package to npm with the version from the tag, and creates the GitHub release with generated notes.
The version is never committed to `main`; it lives in the git tag, the GitHub release and the npm package.
Required repository secret: `NPM_TOKEN`.

## License

HSRCPAY API Client License v1.0, see [LICENSE](./LICENSE).
