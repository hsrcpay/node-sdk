# Hosted checkout

A checkout session is the hosted payment page. Your server creates it with a secret key, the payer's browser then
drives it with a publishable key and the session `token`. See [Publishable keys and browsers](public-client.md).

## Server: secret key

| Method | Request |
|---|---|
| `checkoutSessions.create(params)` | `POST /v1/checkout-sessions` |
| `checkoutSessions.retrieve(id)` | `GET /v1/checkout-sessions/:id` |
| `checkoutSessions.list(params?)` | `GET /v1/checkout-sessions` |
| `checkoutSessions.update(id, params)` | `PUT /v1/checkout-sessions/:id` (`status`, `metadata`) |
| `checkoutSessions.expire(id)` | `POST /v1/checkout-sessions/:id/expire` |
| `checkoutSessions.search({ q, account_id })` | `GET /v1/checkout-sessions/search` |

```ts
// Sell catalog prices
const session = await hsrcpay.checkoutSessions.create({
  currency: "USD",
  line_items: [{ price_id: "price_...", quantity: 2 }],
  success_url: "https://example.com/thanks",
  cancel_url: "https://example.com/cart",
});

// Or a fixed amount
await hsrcpay.checkoutSessions.create({ currency: "TRY", amount: 2500, url: "https://pay.example.com/checkout" });
```

Provide either `line_items`, or both `amount` and `url`. A paid recurring price in `line_items` becomes a subscription.
`expires_at` accepts an ISO-8601 string or a `Date`. Send `session.token` to the payer's page.

## Browser: publishable key

| Method | Request |
|---|---|
| `checkoutSessions.retrieveByToken(token)` | `GET /v1/checkout-sessions/token/:token` |
| `checkoutSessions.updateAmount(token, { amount })` | `PATCH /v1/checkout-sessions/token/:token/amount` |
| `checkoutSessions.prepare(token, { payer? })` | `POST /v1/checkout-sessions/token/:token/prepare` |
| `payments.confirm(paymentId, params)` | `POST /v1/payments/:id/confirm` |
| `payments.retrieve(paymentId)` | `GET /v1/payments/:id` |
| `payments.timeline(paymentId)` | `GET /v1/payments/:id/timeline` |

The flow:

1. `retrieveByToken` to render the page (amount, line items, what to collect).
2. For `amount_mode` `CUSTOMER_INPUT`, `updateAmount` with the payer's amount (within the session bounds).
3. `prepare` stores the payer details and returns the `payment` to confirm.
4. `payments.confirm` with the card or a saved method, then read `confirmResult` and `payment.status`.
