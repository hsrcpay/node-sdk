# @hsrcpay/sdk

[![npm](https://img.shields.io/npm/v/@hsrcpay/sdk)](https://www.npmjs.com/package/@hsrcpay/sdk)
[![CI](https://github.com/hsrcpay/node-sdk/actions/workflows/ci.yaml/badge.svg)](https://github.com/hsrcpay/node-sdk/actions/workflows/ci.yaml)
[![License](https://img.shields.io/badge/license-HSRCPAY%20API%20Client-blue)](./LICENSE)

The official Node.js SDK for [HSRCPay](https://hsrcpay.com): create, confirm, capture, cancel and refund payments
with fully typed requests and responses.

## Install

```sh
bun add @hsrcpay/sdk
```

Requires Node.js 20+ or Bun. Works with ESM and CommonJS.

## Quick start

```ts
import { HsrcpayClient } from "@hsrcpay/sdk";

const hsrcpay = new HsrcpayClient({ apiKey: process.env.HSRCPAY_API_KEY! });

const payment = await hsrcpay.payments.create({ amount: 2500, currency: "TRY" });

const { payment: confirmed } = await hsrcpay.payments.confirm(
  payment.id,
  { payment_method: { type: "card", data: { name, pan, month, year, cvv } } },
  { idempotencyKey: "order-1042" },
);

await hsrcpay.payments.refund(confirmed.id, { reason: "CUSTOMER_REQUEST" });
```

Amounts are integers in minor units (`2500` is 25.00). Keys starting with `sk_test_` use the sandbox.

## Resources

`HsrcpayClient` (secret key, server-side):

| Resource | Methods |
|---|---|
| `payments` | `create`, `retrieve`, `list`, `confirm`, `capture`, `cancel`, `refund`, `timeline` |
| `charges`, `refunds` | `retrieve`, `list` |
| `customers` (+ `addresses`) | `create`, `retrieve`, `list`, `update`, `delete` |
| `products` (+ `prices`) and `prices` | `create`, `retrieve`, `list`, `update`, `updateStatus`, `delete`, `usage` |
| `checkoutSessions` | `create`, `retrieve`, `list`, `update`, `expire`, `search` |
| `subscriptions` (+ `changes`) | `create`, `retrieve`, `list`, `update`, `cancel`, `resume`; `changes.list`, `preview`, `schedule`, `cancel` |
| `invoices` (+ `lines`) | `create`, `retrieve`, `list`, `update`, `delete`, `finalize`, `markPaid`, `void`; `lines.add`, `update`, `remove` |
| `disputes` | `list`, `retrieve`, `update`, `accept`, `createTest`, `closeTest` |

`HsrcpayPublicClient` (publishable key, browsers): hosted checkout only, see
[Publishable keys and browsers](docs/public-client.md).

## Documentation

- [Getting started](docs/getting-started.md)
- [Configuration](docs/configuration.md)
- [Payments](docs/payments.md), [Customers](docs/customers.md), [Products and prices](docs/catalog.md), [Hosted checkout](docs/checkout.md), [Subscriptions](docs/subscriptions.md), [Invoices](docs/invoices.md), [Disputes](docs/disputes.md)
- [Publishable keys and browsers](docs/public-client.md)
- [Where `account_id` is needed](docs/account-id.md)
- [Errors](docs/errors.md)
- [Retries and idempotency](docs/retries-and-idempotency.md)
- [Validation and types](docs/validation.md)
- [Releasing (maintainers)](docs/releasing.md)

API reference: [hsrcpay.com/docs](https://hsrcpay.com/docs).

## Support

Bugs and feature requests: [GitHub issues](https://github.com/hsrcpay/node-sdk/issues). Security issues: see
[SECURITY.md](SECURITY.md). Contributing: [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[HSRCPAY API Client License v1.0](./LICENSE).
