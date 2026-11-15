# Customers

| Method | Request |
|---|---|
| `customers.create(params, options?)` | `POST /v1/customers` |
| `customers.retrieve(id)` | `GET /v1/customers/:id` |
| `customers.list(params?)` | `GET /v1/customers` |
| `customers.update(id, params)` | `PATCH /v1/customers/:id` |
| `customers.delete(id)` | `DELETE /v1/customers/:id` (soft delete) |
| `customers.addresses.create(customerId, params)` | `POST /v1/customers/:id/addresses` |
| `customers.addresses.update(customerId, addressId, params)` | `PATCH /v1/customers/:id/addresses/:address_id` |
| `customers.addresses.markPrimary(customerId, addressId)` | `POST /v1/customers/:id/addresses/:address_id/mark-primary` |
| `customers.addresses.delete(customerId, addressId)` | `DELETE /v1/customers/:id/addresses/:address_id` |

All of these need a **secret key**. See [where `account_id` is needed](account-id.md).

```ts
const customer = await hsrcpay.customers.create({
  name: "Ada Lovelace",
  email: "ada@example.com",
  external_reference: "crm-1042", // your own id, unique per account among live customers
  addresses: [{ type: "BILLING", country: "TR", is_default: true, city: "Istanbul" }],
});

const [match] = (await hsrcpay.customers.list({ external_reference: "crm-1042" })).data;
```

## Notes

- `name` is required on create. `email` must be a valid address or `null`. `data` is reserved and only accepts `{}`.
- `update` takes `name`, `email`, `phone`, `country`, `metadata` and the legacy flat fields `address`, `city`, `state`,
  `zip`. Manage structured addresses through `customers.addresses`.
- Address `type` is `BILLING`, `SHIPPING` or `BOTH`. `is_default` is required when creating an address on its own.
- Deleting a customer that still has a subscription answers **409** with `errorCode: "customer_has_active_subscriptions"`.
  See [errors](errors.md).
