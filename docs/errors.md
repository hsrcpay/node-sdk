# Errors

Every error thrown by the SDK extends `HsrcpayError`.

| Class | When | Useful fields |
|---|---|---|
| `HsrcpayValidationError` | Arguments violate the API contract. Thrown **before** any request. | `issues` (path and message) |
| `HsrcpayApiError` | The API answered with a non-2xx status. | `status`, `code`, `details`, `body` |
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

## API errors

The API returns `{ message, success: false, error: { code, message, details } }`. The SDK maps that to
`HsrcpayApiError`. When a body is not JSON, `message` is the first 200 characters of the body or the status text.

A declined card is **not** an error: `confirm` resolves and `confirmResult.ok` is `false`. Inspect
`confirmResult.latest_attempt` (`decline_class`, `decline_code`, `retryable`) to decide what to do next.
