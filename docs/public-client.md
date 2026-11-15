# Publishable keys and browsers

The SDK has two clients because the API has two kinds of keys.

| | `HsrcpayClient` | `HsrcpayPublicClient` |
|---|---|---|
| Key | secret, `sk_live_...` / `sk_test_...` | publishable, `pk_live_...` / `pk_test_...` |
| Where | your server | browsers, mobile apps, anywhere public |
| Surface | the full account API | the hosted checkout flow only |

```ts
import { HsrcpayPublicClient } from "@hsrcpay/sdk";

const hsrcpay = new HsrcpayPublicClient({ publishableKey: "pk_test_..." });

const session = await hsrcpay.checkoutSessions.retrieveByToken(token);
const { payment } = await hsrcpay.checkoutSessions.prepare(token, { payer: { email } });
const { confirmResult } = await hsrcpay.payments.confirm(payment.id, { payment_method: { type: "card", data: card } });
```

## What a publishable key can do

The API caps a publishable key to two things, whatever permissions its row holds:

- **Payments:** read and confirm.
- **Checkout sessions:** read and update (by token).

That is exactly what `HsrcpayPublicClient` exposes: `checkoutSessions.retrieveByToken`, `updateAmount`, `prepare` and
`payments.retrieve`, `confirm`, `timeline`. Reading products, prices or customers, creating payments, capturing,
cancelling and refunding all need a secret key on your server (the API answers 403 to a publishable key). The
merchant can also switch the payment timeline off for API keys.

## Guard rails

- `HsrcpayClient` throws if you pass a publishable key and points you to `HsrcpayPublicClient`.
- `HsrcpayPublicClient` throws if you pass a secret key. A secret key must never reach client-side code.
- `HsrcpayClient` also refuses to start when it detects a browser (`window.document`). Pass
  `dangerouslyAllowBrowser: true` only if you understand the risk.
- A key is recognised by `sk_` or `pk_` within its first 32 characters, as the API does. Keys containing `_test_` use
  the sandbox. `detectKeyKind` and `isTestKey` are exported.

## Calling a secret-key endpoint from a page

Do not. Add an endpoint to your server that uses `HsrcpayClient` and call that from the page.
