# Retries and idempotency

## What is retried

An attempt is retried when it ends in a network failure, a timeout, or one of the statuses `429`, `502`, `503`, `504`.
Other statuses (including every `4xx` and `500`) are never retried.

| Method | Retried? |
|---|---|
| `GET`, `PUT`, `DELETE` | Yes, up to `maxRetries` (default 2). |
| `POST`, `PATCH` | Only when you pass an `idempotencyKey`. |

Between attempts the SDK waits `retryDelayMs * 2^attempt` plus jitter, capped at 8 seconds. A `Retry-After` header
(seconds) on the reply is honored instead.

A call aborted through `signal` is never retried.

## Idempotency keys

```ts
await hsrcpay.payments.confirm(id, params, { idempotencyKey: `order-${orderId}-confirm` });
```

The key is sent as the `Idempotency-Key` header (1 to 255 characters). The API uses it on `payments.confirm`: repeating
the call with the same key on the same payment returns the first result instead of confirming again. Give every
logical operation its own key and reuse it only for retries of that same operation.

Without a key a `POST` is sent once. This is deliberate: a timed-out `POST` may already have been processed.

## Tuning

```ts
new HsrcpayClient({ apiKey, maxRetries: 4, timeoutMs: 10_000 });
await hsrcpay.payments.retrieve(id, {}, { maxRetries: 0 }); // no retries for this call
```
