# Configuration

```ts
new HsrcpayClient({
  apiKey: "sk_test_...",       // required
  baseUrl: "https://api.hsrcpay.com",
  timeoutMs: 30_000,
  maxRetries: 2,
  retryDelayMs: 500,
  validateResponses: false,
  fetch: customFetch,
});
```

| Option | Default | Description |
|---|---|---|
| `apiKey` | required | Secret API key. An empty value throws a `TypeError`. |
| `baseUrl` | `https://api.hsrcpay.com` | API origin. Paths such as `/v1/payments` are appended. |
| `timeoutMs` | `30000` | Per-attempt timeout. Positive integer. |
| `maxRetries` | `2` | Automatic retries. Non-negative integer. See [retries](retries-and-idempotency.md). |
| `retryDelayMs` | `500` | Base of the exponential backoff. |
| `validateResponses` | `false` | Parse every reply with the SDK schemas. See [validation](validation.md). |
| `fetch` | global `fetch` | Custom implementation, for proxies or tests. |
| `dangerouslyAllowBrowser` | `false` | `HsrcpayClient` only. It holds a secret key and refuses to start in a browser unless set. |

`HsrcpayPublicClient` takes the same options except that the key option is called `publishableKey`.
See [Publishable keys and browsers](public-client.md).

## Per-call options

Every method accepts a last argument that overrides the client defaults for that call:

```ts
await hsrcpay.payments.retrieve("pay_1", {}, { timeoutMs: 5_000, maxRetries: 0, signal: controller.signal });
```

| Option | Description |
|---|---|
| `signal` | An `AbortSignal`. Aborting throws `HsrcpayAbortError`. |
| `timeoutMs` | Overrides the client timeout. |
| `maxRetries` | Overrides the client retry budget. |
| `idempotencyKey` | Mutating calls only. Sent as the `Idempotency-Key` header. |
