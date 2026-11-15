# Validation and types

The SDK defines every request and response with [Zod](https://zod.dev). The same schemas validate your input
before a request is sent and produce the TypeScript types, so the two cannot drift.

## Request validation

Parameters are parsed on the client. A violation throws `HsrcpayValidationError` and nothing is sent:

```ts
try {
  await hsrcpay.payments.create({ amount: 5 });
} catch (error) {
  // HsrcpayValidationError: Invalid payments.create params: amount: must be at least 10 (minor units, 10 = 0.10)
}
```

Objects are strict: an unknown key is rejected, which catches typos. Card data is checked for shape only (PAN 12 to
19 digits, CVV 3 or 4 digits, month 1 to 12, year 2 or 4 digits). The API stays the source of truth for business rules.

## Response validation

Off by default, so a new field or enum value on the API never breaks a running integration. Turn it on in tests or
staging to detect drift:

```ts
new HsrcpayClient({ apiKey, validateResponses: true });
```

A mismatch throws `HsrcpayResponseError` with the Zod `issues`. Response objects allow unknown extra fields.

## Types and schemas

Types are inferred from the schemas and exported by name, as are the schemas themselves:

```ts
import { PaymentSchema, type Payment, type CreatePaymentParams } from "@hsrcpay/sdk";

const parsed = PaymentSchema.parse(webhookPayload);
```

`Zod` is a regular dependency of the package.
