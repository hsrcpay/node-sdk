# Invoices

Create a draft, add lines, finalize it to `open`, then collect it or mark it paid.

```ts
const draft = await hsrcpay.invoices.create({
  customer_id: "cus_...",
  currency: "TRY",
  lines: [{ type: "custom", description: "Setup fee", amount: 1000, currency: "TRY" }],
});

await hsrcpay.invoices.lines.add(draft.id, { type: "discount", description: "Promo", amount: -200, currency: "TRY" });
const open = await hsrcpay.invoices.finalize(draft.id);
```

| Method | Does |
|---|---|
| `create({ customer_id, currency, lines?, ... })` | Creates a **draft** |
| `list({ customer_id?, status?, page?, limit? })` | Newest first |
| `retrieve(id)` | With `lines` |
| `update(id, { description?, collection_behavior?, metadata? })` | Drafts only |
| `delete(id)` | Hard-deletes a draft |
| `finalize(id)` | `draft` to `open` |
| `markPaid(id)` | `open` to `paid` |
| `void(id)` | Voids a `draft` or `open` invoice |
| `lines.add(id, line)` / `lines.update(id, lineId, fields)` / `lines.remove(id, lineId)` | Draft lines |

Amounts are integers in minor units. Statuses: `draft`, `open`, `paid`, `void`, `expired`, `uncollectible`.

Line `type` values: `custom`, `discount`, `tax`, `credit`, `subscription`, `proration_credit`, `proration_debit`,
`usage`, `overage`. The platform-generated ones are refused by the API with 400 `system_line_type_not_allowed`.
A change to a non-draft invoice answers 409 `invoice_not_draft`; removing a platform-generated line answers 409
`system_line_not_removable`. Both arrive as `error.errorCode`, see [Errors](errors.md#refusal-codes).

Date and bigint-only fields of the API schema (`due_at`, line `period_*`, `quantity_decimal`, `usage_*`, `meter_id`)
are not offered: a JSON body cannot carry them.
