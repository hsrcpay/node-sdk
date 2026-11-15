# Getting started

## Install

```sh
bun add @hsrcpay/sdk
```

The package ships ESM and CommonJS builds with bundled TypeScript declarations. It needs Node.js 20 or newer, or Bun.

## Create a client

```ts
import { HsrcpayClient } from "@hsrcpay/sdk";

const hsrcpay = new HsrcpayClient({ apiKey: process.env.HSRCPAY_API_KEY! });
```

Use a **secret** key (`sk_live_...` or `sk_test_...`) and keep it on the server. A key containing `_test_` talks to
the sandbox; no other switch is needed. See [Configuration](configuration.md) for every option.

## A first payment

1. Create the payment intent. The amount is an integer in minor units.
2. Confirm it with a payment method.
3. Check `payment.status` and `confirmResult`.

```ts
const payment = await hsrcpay.payments.create({ amount: 2500, currency: "TRY" });

const { payment: result, confirmResult } = await hsrcpay.payments.confirm(
  payment.id,
  { payment_method: { type: "card", data: { name: "Ada Lovelace", pan: "4111111111111111", month: "12", year: "2030", cvv: "123" } } },
  { idempotencyKey: `order-${orderId}` },
);

if (confirmResult.paymentNextAction) {
  // 3D Secure or another redirect is needed: send the payer where the action says.
}
```

Never log or store card data. Prefer saved payment methods (`{ payment_method: { id: "pm_..." } }`) where possible.

## CommonJS

```js
const { HsrcpayClient } = require("@hsrcpay/sdk");
```

## Next

- [Payments](payments.md)
- [Errors](errors.md)
- [Retries and idempotency](retries-and-idempotency.md)
