import type { HttpClient } from "../http";
import type {
  ConfirmedPayment,
  Currency,
  Metadata,
  MutationOptions,
  Page,
  PayerIdentity,
  Payment,
  PaymentMethodInput,
  PaymentTimeline,
  RefundReason,
  RequestOptions,
  RoutingStrategy,
} from "../types";
import { pathId } from "./path";

export type PaymentExpand = {
  include_charges?: boolean;
  include_routing_plans?: boolean;
  include_events?: boolean;
  include_customer?: boolean;
};

export type CreatePaymentParams = {
  /** Minor units, integer, at least 10. Omit when `price_id` sets the amount. */
  amount?: number;
  currency?: Currency;
  customer_id?: string;
  product_id?: string;
  price_id?: string;
  auto_capture?: boolean;
  secure_mode?: "auto" | boolean;
  installments?: number;
  metadata?: Metadata;
  /** Owning account; defaults to the account of the API key. */
  account_id?: string;
};

export type RetrievePaymentParams = PaymentExpand & { account_id?: string };

export type ListPaymentsParams = PaymentExpand & {
  account_id?: string;
  customer_id?: string;
  product_id?: string;
  page?: number;
  limit?: number;
};

export type ConfirmPaymentParams = {
  payment_method: PaymentMethodInput;
  routing_strategy?: RoutingStrategy;
  payer_identity?: PayerIdentity;
};

export type RefundPaymentParams = {
  reason?: RefundReason;
  reason_other?: string;
  metadata?: Metadata;
};

export type PaymentTimelineParams = { limit?: number; starting_after?: string };

export class PaymentsResource {
  constructor(private readonly http: HttpClient) {}

  create(params: CreatePaymentParams = {}, options: MutationOptions = {}): Promise<Payment> {
    const { account_id, ...body } = params;
    return this.http.data<Payment>({ method: "POST", path: "/v1/payments", query: { account_id }, body, ...options });
  }

  retrieve(paymentId: string, params: RetrievePaymentParams = {}, options: RequestOptions = {}): Promise<Payment> {
    return this.http.data<Payment>({
      method: "GET",
      path: `/v1/payments/${pathId(paymentId, "paymentId")}`,
      query: params,
      ...options,
    });
  }

  list(params: ListPaymentsParams = {}, options: RequestOptions = {}): Promise<Page<Payment>> {
    return this.http.page<Payment>({ method: "GET", path: "/v1/payments", query: params, ...options });
  }

  /** Attaches a payment method and runs the confirmation. Pass `idempotencyKey` to make retries safe. */
  confirm(paymentId: string, params: ConfirmPaymentParams, options: MutationOptions = {}): Promise<ConfirmedPayment> {
    return this.http.data<ConfirmedPayment>({
      method: "POST",
      path: `/v1/payments/${pathId(paymentId, "paymentId")}/confirm`,
      body: params,
      ...options,
    });
  }

  /** Captures an authorized payment in full. */
  capture(paymentId: string, options: MutationOptions = {}): Promise<Payment> {
    return this.http.data<Payment>({
      method: "POST",
      path: `/v1/payments/${pathId(paymentId, "paymentId")}/capture`,
      ...options,
    });
  }

  /** Voids an authorized payment before capture. */
  cancel(paymentId: string, options: MutationOptions = {}): Promise<Payment> {
    return this.http.data<Payment>({
      method: "POST",
      path: `/v1/payments/${pathId(paymentId, "paymentId")}/cancel`,
      ...options,
    });
  }

  /** Refunds a succeeded payment in full. */
  refund(paymentId: string, params: RefundPaymentParams = {}, options: MutationOptions = {}): Promise<Payment> {
    return this.http.data<Payment>({
      method: "POST",
      path: `/v1/payments/${pathId(paymentId, "paymentId")}/refund`,
      body: params,
      ...options,
    });
  }

  timeline(paymentId: string, params: PaymentTimelineParams = {}, options: RequestOptions = {}): Promise<PaymentTimeline> {
    return this.http.data<PaymentTimeline>({
      method: "GET",
      path: `/v1/payments/${pathId(paymentId, "paymentId")}/timeline`,
      query: params,
      ...options,
    });
  }
}
