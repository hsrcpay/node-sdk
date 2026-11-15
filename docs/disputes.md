# Disputes

A dispute opens when a cardholder contests a charge. You answer with evidence before `evidence_due_by`; the issuer then
decides. Statuses: `needs_response`, `under_review`, `won`, `lost`.

```ts
const { data } = await hsrcpay.disputes.list({ status: "needs_response" });

await hsrcpay.disputes.update(data[0].id, {
  evidence: { product_description: "Annual plan", customer_email: "ada@example.com" },
  submit: true, // sends the evidence; the dispute moves to under_review and the evidence locks
});
```

| Method | Does |
|---|---|
| `list({ status?, payment_id?, page?, limit? })` | Newest first |
| `retrieve(id)` | One dispute with its evidence |
| `update(id, { evidence?, metadata?, submit? })` | Evidence fields merge; an empty string clears one. `submit: true` sends it |
| `accept(id)` | Concede without evidence: closes as `lost`, cannot be reopened |
| `createTest({ payment_id, reason?, amount?, metadata? })` | **Test keys only.** Opens a dispute on a captured payment |
| `closeTest(id, { outcome: "won" \| "lost" })` | **Test keys only.** Plays the issuer's decision |

Evidence fields: `product_description`, `customer_name`, `customer_email`, `customer_communication`,
`shipping_carrier`, `shipping_tracking_number`, `shipping_date`, `refund_policy`, `cancellation_policy`,
`uncategorized_text`. Free-text fields hold up to 5000 characters, references up to 500. Unknown keys are rejected.

Every call accepts an optional `account_id` (query), see [account_id](account-id.md). Refusals are listed in
[Errors](errors.md#refusal-codes).

Rehearse the flow with a `sk_test_` key: capture a payment, `createTest`, `update` with `submit: true`, then `closeTest`.
