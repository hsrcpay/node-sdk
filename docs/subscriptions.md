# Subscriptions

```ts
const subscription = await hsrcpay.subscriptions.create({
  customer_id: "cus_...",
  currency: "TRY",
  items: [{ price_id: "price_...", quantity: 2 }],
  payment_method_id: "pm_...",
  trial_period_days: 14,
});

await hsrcpay.subscriptions.cancel(subscription.id, { cancel_at_period_end: true });
await hsrcpay.subscriptions.resume(subscription.id);
```

| Method | Does |
|---|---|
| `create({ customer_id, currency, items, ... })` | 1 to 20 recurring items sharing one cadence; `trial_period_days` 1 to 730 |
| `list({ customer_id?, status?, page?, limit? })` | Paginated |
| `retrieve(id)` | Includes `items` and `dunning_state` |
| `update(id, { payment_method_id?, metadata?, collection_behavior?, days_until_due? })` | A new payment method on a subscription in dunning schedules an immediate retry |
| `cancel(id, { cancel_at_period_end?, canceled_reason?, prorate? })` | Immediate by default: voids open invoices; `prorate` credits the unused paid time. `prorate` with `cancel_at_period_end` is rejected |
| `resume(id)` | Clears `cancel_at_period_end` |

Statuses: `active`, `trialing`, `pending`, `past_due`, `unpaid`, `canceled`, `incomplete`, `expired`.

`billing_cycle_anchor` is not offered: the API types it as a date object, which a JSON body cannot carry.

## Changes

Upgrade, downgrade, change a quantity, or add or remove an item.

```ts
const preview = await hsrcpay.subscriptions.changes.preview(id, { change_type: "replace_item", item_id, price_id });
// preview.amount_due_now, preview.credit_amount (minor units)

await hsrcpay.subscriptions.changes.schedule(id, { change_type: "replace_item", item_id, price_id, timing: "period_end" });
```

| Method | Does |
|---|---|
| `changes.list(id)` | Applied, scheduled and canceled changes (a plain array) |
| `changes.preview(id, change)` | What it would charge or credit now; applies nothing |
| `changes.schedule(id, change)` | `timing: "immediate"` (default, prorated now) or `"period_end"` |
| `changes.cancel(id, changeId, { canceled_reason? })` | Only a scheduled change (`pending_payment`) can be canceled |

A change takes `change_type` (`replace_item`, `add_item`, `remove_item`, `quantity_change`), `item_id`, `price_id`,
`quantity` (1 to 1,000,000), `timing` and `proration_behavior` (`none`, `create_prorations`, `always_invoice`).
