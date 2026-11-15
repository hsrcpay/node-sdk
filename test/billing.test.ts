/** Disputes, subscriptions and invoices: request shape, validation, replies and backend contract parity. */
import { describe, expect, test } from "bun:test";
import {
  DisputeOutcome,
  DisputeReason,
  DisputeSchema,
  DisputeStatus,
  DunningStatus,
  HsrcpayApiError,
  HsrcpayClient,
  HsrcpayValidationError,
  InvoiceCollectionBehavior,
  InvoiceLineItemType,
  InvoiceReason,
  InvoiceSchema,
  InvoiceStatus,
  PaymentDeclineType,
  ProrationBehavior,
  SubscriptionChangeStatus,
  SubscriptionChangeTiming,
  SubscriptionChangeType,
  SubscriptionItemStatus,
  SubscriptionSchema,
  SubscriptionStatus,
} from "../src";
import {
  BILLING_ENUMS,
  DisputeAccountQuerySchema,
  DisputeCloseBodySchema,
  DisputeCreateBodySchema,
  DisputeDtoSchema,
  DisputeListQuerySchema,
  DisputeUpdateBodySchema,
  InvoiceCreateBodySchema,
  InvoiceCreateQuerySchema,
  InvoiceDtoSchema,
  InvoiceLineCreateBodySchema,
  InvoiceLineUpdateBodySchema,
  InvoiceListQuerySchema,
  InvoiceUpdateBodySchema,
  SubscriptionCancelBodySchema,
  SubscriptionChangeBodySchema,
  SubscriptionChangeCancelBodySchema,
  SubscriptionChangeDtoSchema,
  SubscriptionChangePreviewDtoSchema,
  SubscriptionCreateBodySchema,
  SubscriptionCreateQuerySchema,
  SubscriptionDtoSchema,
  SubscriptionListQuerySchema,
  SubscriptionUpdateBodySchema,
} from "./contract/backend-schemas.billing";
import {
  dispute,
  dunningState,
  invoice,
  invoiceLine,
  subscription,
  subscriptionChange,
  subscriptionChangePreview,
  subscriptionItem,
} from "./fixtures.billing";
import { mockFetch, ok, page, queryOf } from "./helpers";

const setup = (...replies: Parameters<typeof mockFetch>) => {
  const mock = mockFetch(...replies);
  return {
    client: new HsrcpayClient({ apiKey: "sk_test_k", baseUrl: "http://api.test", fetch: mock.fetch, retryDelayMs: 1 }),
    calls: mock.calls,
  };
};

const invalid = (run: () => unknown, fragment: string) => {
  try {
    run();
  } catch (e) {
    expect(e).toBeInstanceOf(HsrcpayValidationError);
    expect((e as Error).message).toContain(fragment);
    return;
  }
  throw new Error("expected a validation error");
};

const noContent = () => new Response(null, { status: 204 });
const bare = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("enum parity with the backend", () => {
  test.each([
    ["DisputeStatus", DisputeStatus, BILLING_ENUMS.disputeStatus],
    ["DisputeReason", DisputeReason, BILLING_ENUMS.disputeReason],
    ["DisputeOutcome", DisputeOutcome, BILLING_ENUMS.disputeOutcome],
    ["SubscriptionStatus", SubscriptionStatus, BILLING_ENUMS.subscriptionStatus],
    ["SubscriptionItemStatus", SubscriptionItemStatus, BILLING_ENUMS.subscriptionItemStatus],
    ["DunningStatus", DunningStatus, BILLING_ENUMS.dunningStatus],
    ["PaymentDeclineType", PaymentDeclineType, BILLING_ENUMS.declineType],
    ["SubscriptionChangeType", SubscriptionChangeType, BILLING_ENUMS.changeType],
    ["SubscriptionChangeStatus", SubscriptionChangeStatus, BILLING_ENUMS.changeStatus],
    ["SubscriptionChangeTiming", SubscriptionChangeTiming, BILLING_ENUMS.changeTiming],
    ["ProrationBehavior", ProrationBehavior, BILLING_ENUMS.prorationBehavior],
    ["InvoiceCollectionBehavior", InvoiceCollectionBehavior, BILLING_ENUMS.collectionBehavior],
    ["InvoiceStatus", InvoiceStatus, BILLING_ENUMS.invoiceStatus],
    ["InvoiceReason", InvoiceReason, BILLING_ENUMS.invoiceReason],
    ["InvoiceLineItemType", InvoiceLineItemType, BILLING_ENUMS.lineType],
  ] as const)("%s has exactly the backend values", (_name, sdk, backend) => {
    expect(Object.values(sdk).sort()).toEqual([...backend].sort());
  });
});

describe("response fixtures agree on both sides", () => {
  test.each(BILLING_ENUMS.disputeStatus)("dispute status %s", (status) => {
    expect(DisputeDtoSchema.safeParse(dispute({ status })).success).toBe(true);
    expect(DisputeSchema.safeParse(dispute({ status })).success).toBe(true);
  });

  test.each(BILLING_ENUMS.disputeReason)("dispute reason %s", (reason) => {
    expect(DisputeDtoSchema.safeParse(dispute({ reason })).success).toBe(true);
    expect(DisputeSchema.safeParse(dispute({ reason })).success).toBe(true);
  });

  test("dispute with evidence and a closed state", () => {
    const sample = dispute({
      status: "lost",
      evidence: { product_description: "A plan", customer_email: "a@b.co" },
      provider_reference: "prov_1",
      submitted_at: "2026-01-02T00:00:00.000Z",
      closed_at: "2026-01-03T00:00:00.000Z",
      metadata: { ticket: "42" },
    });
    expect(DisputeDtoSchema.safeParse(sample).success).toBe(true);
    expect(DisputeSchema.safeParse(sample).success).toBe(true);
  });

  test.each(BILLING_ENUMS.subscriptionStatus)("subscription status %s", (status) => {
    expect(SubscriptionDtoSchema.safeParse(subscription({ status })).success).toBe(true);
    expect(SubscriptionSchema.safeParse(subscription({ status })).success).toBe(true);
  });

  test("subscription with a trial, items and a dunning state", () => {
    const sample = subscription({
      status: "past_due",
      trial_start_at: "2026-01-01T00:00:00.000Z",
      trial_end_at: "2026-01-15T00:00:00.000Z",
      collection_behavior: "email",
      days_until_due: 7,
      cancel_at_period_end: true,
      items: [subscriptionItem(), subscriptionItem({ id: "si_2", status: "scheduled", quantity: 3 })],
      dunning_state: dunningState(),
    });
    expect(SubscriptionDtoSchema.safeParse(sample).success).toBe(true);
    expect(SubscriptionSchema.safeParse(sample).success).toBe(true);
  });

  test.each(BILLING_ENUMS.changeStatus)("subscription change status %s", (status) => {
    expect(SubscriptionChangeDtoSchema.safeParse(subscriptionChange({ status })).success).toBe(true);
  });

  test("change preview", () => {
    expect(SubscriptionChangePreviewDtoSchema.safeParse(subscriptionChangePreview()).success).toBe(true);
  });

  test.each(BILLING_ENUMS.invoiceStatus)("invoice status %s", (status) => {
    expect(InvoiceDtoSchema.safeParse(invoice({ status })).success).toBe(true);
    expect(InvoiceSchema.safeParse(invoice({ status })).success).toBe(true);
  });

  test.each(BILLING_ENUMS.lineType)("invoice line type %s", (type) => {
    const sample = invoice({ lines: [invoiceLine({ type, amount: -500 })] });
    expect(InvoiceDtoSchema.safeParse(sample).success).toBe(true);
    expect(InvoiceSchema.safeParse(sample).success).toBe(true);
  });

  test("metered line with fractional usage", () => {
    const sample = invoice({
      lines: [invoiceLine({ type: "usage", quantity: null, quantity_decimal: "12.5", usage_quantity: 12, meter_id: "mtr_1" })],
    });
    expect(InvoiceDtoSchema.safeParse(sample).success).toBe(true);
    expect(InvoiceSchema.safeParse(sample).success).toBe(true);
  });
});

describe("disputes", () => {
  test("list sends the filters as query and returns a page", async () => {
    const { client, calls } = setup(page([dispute()]));
    const result = await client.disputes.list({ status: "needs_response", payment_id: "pay_1", page: 2, limit: 5, account_id: "acc_1" });
    expect(calls[0]!.method).toBe("GET");
    expect(new URL(calls[0]!.url).pathname).toBe("/v1/disputes");
    expect(queryOf(calls[0]!.url)).toEqual({ status: "needs_response", payment_id: "pay_1", page: "2", limit: "5", account_id: "acc_1" });
    expect(DisputeListQuerySchema.safeParse(queryOf(calls[0]!.url)).success).toBe(true);
    expect(result.data[0]!.id).toBe("dp_1");
  });

  test("list rejects an unknown status", () => {
    const { client } = setup(page([]));
    invalid(() => client.disputes.list({ status: "open" as never }), "disputes.list params");
  });

  test("retrieve uses the id path and no body", async () => {
    const { client, calls } = setup(ok(dispute()));
    const result = await client.disputes.retrieve("dp_1");
    expect(calls[0]!.method).toBe("GET");
    expect(new URL(calls[0]!.url).pathname).toBe("/v1/disputes/dp_1");
    expect(queryOf(calls[0]!.url)).toEqual({});
    expect(result.status).toBe("needs_response");
  });

  test("retrieve forwards account_id as query", async () => {
    const { client, calls } = setup(ok(dispute()));
    await client.disputes.retrieve("dp_1", { account_id: "acc_9" });
    expect(DisputeAccountQuerySchema.parse(queryOf(calls[0]!.url))).toEqual({ account_id: "acc_9" });
  });

  test("retrieve encodes the id and rejects an empty one", async () => {
    const { client, calls } = setup(ok(dispute()));
    await client.disputes.retrieve("a/b");
    expect(calls[0]!.url).toContain("/v1/disputes/a%2Fb");
    invalid(() => client.disputes.retrieve(" "), "disputeId");
  });

  test("update patches evidence flat in the body", async () => {
    const { client, calls } = setup(ok(dispute({ evidence: { product_description: "x" } })));
    await client.disputes.update("dp_1", {
      evidence: { product_description: "x", shipping_carrier: "ups" },
      metadata: { ticket: "42" },
      submit: true,
    });
    const sent = calls[0]!;
    expect(sent.method).toBe("PATCH");
    expect(new URL(sent.url).pathname).toBe("/v1/disputes/dp_1");
    expect(sent.body).toEqual({
      evidence: { product_description: "x", shipping_carrier: "ups" },
      metadata: { ticket: "42" },
      submit: true,
    });
    expect(DisputeUpdateBodySchema.safeParse(sent.body).success).toBe(true);
  });

  test("update moves account_id to the query, out of the body", async () => {
    const { client, calls } = setup(ok(dispute()));
    await client.disputes.update("dp_1", { account_id: "acc_2", metadata: { a: "b" } });
    expect(queryOf(calls[0]!.url).account_id).toBe("acc_2");
    expect(calls[0]!.body).toEqual({ metadata: { a: "b" } });
  });

  test("update lets an empty string clear a field", async () => {
    const { client, calls } = setup(ok(dispute()));
    await client.disputes.update("dp_1", { evidence: { refund_policy: "" } });
    expect(DisputeUpdateBodySchema.safeParse(calls[0]!.body).success).toBe(true);
  });

  test("update enforces evidence length limits and rejects unknown evidence keys", () => {
    const { client } = setup(ok(dispute()));
    invalid(() => client.disputes.update("dp_1", { evidence: { product_description: "x".repeat(5001) } }), "disputes.update params");
    invalid(() => client.disputes.update("dp_1", { evidence: { customer_name: "x".repeat(501) } }), "disputes.update params");
    invalid(() => client.disputes.update("dp_1", { evidence: { nope: "x" } as never }), "disputes.update params");
    invalid(() => client.disputes.update("dp_1", { metadata: { a: 1 } as never }), "disputes.update params");
    invalid(() => client.disputes.update("dp_1", { submit: "yes" as never }), "disputes.update params");
  });

  test("update accepts evidence at the exact limits", async () => {
    const { client, calls } = setup(ok(dispute()));
    await client.disputes.update("dp_1", { evidence: { product_description: "x".repeat(5000), customer_name: "y".repeat(500) } });
    expect(DisputeUpdateBodySchema.safeParse(calls[0]!.body).success).toBe(true);
  });

  test("a closed evidence window surfaces as a 409 with its code in details", async () => {
    const reply = new Response(
      JSON.stringify({ message: "closed", success: false, error: { code: 409, message: "closed", details: { code: "dispute_evidence_window_closed" } } }),
      { status: 409, headers: { "content-type": "application/json" } },
    );
    const { client } = setup(reply);
    const error = await client.disputes.update("dp_1", { submit: true }).catch((e) => e);
    expect(error).toBeInstanceOf(HsrcpayApiError);
    expect((error as HsrcpayApiError).status).toBe(409);
    expect((error as HsrcpayApiError).details).toEqual({ code: "dispute_evidence_window_closed" });
  });

  test("accept posts to /accept", async () => {
    const { client, calls } = setup(ok(dispute({ status: "lost" })));
    const result = await client.disputes.accept("dp_1");
    expect(calls[0]!.method).toBe("POST");
    expect(new URL(calls[0]!.url).pathname).toBe("/v1/disputes/dp_1/accept");
    expect(result.status).toBe("lost");
  });

  test("createTest posts the body and keeps account_id in the query", async () => {
    const { client, calls } = setup(ok(dispute(), 201));
    await client.disputes.createTest({ account_id: "acc_1", payment_id: "pay_1", reason: "fraudulent", amount: 500, metadata: { a: "b" } });
    const sent = calls[0]!;
    expect(sent.method).toBe("POST");
    expect(new URL(sent.url).pathname).toBe("/v1/disputes");
    expect(queryOf(sent.url).account_id).toBe("acc_1");
    expect(sent.body).toEqual({ payment_id: "pay_1", reason: "fraudulent", amount: 500, metadata: { a: "b" } });
    expect(DisputeCreateBodySchema.safeParse(sent.body).success).toBe(true);
  });

  test("createTest validates payment, reason and amount", () => {
    const { client } = setup(ok(dispute()));
    invalid(() => client.disputes.createTest({} as never), "disputes.createTest params");
    invalid(() => client.disputes.createTest({ payment_id: "" }), "disputes.createTest params");
    invalid(() => client.disputes.createTest({ payment_id: "p", reason: "bad" as never }), "disputes.createTest params");
    invalid(() => client.disputes.createTest({ payment_id: "p", amount: 0 }), "disputes.createTest params");
    invalid(() => client.disputes.createTest({ payment_id: "p", amount: 1.5 }), "disputes.createTest params");
  });

  test("createTest in live mode surfaces dispute_test_mode_only", async () => {
    const { client } = setup(
      new Response(
        JSON.stringify({ message: "test only", success: false, error: { code: 403, message: "test only", details: { code: "dispute_test_mode_only" } } }),
        { status: 403, headers: { "content-type": "application/json" } },
      ),
    );
    const error = await client.disputes.createTest({ payment_id: "p" }).catch((e) => e);
    expect((error as HsrcpayApiError).status).toBe(403);
  });

  test.each(BILLING_ENUMS.disputeOutcome)("closeTest %s", async (outcome) => {
    const { client, calls } = setup(ok(dispute({ status: outcome })));
    await client.disputes.closeTest("dp_1", { outcome });
    expect(calls[0]!.method).toBe("POST");
    expect(new URL(calls[0]!.url).pathname).toBe("/v1/disputes/dp_1/close");
    expect(calls[0]!.body).toEqual({ outcome });
    expect(DisputeCloseBodySchema.safeParse(calls[0]!.body).success).toBe(true);
  });

  test("closeTest requires a valid outcome", () => {
    const { client } = setup(ok(dispute()));
    invalid(() => client.disputes.closeTest("dp_1", {} as never), "disputes.closeTest params");
    invalid(() => client.disputes.closeTest("dp_1", { outcome: "draw" as never }), "disputes.closeTest params");
  });

  test("sends the idempotency key on mutations", async () => {
    const { client, calls } = setup(ok(dispute()));
    await client.disputes.accept("dp_1", {}, { idempotencyKey: "k-1" });
    expect(calls[0]!.headers["Idempotency-Key"] ?? calls[0]!.headers["idempotency-key"]).toBe("k-1");
  });
});

describe("subscriptions", () => {
  test("create posts the body and moves account_id to the query", async () => {
    const { client, calls } = setup(ok(subscription(), 201));
    const result = await client.subscriptions.create({
      account_id: "acc_1",
      customer_id: "cus_1",
      currency: "TRY",
      items: [{ price_id: "price_1", quantity: 2, metadata: { seat: "a" } }, { price_id: "price_2" }],
      payment_method_id: "pm_1",
      trial_period_days: 14,
      collection_behavior: "email",
      days_until_due: 7,
      metadata: { plan: "pro" },
    });
    const sent = calls[0]!;
    expect(sent.method).toBe("POST");
    expect(new URL(sent.url).pathname).toBe("/v1/subscriptions");
    expect(SubscriptionCreateQuerySchema.parse(queryOf(sent.url))).toEqual({ account_id: "acc_1" });
    expect((sent.body as { account_id?: string }).account_id).toBeUndefined();
    expect(SubscriptionCreateBodySchema.safeParse(sent.body).success).toBe(true);
    expect(result.id).toBe("sub_1");
  });

  test("create without account_id sends no query", async () => {
    const { client, calls } = setup(ok(subscription(), 201));
    await client.subscriptions.create({ customer_id: "cus_1", currency: "USD", items: [{ price_id: "p" }] });
    expect(queryOf(calls[0]!.url)).toEqual({});
  });

  test("create validates items, trial, currency and days until due", () => {
    const { client } = setup(ok(subscription()));
    const base = { customer_id: "cus_1", currency: "TRY" as const, items: [{ price_id: "p" }] };
    invalid(() => client.subscriptions.create({ ...base, items: [] }), "subscriptions.create params");
    invalid(() => client.subscriptions.create({ ...base, items: Array.from({ length: 21 }, () => ({ price_id: "p" })) }), "subscriptions.create params");
    invalid(() => client.subscriptions.create({ ...base, items: [{ price_id: "" }] }), "subscriptions.create params");
    invalid(() => client.subscriptions.create({ ...base, items: [{ price_id: "p", quantity: 0 }] }), "subscriptions.create params");
    invalid(() => client.subscriptions.create({ ...base, items: [{ price_id: "p", quantity: 1.5 }] }), "subscriptions.create params");
    invalid(() => client.subscriptions.create({ ...base, trial_period_days: 0 }), "subscriptions.create params");
    invalid(() => client.subscriptions.create({ ...base, trial_period_days: 731 }), "subscriptions.create params");
    invalid(() => client.subscriptions.create({ ...base, days_until_due: -1 }), "subscriptions.create params");
    invalid(() => client.subscriptions.create({ ...base, days_until_due: 366 }), "subscriptions.create params");
    invalid(() => client.subscriptions.create({ ...base, currency: "JPY" as never }), "subscriptions.create params");
    invalid(() => client.subscriptions.create({ ...base, customer_id: "" }), "subscriptions.create params");
    invalid(() => client.subscriptions.create({ ...base, collection_behavior: "sms" as never }), "subscriptions.create params");
    invalid(() => client.subscriptions.create({ ...base, billing_cycle_anchor: "2026-02-01" } as never), "subscriptions.create params");
  });

  test("create accepts the limits and nulls", async () => {
    const { client, calls } = setup(ok(subscription(), 201));
    await client.subscriptions.create({
      customer_id: "c",
      currency: "EUR",
      items: Array.from({ length: 20 }, () => ({ price_id: "p" })),
      trial_period_days: 730,
      days_until_due: 365,
      payment_method_id: null,
      collection_behavior: null,
    });
    expect(SubscriptionCreateBodySchema.safeParse(calls[0]!.body).success).toBe(true);
  });

  test("list sends filters as query", async () => {
    const { client, calls } = setup(page([subscription()]));
    await client.subscriptions.list({ customer_id: "cus_1", status: "past_due", page: 3, limit: 20, account_id: "acc_1" });
    expect(queryOf(calls[0]!.url)).toEqual({ customer_id: "cus_1", status: "past_due", page: "3", limit: "20", account_id: "acc_1" });
    expect(SubscriptionListQuerySchema.safeParse(queryOf(calls[0]!.url)).success).toBe(true);
  });

  test("list rejects an unknown status and bad paging", () => {
    const { client } = setup(page([]));
    invalid(() => client.subscriptions.list({ status: "gone" as never }), "subscriptions.list params");
    invalid(() => client.subscriptions.list({ page: 0 }), "subscriptions.list params");
    invalid(() => client.subscriptions.list({ limit: -1 }), "subscriptions.list params");
  });

  test("retrieve has no account_id", async () => {
    const { client, calls } = setup(ok(subscription()));
    await client.subscriptions.retrieve("sub_1");
    expect(new URL(calls[0]!.url).pathname).toBe("/v1/subscriptions/sub_1");
    expect(queryOf(calls[0]!.url)).toEqual({});
    invalid(() => client.subscriptions.retrieve(""), "subscriptionId");
  });

  test("update wraps the fields in a subscription object", async () => {
    const { client, calls } = setup(ok(subscription({ payment_method_id: "pm_2" })));
    await client.subscriptions.update("sub_1", { payment_method_id: "pm_2", metadata: { a: 1 }, collection_behavior: "manual", days_until_due: 10 });
    expect(calls[0]!.method).toBe("PATCH");
    expect(new URL(calls[0]!.url).pathname).toBe("/v1/subscriptions/sub_1");
    expect(calls[0]!.body).toEqual({
      subscription: { payment_method_id: "pm_2", metadata: { a: 1 }, collection_behavior: "manual", days_until_due: 10 },
    });
    expect(SubscriptionUpdateBodySchema.safeParse(calls[0]!.body).success).toBe(true);
  });

  test("update validates its fields", () => {
    const { client } = setup(ok(subscription()));
    invalid(() => client.subscriptions.update("sub_1", { days_until_due: 400 }), "subscriptions.update params");
    invalid(() => client.subscriptions.update("sub_1", { items: [] } as never), "subscriptions.update params");
    invalid(() => client.subscriptions.update("sub_1", { payment_method_id: "" }), "subscriptions.update params");
  });

  test("an empty update still sends the wrapper the API requires", async () => {
    const { client, calls } = setup(ok(subscription()));
    await client.subscriptions.update("sub_1", {});
    expect(calls[0]!.body).toEqual({ subscription: {} });
    expect(SubscriptionUpdateBodySchema.safeParse(calls[0]!.body).success).toBe(true);
  });

  test("cancel defaults to an empty cancel object", async () => {
    const { client, calls } = setup(ok(subscription({ status: "canceled" })));
    await client.subscriptions.cancel("sub_1");
    expect(calls[0]!.method).toBe("POST");
    expect(new URL(calls[0]!.url).pathname).toBe("/v1/subscriptions/sub_1/cancel");
    expect(calls[0]!.body).toEqual({ cancel: {} });
    expect(SubscriptionCancelBodySchema.safeParse(calls[0]!.body).success).toBe(true);
  });

  test("cancel at period end and immediate prorated cancel", async () => {
    const { client, calls } = setup(ok(subscription()));
    await client.subscriptions.cancel("sub_1", { cancel_at_period_end: true, canceled_reason: "too pricey" });
    await client.subscriptions.cancel("sub_1", { prorate: true });
    expect(calls[0]!.body).toEqual({ cancel: { cancel_at_period_end: true, canceled_reason: "too pricey" } });
    expect(calls[1]!.body).toEqual({ cancel: { prorate: true } });
    for (const call of calls) expect(SubscriptionCancelBodySchema.safeParse(call.body).success).toBe(true);
  });

  test("cancel rejects prorate together with cancel_at_period_end, like the API", () => {
    const { client } = setup(ok(subscription()));
    invalid(() => client.subscriptions.cancel("sub_1", { cancel_at_period_end: true, prorate: true }), "prorate");
    invalid(() => client.subscriptions.cancel("sub_1", { canceled_reason: "x".repeat(501) }), "subscriptions.cancel params");
  });

  test("cancel accepts prorate with cancel_at_period_end false", async () => {
    const { client, calls } = setup(ok(subscription()));
    await client.subscriptions.cancel("sub_1", { cancel_at_period_end: false, prorate: true });
    expect(calls).toHaveLength(1);
  });

  test("resume posts to /resume", async () => {
    const { client, calls } = setup(ok(subscription()));
    await client.subscriptions.resume("sub_1");
    expect(calls[0]!.method).toBe("POST");
    expect(new URL(calls[0]!.url).pathname).toBe("/v1/subscriptions/sub_1/resume");
  });

  test("a 409 from cancel is a conflict ApiError", async () => {
    const { client } = setup(bare(409, { message: "x", success: false, error: { code: 409, message: "x", details: null } }));
    const error = await client.subscriptions.cancel("sub_1").catch((e) => e);
    expect(error).toBeInstanceOf(HsrcpayApiError);
    expect((error as HsrcpayApiError).status).toBe(409);
  });

  describe("changes", () => {
    test("list returns a plain array", async () => {
      const { client, calls } = setup(ok([subscriptionChange(), subscriptionChange({ id: "sc_2", status: "canceled" })]));
      const changes = await client.subscriptions.changes.list("sub_1");
      expect(calls[0]!.method).toBe("GET");
      expect(new URL(calls[0]!.url).pathname).toBe("/v1/subscriptions/sub_1/changes");
      expect(changes.map((c) => c.id)).toEqual(["sc_1", "sc_2"]);
    });

    test("schedule posts the change request", async () => {
      const { client, calls } = setup(ok(subscriptionChange(), 201));
      await client.subscriptions.changes.schedule("sub_1", {
        change_type: "replace_item",
        item_id: "si_1",
        price_id: "price_2",
        quantity: 3,
        timing: "period_end",
        proration_behavior: "none",
      });
      expect(calls[0]!.method).toBe("POST");
      expect(new URL(calls[0]!.url).pathname).toBe("/v1/subscriptions/sub_1/changes");
      expect(SubscriptionChangeBodySchema.safeParse(calls[0]!.body).success).toBe(true);
      expect(calls[0]!.body).toMatchObject({ change_type: "replace_item", timing: "period_end" });
    });

    test.each(BILLING_ENUMS.changeType)("schedule accepts change_type %s", async (change_type) => {
      const { client, calls } = setup(ok(subscriptionChange({ change_type }), 201));
      await client.subscriptions.changes.schedule("sub_1", { change_type });
      expect(SubscriptionChangeBodySchema.safeParse(calls[0]!.body).success).toBe(true);
    });

    test.each(BILLING_ENUMS.prorationBehavior)("schedule accepts proration_behavior %s", async (proration_behavior) => {
      const { client, calls } = setup(ok(subscriptionChange(), 201));
      await client.subscriptions.changes.schedule("sub_1", { change_type: "quantity_change", item_id: "si_1", quantity: 2, proration_behavior });
      expect(SubscriptionChangeBodySchema.safeParse(calls[0]!.body).success).toBe(true);
    });

    test("schedule validates the request", () => {
      const { client } = setup(ok(subscriptionChange()));
      invalid(() => client.subscriptions.changes.schedule("sub_1", {} as never), "subscriptions.changes.schedule params");
      invalid(() => client.subscriptions.changes.schedule("sub_1", { change_type: "swap" as never }), "subscriptions.changes.schedule params");
      invalid(() => client.subscriptions.changes.schedule("sub_1", { change_type: "add_item", quantity: 0 }), "subscriptions.changes.schedule params");
      invalid(() => client.subscriptions.changes.schedule("sub_1", { change_type: "add_item", quantity: 1_000_001 }), "subscriptions.changes.schedule params");
      invalid(() => client.subscriptions.changes.schedule("sub_1", { change_type: "add_item", timing: "later" as never }), "subscriptions.changes.schedule params");
      invalid(() => client.subscriptions.changes.schedule("", { change_type: "add_item" }), "subscriptionId");
    });

    test("schedule accepts the quantity ceiling", async () => {
      const { client, calls } = setup(ok(subscriptionChange(), 201));
      await client.subscriptions.changes.schedule("sub_1", { change_type: "add_item", price_id: "p", quantity: 1_000_000 });
      expect(SubscriptionChangeBodySchema.safeParse(calls[0]!.body).success).toBe(true);
    });

    test("preview posts to /changes/preview and returns amounts", async () => {
      const { client, calls } = setup(ok(subscriptionChangePreview({ amount_due_now: 750, credit_amount: 120 })));
      const preview = await client.subscriptions.changes.preview("sub_1", { change_type: "replace_item", item_id: "si_1", price_id: "price_2" });
      expect(new URL(calls[0]!.url).pathname).toBe("/v1/subscriptions/sub_1/changes/preview");
      expect(SubscriptionChangeBodySchema.safeParse(calls[0]!.body).success).toBe(true);
      expect(preview.amount_due_now).toBe(750);
      expect(preview.credit_amount).toBe(120);
    });

    test("cancel posts to the change's cancel path", async () => {
      const { client, calls } = setup(ok(subscriptionChange({ status: "canceled" })));
      await client.subscriptions.changes.cancel("sub_1", "sc_1", { canceled_reason: "changed my mind" });
      expect(calls[0]!.method).toBe("POST");
      expect(new URL(calls[0]!.url).pathname).toBe("/v1/subscriptions/sub_1/changes/sc_1/cancel");
      expect(calls[0]!.body).toEqual({ canceled_reason: "changed my mind" });
      expect(SubscriptionChangeCancelBodySchema.safeParse(calls[0]!.body).success).toBe(true);
    });

    test("cancel without a reason sends an empty object", async () => {
      const { client, calls } = setup(ok(subscriptionChange({ status: "canceled" })));
      await client.subscriptions.changes.cancel("sub_1", "sc_1");
      expect(calls[0]!.body).toEqual({});
      expect(SubscriptionChangeCancelBodySchema.safeParse(calls[0]!.body).success).toBe(true);
    });

    test("cancel validates ids and the reason length", () => {
      const { client } = setup(ok(subscriptionChange()));
      invalid(() => client.subscriptions.changes.cancel("", "sc_1"), "subscriptionId");
      invalid(() => client.subscriptions.changes.cancel("sub_1", ""), "changeId");
      invalid(() => client.subscriptions.changes.cancel("sub_1", "sc_1", { canceled_reason: "x".repeat(501) }), "subscriptions.changes.cancel params");
    });
  });
});

describe("invoices", () => {
  test("create posts the body and moves account_id to the query", async () => {
    const { client, calls } = setup(ok(invoice(), 201));
    const result = await client.invoices.create({
      account_id: "acc_1",
      customer_id: "cus_1",
      currency: "TRY",
      reason: "manual",
      description: "Consulting",
      metadata: { po: "7" },
      subscription_id: null,
      lines: [{ type: "custom", description: "Setup", quantity: 2, unit_amount: 500, amount: 1000, currency: "TRY", metadata: { a: 1 } }],
    });
    const sent = calls[0]!;
    expect(sent.method).toBe("POST");
    expect(new URL(sent.url).pathname).toBe("/v1/invoices");
    expect(InvoiceCreateQuerySchema.parse(queryOf(sent.url))).toEqual({ account_id: "acc_1" });
    expect((sent.body as { account_id?: string }).account_id).toBeUndefined();
    expect(InvoiceCreateBodySchema.safeParse(sent.body).success).toBe(true);
    expect(result.status).toBe("draft");
  });

  test("create validates the invoice and its lines", () => {
    const { client } = setup(ok(invoice()));
    const base = { customer_id: "cus_1", currency: "TRY" as const };
    invalid(() => client.invoices.create({} as never), "invoices.create params");
    invalid(() => client.invoices.create({ ...base, currency: "JPY" as never }), "invoices.create params");
    invalid(() => client.invoices.create({ ...base, reason: "gift" as never }), "invoices.create params");
    invalid(() => client.invoices.create({ ...base, due_at: "2026-02-01" } as never), "invoices.create params");
    invalid(() => client.invoices.create({ ...base, lines: [{ type: "custom", description: "x", amount: 1.5, currency: "TRY" }] }), "invoices.create params");
    invalid(() => client.invoices.create({ ...base, lines: [{ type: "fee" as never, description: "x", amount: 1, currency: "TRY" }] }), "invoices.create params");
    invalid(() => client.invoices.create({ ...base, lines: [{ type: "custom", amount: 1, currency: "TRY" } as never] }), "invoices.create params");
  });

  test.each(BILLING_ENUMS.invoiceReason)("create accepts reason %s", async (reason) => {
    const { client, calls } = setup(ok(invoice({ reason }), 201));
    await client.invoices.create({ customer_id: "c", currency: "USD", reason });
    expect(InvoiceCreateBodySchema.safeParse(calls[0]!.body).success).toBe(true);
  });

  test("list sends filters as query", async () => {
    const { client, calls } = setup(page([invoice()]));
    await client.invoices.list({ customer_id: "cus_1", status: "open", page: 2, limit: 50, account_id: "acc_1" });
    expect(queryOf(calls[0]!.url)).toEqual({ customer_id: "cus_1", status: "open", page: "2", limit: "50", account_id: "acc_1" });
    expect(InvoiceListQuerySchema.safeParse(queryOf(calls[0]!.url)).success).toBe(true);
  });

  test.each(BILLING_ENUMS.invoiceStatus)("list accepts status %s", async (status) => {
    const { client, calls } = setup(page([]));
    await client.invoices.list({ status });
    expect(InvoiceListQuerySchema.safeParse(queryOf(calls[0]!.url)).success).toBe(true);
  });

  test("list rejects an unknown status", () => {
    const { client } = setup(page([]));
    invalid(() => client.invoices.list({ status: "lost" as never }), "invoices.list params");
  });

  test("retrieve has no account_id", async () => {
    const { client, calls } = setup(ok(invoice()));
    const result = await client.invoices.retrieve("inv_1");
    expect(new URL(calls[0]!.url).pathname).toBe("/v1/invoices/inv_1");
    expect(queryOf(calls[0]!.url)).toEqual({});
    expect(result.lines).toHaveLength(1);
    invalid(() => client.invoices.retrieve(""), "invoiceId");
  });

  test("update wraps the fields in an invoice object", async () => {
    const { client, calls } = setup(ok(invoice({ description: "New" })));
    await client.invoices.update("inv_1", { description: "New", collection_behavior: "email", metadata: { a: 1 } });
    expect(calls[0]!.method).toBe("PATCH");
    expect(calls[0]!.body).toEqual({ invoice: { description: "New", collection_behavior: "email", metadata: { a: 1 } } });
    expect(InvoiceUpdateBodySchema.safeParse(calls[0]!.body).success).toBe(true);
  });

  test("update rejects unknown fields and does not offer due_at", () => {
    const { client } = setup(ok(invoice()));
    invalid(() => client.invoices.update("inv_1", { status: "paid" } as never), "invoices.update params");
    invalid(() => client.invoices.update("inv_1", { due_at: "2026-02-01" } as never), "invoices.update params");
    invalid(() => client.invoices.update("inv_1", { collection_behavior: "sms" as never }), "invoices.update params");
  });

  test("delete answers 204", async () => {
    const { client, calls } = setup(noContent());
    await expect(client.invoices.delete("inv_1")).resolves.toBeUndefined();
    expect(calls[0]!.method).toBe("DELETE");
    expect(new URL(calls[0]!.url).pathname).toBe("/v1/invoices/inv_1");
  });

  test.each([
    ["finalize", "finalize", "open"],
    ["markPaid", "mark-paid", "paid"],
    ["void", "void", "void"],
  ] as const)("%s posts to /%s", async (method, segment, status) => {
    const { client, calls } = setup(ok(invoice({ status })));
    const result = await client.invoices[method]("inv_1");
    expect(calls[0]!.method).toBe("POST");
    expect(new URL(calls[0]!.url).pathname).toBe(`/v1/invoices/inv_1/${segment}`);
    expect(result.status).toBe(status);
  });

  describe("lines", () => {
    test("add posts the line flat in the body", async () => {
      const { client, calls } = setup(ok(invoiceLine(), 201));
      await client.invoices.lines.add("inv_1", { type: "custom", description: "Setup", quantity: 1, unit_amount: 1000, amount: 1000, currency: "TRY" });
      expect(calls[0]!.method).toBe("POST");
      expect(new URL(calls[0]!.url).pathname).toBe("/v1/invoices/inv_1/lines");
      expect(InvoiceLineCreateBodySchema.safeParse(calls[0]!.body).success).toBe(true);
    });

    test("add accepts a negative amount (discount)", async () => {
      const { client, calls } = setup(ok(invoiceLine({ type: "discount", amount: -200 }), 201));
      await client.invoices.lines.add("inv_1", { type: "discount", description: "Promo", amount: -200, currency: "TRY" });
      expect(InvoiceLineCreateBodySchema.safeParse(calls[0]!.body).success).toBe(true);
    });

    test("add validates the line", () => {
      const { client } = setup(ok(invoiceLine()));
      invalid(() => client.invoices.lines.add("inv_1", {} as never), "invoices.lines.add params");
      invalid(() => client.invoices.lines.add("inv_1", { type: "custom", description: "x", amount: 1, currency: "XXX" as never }), "invoices.lines.add params");
      invalid(() => client.invoices.lines.add("inv_1", { type: "custom", description: "x", amount: 0.5, currency: "TRY" }), "invoices.lines.add params");
      invalid(() => client.invoices.lines.add("", { type: "custom", description: "x", amount: 1, currency: "TRY" }), "invoiceId");
    });

    test("update wraps the fields in a line object", async () => {
      const { client, calls } = setup(ok(invoiceLine({ description: "Renamed" })));
      await client.invoices.lines.update("inv_1", "il_1", { description: "Renamed", amount: 900 });
      expect(calls[0]!.method).toBe("PATCH");
      expect(new URL(calls[0]!.url).pathname).toBe("/v1/invoices/inv_1/lines/il_1");
      expect(calls[0]!.body).toEqual({ line: { description: "Renamed", amount: 900 } });
      expect(InvoiceLineUpdateBodySchema.safeParse(calls[0]!.body).success).toBe(true);
    });

    test("update validates ids and values", () => {
      const { client } = setup(ok(invoiceLine()));
      invalid(() => client.invoices.lines.update("inv_1", "", { amount: 1 }), "lineId");
      invalid(() => client.invoices.lines.update("inv_1", "il_1", { amount: 1.2 }), "invoices.lines.update params");
      invalid(() => client.invoices.lines.update("inv_1", "il_1", { type: "fee" as never }), "invoices.lines.update params");
    });

    test("remove answers 204", async () => {
      const { client, calls } = setup(noContent());
      await expect(client.invoices.lines.remove("inv_1", "il_1")).resolves.toBeUndefined();
      expect(calls[0]!.method).toBe("DELETE");
      expect(new URL(calls[0]!.url).pathname).toBe("/v1/invoices/inv_1/lines/il_1");
    });

    test.each([
      [409, "invoice_not_draft"],
      [409, "system_line_not_removable"],
      [400, "system_line_type_not_allowed"],
    ] as const)("a %s refusal exposes %s as errorCode", async (status, code) => {
      const { client } = setup(bare(status, { code }));
      const error = await client.invoices.lines.add("inv_1", { type: "custom", description: "x", amount: 1, currency: "TRY" }).catch((e) => e);
      expect(error).toBeInstanceOf(HsrcpayApiError);
      expect((error as HsrcpayApiError).status).toBe(status);
      expect((error as HsrcpayApiError).errorCode).toBe(code);
    });
  });
});

describe("responses", () => {
  test("a reply that breaks the schema is rejected when validateResponses is on", async () => {
    const mock = mockFetch(ok({ ...dispute(), status: "weird" }));
    const client = new HsrcpayClient({ apiKey: "sk_test_k", baseUrl: "http://api.test", fetch: mock.fetch, validateResponses: true });
    await expect(client.disputes.retrieve("dp_1")).rejects.toThrow();
  });

  test("unknown extra fields are kept on replies", async () => {
    const { client } = setup(ok({ ...invoice(), future_field: 1 }));
    const result = (await client.invoices.retrieve("inv_1")) as Record<string, unknown>;
    expect(result.future_field).toBe(1);
  });
});
