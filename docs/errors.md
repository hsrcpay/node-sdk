# Errors

Every error thrown by the SDK extends `HsrcpayError`.

| Class | When | Useful fields |
|---|---|---|
| `HsrcpayValidationError` | Arguments violate the API contract. Thrown **before** any request. | `issues` (path and message) |
| `HsrcpayApiError` | The API answered with a non-2xx status. | `status`, `code`, `errorCode`, `details`, `body` |
| `HsrcpayConnectionError` | No usable HTTP response (network failure, invalid JSON body). | `cause` |
| `HsrcpayTimeoutError` | The attempt exceeded `timeoutMs`. Extends `HsrcpayConnectionError`. | |
| `HsrcpayAbortError` | The caller aborted through `signal`. | |
| `HsrcpayResponseError` | `validateResponses` is on and the reply does not match the schema. | `issues` |

```ts
import { HsrcpayApiError, HsrcpayValidationError } from "@hsrcpay/sdk";

try {
  await hsrcpay.payments.capture(id);
} catch (error) {
  if (error instanceof HsrcpayApiError) {
    console.error(error.status, error.message, error.details);
  } else if (error instanceof HsrcpayValidationError) {
    console.error(error.issues);
  } else {
    throw error;
  }
}
```

## Classifying errors

`classifyError(error)` maps anything the SDK throws to a stable category and a retry hint, so you do not have to match
status codes yourself. It never throws.

```ts
import { classifyError, ErrorKind } from "@hsrcpay/sdk";

try {
  await hsrcpay.customers.delete(id);
} catch (error) {
  const { kind, retryable, status, errorCode } = classifyError(error);
  if (kind === ErrorKind.CONFLICT && errorCode === "customer_has_active_subscriptions") {
    // cancel the subscriptions first
  } else if (retryable) {
    // try again later (mutating calls need an idempotency key to be repeated safely)
  } else {
    throw error;
  }
}
```

| `kind` | Meaning | `retryable` |
|---|---|---|
| `validation` | Arguments rejected on the client, nothing was sent | no |
| `invalid_request` | The API rejected the request (400, 422, other 4xx) | no |
| `authentication` | Missing, invalid or expired API key (401) | no |
| `permission` | The key may not do this (403), for example a publishable key on a secret-key route | no |
| `not_found` | 404 | no |
| `conflict` | The state forbids it (409) | no |
| `rate_limited` | 429 | yes |
| `server` | 5xx | 502, 503, 504 only |
| `network` | No usable response | yes |
| `timeout` | The attempt exceeded `timeoutMs` | yes |
| `aborted` | You aborted through `signal` | no |
| `response_mismatch` | `validateResponses` caught a schema mismatch | no |
| `unknown` | Anything else | no |

`isRetryableError(error)` and `isErrorKind(error, kind)` are shortcuts.

## Refusal codes

A few endpoints answer a bare `{ "code": "..." }` body. The SDK exposes it as `error.errorCode`:

| `errorCode` | Status | Where |
|---|---|---|
| `customer_has_active_subscriptions` | 409 | `customers.delete` |
| `immutable_field` (field in `error.details.field`) | 400 | `products.prices.update` |

Other refusals use the standard error envelope and put their code in `error.details`. For example `payments.confirm`
answers 409 with `details: { code: "payment_outcome_pending" }` while the previous attempt's outcome is still unknown:
confirming again could charge the card twice, so wait and retrieve the payment instead.

## API errors

The API returns `{ message, success: false, error: { code, message, details } }`. The SDK maps that to
`HsrcpayApiError`. When a body is not JSON, `message` is the first 200 characters of the body or the status text.

A declined card is **not** an error: `confirm` resolves and `confirmResult.ok` is `false`. Inspect
`confirmResult.latest_attempt` (`decline_class`, `decline_code`, `retryable`) to decide what to do next.
