# Where `account_id` is needed

With an API key the account is the key's account, so **`account_id` is never required**. It only exists for callers
that can act on several accounts. When you do pass it, it travels in one of three places, mirroring the API:

| Where | Calls |
|---|---|
| **Query** | `payments.create`, `payments.list`, `payments.retrieve`, `charges.list`, `refunds.list`, `customers.create`, `customers.list`, `products.list`, `prices.list`, `checkoutSessions.create`, `checkoutSessions.list`, `checkoutSessions.search`, `subscriptions.create`, `subscriptions.list`, `invoices.create`, `invoices.list`, and **every** `disputes.*` call |
| **Request body** | `products.create` only |
| **Nowhere** | everything else that takes a resource id: `retrieve`, `update`, `delete`, `confirm`, `capture`, `cancel`, `refund`, `timeline`, address calls, `products.prices.*`, `checkoutSessions.retrieve/update/expire`, `subscriptions.retrieve/update/cancel/resume/changes.*`, `invoices.retrieve/update/delete/finalize/markPaid/void/lines.*` and the whole publishable-key client |

For calls in the last row the id already identifies the account, so the SDK has no `account_id` parameter and the
strict parameter objects reject it. Disputes are the exception among id-based calls: the API accepts an optional
`account_id` query on all of them.

`checkoutSessions.search` is the exception to "never required": the API scopes the search to one account and requires
both `q` and `account_id`.

If neither the key nor the call identifies an account, the API answers `400 Account ID is required`.
