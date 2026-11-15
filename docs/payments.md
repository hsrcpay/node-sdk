# Payments, charges and refunds

All amounts are integers in minor units. Currencies: `USD`, `TRY`, `EUR`, `GBP`.

## Payments

| Method | Request | Notes |
|---|---|---|
| `payments.create(params?, options?)` | `POST /v1/payments` | Creates a payment in `CREATED` state. |
| `payments.retrieve(id, params?, options?)` | `GET /v1/payments/:id` | `include_charges`, `include_routing_plans`, `include_events`, `include_customer` expand relations. |
| `payments.list(params?, options?)` | `GET /v1/payments` | Paginated. Filters: `customer_id`, `product_id`. |
| `payments.confirm(id, params, options?)` | `POST /v1/payments/:id/confirm` | Attaches a method and runs the confirmation. |
| `payments.capture(id, options?)` | `POST /v1/payments/:id/capture` | Captures an authorized payment in full. |
| `payments.cancel(id, options?)` | `POST /v1/payments/:id/cancel` | Voids an authorized payment before capture. |
| `payments.refund(id, params?, options?)` | `POST /v1/payments/:id/refund` | Refunds a succeeded payment in full. |
| `payments.timeline(id, params?, options?)` | `GET /v1/payments/:id/timeline` | Routing, attempts, 3D Secure and fallbacks. Cursor with `starting_after`. |

### Create

```ts
await hsrcpay.payments.create({
  amount: 2500,              // integer, at least 10; omit when price_id sets it
  currency: "TRY",
  customer_id: "cus_...",
  price_id: "price_...",
  auto_capture: true,        // must not be false together with installments
  secure_mode: "auto",       // "auto" | true | false
  installments: 3,           // 1 to 64
  metadata: { order_id: "1042" },
});
```

### Confirm

`payment_method` is a card or a saved method id. `routing_strategy` optionally pins a provider (see the API docs).
The result carries the updated `payment` and a `confirmResult` with `ok`, the per-provider `results`,
`latest_attempt` (decline class and codes, `retryable`) and `paymentNextAction` when the payer must be redirected.

### Refund

```ts
await hsrcpay.payments.refund("pay_...", { reason: "CUSTOMER_REQUEST" });
```

Reasons: `DEFAULT`, `CUSTOMER_REQUEST`, `RESTOCK`, `FRAUD`, `OTHER` (use `reason_other` with `OTHER`).

## Charges

`charges.retrieve(id, { include_attempt_details })` and `charges.list({ page, limit })`.

## Refunds

`refunds.retrieve(id)` and `refunds.list({ payment_id, charge_id, page, limit })`.

## Pagination

List methods return `{ data, total, page, limit, pages }`. Request the next page with `page`.

## Statuses

Payment: `CREATED`, `REQUIRES_PAYMENT_METHOD`, `REQUIRES_ACTION`, `PROCESSING`, `SUCCEEDED`, `AUTHORIZED`, `CANCELED`,
`REFUNDED`, `EXPIRED`. The enum objects (`PaymentStatus`, `ChargeStatus`, `RefundReason`, `Currency`) are exported.
