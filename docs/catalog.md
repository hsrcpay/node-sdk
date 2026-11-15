# Products and prices

Needs a **secret key**. See [where `account_id` is needed](account-id.md).

## Products

| Method | Request |
|---|---|
| `products.create(params)` | `POST /v1/products` (`account_id` in the body) |
| `products.retrieve(id)` | `GET /v1/products/:id` (includes prices) |
| `products.usage(id)` | `GET /v1/products/:id/usage` |
| `products.list(params?)` | `GET /v1/products` |
| `products.update(id, params)` | `PUT /v1/products/:id` |
| `products.updateStatus(id, status)` | `POST /v1/products/:id/status` |
| `products.delete(id)` | `DELETE /v1/products/:id` |

```ts
const product = await hsrcpay.products.create({
  name: "Pro plan",
  type: "service",
  default_price_data: { type: "recurring", interval: "month", amount: 2900, currency: "USD" },
});
```

- `type` (`service` or `good`) cannot change after creation. Status changes go through `updateStatus`
  (`active`, `inactive`, `archived`; archiving is final). Creating takes only `active` or `inactive`.
- Limits checked on the client: up to 8 https `images`, 15 `marketing_features`, `statement_descriptor` of 5 to 22
  characters, `unit_label` up to 12. `metadata` holds flat scalars: up to 50 keys, keys up to 40 and strings up to 500
  characters.
- `delete` only works for a product without prices that nothing references (`usage(id).deletable`). Archive otherwise.

## Prices

| Method | Request |
|---|---|
| `products.prices.create(productId, params)` | `POST /v1/products/:id/prices` |
| `products.prices.list(productId, params?)` | `GET /v1/products/:id/prices` |
| `products.prices.retrieve(productId, priceId)` | `GET /v1/products/:id/prices/:price_id` |
| `products.prices.update(productId, priceId, params)` | `PUT /v1/products/:id/prices/:price_id` |
| `products.prices.updateStatus(productId, priceId, status)` | `POST /v1/products/:id/prices/:price_id/status` |
| `prices.list(params?)` | `GET /v1/prices` (account-wide) |
| `prices.retrieve(priceId)` | `GET /v1/prices/:id` |

```ts
const prices = await hsrcpay.prices.list({ lookup_keys: ["pro-monthly", "pro-yearly"], status: "active" });
```

- Amounts are integers in minor units. A price is one-time or recurring, per-unit or tiered (`graduated` or `volume`),
  optionally metered (needs `meter_id`), with `custom_unit_amount` or `transform_quantity`. The API enforces the
  structural rules and answers 400 when they are broken.
- **Financial fields are immutable.** `update` only accepts `lookup_key`, `name`, `description`, `tax_behavior` (once),
  `meter_id` and `metadata`. Trying to change something fixed answers 400 with `errorCode: "immutable_field"`.
- `lookup_keys` takes up to 10 keys.
- Deleting a price is reserved to the platform and is not available in the SDK. Archive it instead.
