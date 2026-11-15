import { Resource } from "../../core/resource";
import type { MutationOptions, Page, RequestOptions } from "../../core/schemas";
import {
  CheckoutSessionSchema,
  CreateCheckoutSessionParamsSchema,
  ListCheckoutSessionsParamsSchema,
  PrepareCheckoutParamsSchema,
  PreparedCheckoutSchema,
  SearchCheckoutSessionsParamsSchema,
  UpdateCheckoutAmountParamsSchema,
  UpdateCheckoutSessionParamsSchema,
  type CheckoutSession,
  type CreateCheckoutSessionParams,
  type ListCheckoutSessionsParams,
  type PrepareCheckoutParams,
  type PreparedCheckout,
  type SearchCheckoutSessionsParams,
  type UpdateCheckoutAmountParams,
  type UpdateCheckoutSessionParams,
} from "./schemas";

import { z } from "zod";

/** Checkout sessions managed with a secret key. */
export class CheckoutSessionsResource extends Resource {
  /** `account_id` is a query parameter; omit it with an API key. The result carries the `token` of the payer URL. */
  create(params: CreateCheckoutSessionParams, options: MutationOptions = {}): Promise<CheckoutSession> {
    const { account_id, ...body } = this.input(CreateCheckoutSessionParamsSchema, params, "checkoutSessions.create params");
    return this.http.data(
      { method: "POST", path: "/v1/checkout-sessions", query: { account_id }, body, ...options },
      CheckoutSessionSchema,
    );
  }

  retrieve(sessionId: string, options: RequestOptions = {}): Promise<CheckoutSession> {
    return this.http.data(
      { method: "GET", path: `/v1/checkout-sessions/${this.id(sessionId, "sessionId")}`, ...options },
      CheckoutSessionSchema,
    );
  }

  list(params: ListCheckoutSessionsParams = {}, options: RequestOptions = {}): Promise<Page<CheckoutSession>> {
    const query = this.input(ListCheckoutSessionsParamsSchema, params, "checkoutSessions.list params");
    return this.http.page({ method: "GET", path: "/v1/checkout-sessions", query, ...options }, CheckoutSessionSchema);
  }

  /** Patches status and metadata before the payment is confirmed. */
  update(sessionId: string, params: UpdateCheckoutSessionParams, options: MutationOptions = {}): Promise<CheckoutSession> {
    const id = this.id(sessionId, "sessionId");
    const body = this.input(UpdateCheckoutSessionParamsSchema, params, "checkoutSessions.update params");
    return this.http.data({ method: "PUT", path: `/v1/checkout-sessions/${id}`, body, ...options }, CheckoutSessionSchema);
  }

  /** Immediately expires a pending session. */
  expire(sessionId: string, options: MutationOptions = {}): Promise<CheckoutSession> {
    return this.http.data(
      { method: "POST", path: `/v1/checkout-sessions/${this.id(sessionId, "sessionId")}/expire`, ...options },
      CheckoutSessionSchema,
    );
  }

  /** `q` and `account_id` are both required: the search is scoped to one account and returns a plain array. */
  search(params: SearchCheckoutSessionsParams, options: RequestOptions = {}): Promise<CheckoutSession[]> {
    const query = this.input(SearchCheckoutSessionsParamsSchema, params, "checkoutSessions.search params");
    return this.http.data({ method: "GET", path: "/v1/checkout-sessions/search", query, ...options }, z.array(CheckoutSessionSchema));
  }
}

/** Hosted-checkout steps open to a publishable key. Every call is identified by the session token. */
export class PublicCheckoutSessionsResource extends Resource {
  retrieveByToken(token: string, options: RequestOptions = {}): Promise<CheckoutSession> {
    return this.http.data(
      { method: "GET", path: `/v1/checkout-sessions/token/${this.id(token, "token")}`, ...options },
      CheckoutSessionSchema,
    );
  }

  /** For sessions with `amount_mode` `CUSTOMER_INPUT`: call before `prepare`. Recomputes `final_amount`. */
  updateAmount(token: string, params: UpdateCheckoutAmountParams, options: MutationOptions = {}): Promise<CheckoutSession> {
    const id = this.id(token, "token");
    const body = this.input(UpdateCheckoutAmountParamsSchema, params, "checkoutSessions.updateAmount params");
    return this.http.data({ method: "PATCH", path: `/v1/checkout-sessions/token/${id}/amount`, body, ...options }, CheckoutSessionSchema);
  }

  /** Stores the payer snapshot, moves the session to PROCESSING and creates (or reuses) the payment to confirm. */
  prepare(token: string, params: PrepareCheckoutParams = {}, options: MutationOptions = {}): Promise<PreparedCheckout> {
    const id = this.id(token, "token");
    const body = this.input(PrepareCheckoutParamsSchema, params, "checkoutSessions.prepare params");
    return this.http.data({ method: "POST", path: `/v1/checkout-sessions/token/${id}/prepare`, body, ...options }, PreparedCheckoutSchema);
  }
}
