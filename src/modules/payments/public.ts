import { Resource } from "../../core/resource";
import type { MutationOptions, RequestOptions } from "../../core/schemas";
import {
  ConfirmPaymentParamsSchema,
  ConfirmedPaymentSchema,
  PaymentSchema,
  PaymentTimelineParamsSchema,
  PaymentTimelineSchema,
  type ConfirmPaymentParams,
  type ConfirmedPayment,
  type Payment,
  type PaymentTimeline,
  type PaymentTimelineParams,
} from "./schemas";

/**
 * Payment calls open to a publishable key: read and confirm only. Creating, capturing, cancelling and refunding
 * need a secret key. The payment id comes from `checkoutSessions.prepare`.
 */
export class PublicPaymentsResource extends Resource {
  retrieve(paymentId: string, options: RequestOptions = {}): Promise<Payment> {
    return this.http.data({ method: "GET", path: `/v1/payments/${this.id(paymentId, "paymentId")}`, ...options }, PaymentSchema);
  }

  /** Attaches the payer's payment method. Pass `idempotencyKey` to make retries safe. */
  confirm(paymentId: string, params: ConfirmPaymentParams, options: MutationOptions = {}): Promise<ConfirmedPayment> {
    const id = this.id(paymentId, "paymentId");
    const body = this.input(ConfirmPaymentParamsSchema, params, "payments.confirm params");
    return this.http.data({ method: "POST", path: `/v1/payments/${id}/confirm`, body, ...options }, ConfirmedPaymentSchema);
  }

  /** The merchant can switch the timeline off for API keys (`timeline.api_enabled`); the API then answers 403. */
  timeline(paymentId: string, params: PaymentTimelineParams = {}, options: RequestOptions = {}): Promise<PaymentTimeline> {
    const id = this.id(paymentId, "paymentId");
    const query = this.input(PaymentTimelineParamsSchema, params, "payments.timeline params");
    return this.http.data({ method: "GET", path: `/v1/payments/${id}/timeline`, query, ...options }, PaymentTimelineSchema);
  }
}
