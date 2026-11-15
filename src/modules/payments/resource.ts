import { Resource } from "../../core/resource";
import type { MutationOptions, Page, RequestOptions } from "../../core/schemas";
import {
  ConfirmPaymentParamsSchema,
  ConfirmedPaymentSchema,
  CreatePaymentParamsSchema,
  ListPaymentsParamsSchema,
  PaymentSchema,
  PaymentTimelineParamsSchema,
  PaymentTimelineSchema,
  RefundPaymentParamsSchema,
  RetrievePaymentParamsSchema,
  type ConfirmPaymentParams,
  type ConfirmedPayment,
  type CreatePaymentParams,
  type ListPaymentsParams,
  type Payment,
  type PaymentTimeline,
  type PaymentTimelineParams,
  type RefundPaymentParams,
  type RetrievePaymentParams,
} from "./schemas";

export class PaymentsResource extends Resource {
  create(params: CreatePaymentParams = {}, options: MutationOptions = {}): Promise<Payment> {
    const { account_id, ...body } = this.input(CreatePaymentParamsSchema, params, "payments.create params");
    return this.http.data({ method: "POST", path: "/v1/payments", query: { account_id }, body, ...options }, PaymentSchema);
  }

  retrieve(paymentId: string, params: RetrievePaymentParams = {}, options: RequestOptions = {}): Promise<Payment> {
    const query = this.input(RetrievePaymentParamsSchema, params, "payments.retrieve params");
    return this.http.data({ method: "GET", path: `/v1/payments/${this.id(paymentId, "paymentId")}`, query, ...options }, PaymentSchema);
  }

  list(params: ListPaymentsParams = {}, options: RequestOptions = {}): Promise<Page<Payment>> {
    const query = this.input(ListPaymentsParamsSchema, params, "payments.list params");
    return this.http.page({ method: "GET", path: "/v1/payments", query, ...options }, PaymentSchema);
  }

  /** Attaches a payment method and runs the confirmation. Pass `idempotencyKey` to make retries safe. */
  confirm(paymentId: string, params: ConfirmPaymentParams, options: MutationOptions = {}): Promise<ConfirmedPayment> {
    const id = this.id(paymentId, "paymentId");
    const body = this.input(ConfirmPaymentParamsSchema, params, "payments.confirm params");
    return this.http.data({ method: "POST", path: `/v1/payments/${id}/confirm`, body, ...options }, ConfirmedPaymentSchema);
  }

  /** Captures an authorized payment in full. */
  capture(paymentId: string, options: MutationOptions = {}): Promise<Payment> {
    return this.http.data({ method: "POST", path: `/v1/payments/${this.id(paymentId, "paymentId")}/capture`, ...options }, PaymentSchema);
  }

  /** Voids an authorized payment before capture. */
  cancel(paymentId: string, options: MutationOptions = {}): Promise<Payment> {
    return this.http.data({ method: "POST", path: `/v1/payments/${this.id(paymentId, "paymentId")}/cancel`, ...options }, PaymentSchema);
  }

  /** Refunds a succeeded payment in full. */
  refund(paymentId: string, params: RefundPaymentParams = {}, options: MutationOptions = {}): Promise<Payment> {
    const id = this.id(paymentId, "paymentId");
    const body = this.input(RefundPaymentParamsSchema, params, "payments.refund params");
    return this.http.data({ method: "POST", path: `/v1/payments/${id}/refund`, body, ...options }, PaymentSchema);
  }

  timeline(paymentId: string, params: PaymentTimelineParams = {}, options: RequestOptions = {}): Promise<PaymentTimeline> {
    const id = this.id(paymentId, "paymentId");
    const query = this.input(PaymentTimelineParamsSchema, params, "payments.timeline params");
    return this.http.data({ method: "GET", path: `/v1/payments/${id}/timeline`, query, ...options }, PaymentTimelineSchema);
  }
}
