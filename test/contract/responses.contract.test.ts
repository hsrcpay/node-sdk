/** Backend-shaped replies must satisfy both the backend DTO schemas and the SDK schemas (and vice versa). */
import { describe, expect, test } from "bun:test";
import {
  ChargeSchema,
  ChargeStatus,
  ConfirmedPaymentSchema,
  Currency,
  HsrcpayClient,
  HsrcpayResponseError,
  PaymentSchema,
  PaymentStatus,
  PaymentTimelineSchema,
  RefundReason,
  RefundSchema,
} from "../../src";
import { attempt, charge, confirmData, payment, refund, timelineEntry } from "../fixtures";
import { fail, mockFetch, ok, page } from "../helpers";
import {
  BACKEND_ENUMS,
  ChargeDtoSchema,
  ConfirmDataSchema,
  PaymentDtoSchema,
  RefundDtoSchema,
  dataEnvelope,
  errorEnvelopeSchema,
  pageEnvelope,
  timelineDataSchema,
} from "./backend-schemas";

const strict = (reply: Response) => {
  const mock = mockFetch(reply);
  return { client: new HsrcpayClient({ apiKey: "k", baseUrl: "http://api.test", fetch: mock.fetch, validateResponses: true }), calls: mock.calls };
};

describe("enum parity with the backend", () => {
  test.each([
    ["Currency", Currency, BACKEND_ENUMS.currency],
    ["PaymentStatus", PaymentStatus, BACKEND_ENUMS.paymentStatus],
    ["ChargeStatus", ChargeStatus, BACKEND_ENUMS.chargeStatus],
    ["RefundReason", RefundReason, BACKEND_ENUMS.refundReason],
  ] as const)("%s has exactly the backend values", (_name, sdk, backend) => {
    expect(Object.values(sdk).sort()).toEqual([...backend].sort());
    expect(Object.keys(sdk).sort()).toEqual(Object.values(sdk).sort());
  });
});

describe("fixtures are valid backend payloads", () => {
  test("payment, charge, refund, confirm and timeline fixtures satisfy the backend schemas", () => {
    expect(PaymentDtoSchema.safeParse(payment()).success).toBe(true);
    expect(PaymentDtoSchema.safeParse(payment({ charges: [charge()], latest_attempt: attempt() })).success).toBe(true);
    expect(ChargeDtoSchema.safeParse(charge()).success).toBe(true);
    expect(RefundDtoSchema.safeParse(refund()).success).toBe(true);
    expect(ConfirmDataSchema.safeParse(confirmData()).success).toBe(true);
    expect(timelineDataSchema.safeParse({ entries: [timelineEntry()], has_more: false }).success).toBe(true);
  });

  test.each(Object.values(PaymentStatus))("payment status %s", (status) => {
    expect(PaymentDtoSchema.safeParse(payment({ status })).success).toBe(true);
    expect(PaymentSchema.safeParse(payment({ status })).success).toBe(true);
  });

  test.each(Object.values(ChargeStatus))("charge status %s", (status) => {
    expect(ChargeDtoSchema.safeParse(charge({ status })).success).toBe(true);
    expect(ChargeSchema.safeParse(charge({ status })).success).toBe(true);
  });

  test.each(Object.values(Currency))("currency %s", (currency) => {
    expect(PaymentSchema.safeParse(payment({ currency })).success).toBe(true);
    expect(RefundSchema.safeParse(refund({ currency })).success).toBe(true);
  });

  test("SDK and backend schemas agree on the same replies", () => {
    for (const sample of [payment(), payment({ status: "SUCCEEDED", charges: [charge()] }), payment({ installments: 3 })]) {
      expect(PaymentSchema.safeParse(sample).success).toBe(PaymentDtoSchema.safeParse(sample).success);
    }
    expect(ConfirmedPaymentSchema.safeParse(confirmData()).success).toBe(true);
    expect(PaymentTimelineSchema.safeParse({ entries: [timelineEntry()], has_more: true }).success).toBe(true);
  });

  test("unknown extra fields are tolerated (the API may add fields)", () => {
    expect(PaymentSchema.safeParse(payment({ brand_new_field: { a: 1 } })).success).toBe(true);
    expect(ChargeSchema.safeParse(charge({ brand_new_field: true })).success).toBe(true);
  });

  test("a missing required field or a bad enum value is rejected", () => {
    const { id: _id, ...noId } = payment();
    expect(PaymentSchema.safeParse(noId).success).toBe(false);
    expect(PaymentSchema.safeParse(payment({ status: "MYSTERY" })).success).toBe(false);
    expect(PaymentSchema.safeParse(payment({ currency: "JPY" })).success).toBe(false);
    expect(RefundSchema.safeParse(refund({ charge_id: undefined })).success).toBe(false);
  });
});

describe("envelopes", () => {
  test("the wire envelopes used by the mocks are the real backend envelopes", async () => {
    expect(dataEnvelope(PaymentDtoSchema).safeParse(await ok(payment()).json()).success).toBe(true);
    expect(pageEnvelope(PaymentDtoSchema).safeParse(await page([payment()]).json()).success).toBe(true);
    expect(errorEnvelopeSchema.safeParse(await fail(404, "nope").json()).success).toBe(true);
  });
});

describe("validateResponses", () => {
  test("passes a valid reply through unchanged", async () => {
    const { client } = strict(ok(confirmData()));
    const result = await client.payments.confirm("pay_1", { payment_method: { id: "pm_1" } });
    expect(result.payment.status).toBe("SUCCEEDED");
    expect(result.confirmResult.ok).toBe(true);
  });

  test("throws HsrcpayResponseError when the API drifts from the schema", async () => {
    const { client } = strict(ok(payment({ status: "MYSTERY" })));
    const error = await client.payments.retrieve("pay_1").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HsrcpayResponseError);
    expect((error as HsrcpayResponseError).issues.length).toBeGreaterThan(0);
    expect((error as HsrcpayResponseError).message).toContain("status");
  });

  test("validates every item of a list", async () => {
    const { client } = strict(page([payment(), payment({ id: undefined })]));
    await expect(client.payments.list()).rejects.toBeInstanceOf(HsrcpayResponseError);
  });

  test("is off by default", async () => {
    const mock = mockFetch(ok({ totally: "different" }));
    const client = new HsrcpayClient({ apiKey: "k", fetch: mock.fetch });
    await expect(client.payments.retrieve("pay_1")).resolves.toEqual({ totally: "different" as never } as never);
  });
});
