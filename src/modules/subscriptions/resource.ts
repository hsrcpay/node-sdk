import type { HttpClient } from "../../core/http";
import { Resource } from "../../core/resource";
import type { MutationOptions, Page, RequestOptions } from "../../core/schemas";
import { z } from "zod";
import {
  CancelSubscriptionChangeParamsSchema,
  CancelSubscriptionParamsSchema,
  CreateSubscriptionParamsSchema,
  ListSubscriptionsParamsSchema,
  SubscriptionChangeParamsSchema,
  SubscriptionChangePreviewSchema,
  SubscriptionChangeSchema,
  SubscriptionSchema,
  UpdateSubscriptionParamsSchema,
  type CancelSubscriptionChangeParams,
  type CancelSubscriptionParams,
  type CreateSubscriptionParams,
  type ListSubscriptionsParams,
  type Subscription,
  type SubscriptionChange,
  type SubscriptionChangeParams,
  type SubscriptionChangePreview,
  type UpdateSubscriptionParams,
} from "./schemas";

/** Plan, quantity and item changes of one subscription. No `account_id`: the subscription id identifies the account. */
export class SubscriptionChangesResource extends Resource {
  /** Applied, scheduled and canceled changes. The reply is a plain list, not a page. */
  list(subscriptionId: string, options: RequestOptions = {}): Promise<SubscriptionChange[]> {
    const path = `/v1/subscriptions/${this.id(subscriptionId, "subscriptionId")}/changes`;
    return this.http.data({ method: "GET", path, ...options }, z.array(SubscriptionChangeSchema));
  }

  /**
   * Upgrades, downgrades, changes a quantity, or adds or removes an item. An immediate change is applied and prorated
   * right away; a `period_end` change applies before the next renewal.
   */
  schedule(subscriptionId: string, params: SubscriptionChangeParams, options: MutationOptions = {}): Promise<SubscriptionChange> {
    const path = `/v1/subscriptions/${this.id(subscriptionId, "subscriptionId")}/changes`;
    const body = this.input(SubscriptionChangeParamsSchema, params, "subscriptions.changes.schedule params");
    return this.http.data({ method: "POST", path, body, ...options }, SubscriptionChangeSchema);
  }

  /** Shows what a change would charge or credit now, without applying it. */
  preview(subscriptionId: string, params: SubscriptionChangeParams, options: MutationOptions = {}): Promise<SubscriptionChangePreview> {
    const path = `/v1/subscriptions/${this.id(subscriptionId, "subscriptionId")}/changes/preview`;
    const body = this.input(SubscriptionChangeParamsSchema, params, "subscriptions.changes.preview params");
    return this.http.data({ method: "POST", path, body, ...options }, SubscriptionChangePreviewSchema);
  }

  /** Cancels a change scheduled for the end of the period. Other statuses answer 409. */
  cancel(
    subscriptionId: string,
    changeId: string,
    params: CancelSubscriptionChangeParams = {},
    options: MutationOptions = {},
  ): Promise<SubscriptionChange> {
    const path = `/v1/subscriptions/${this.id(subscriptionId, "subscriptionId")}/changes/${this.id(changeId, "changeId")}/cancel`;
    const body = this.input(CancelSubscriptionChangeParamsSchema, params, "subscriptions.changes.cancel params");
    return this.http.data({ method: "POST", path, body, ...options }, SubscriptionChangeSchema);
  }
}

export class SubscriptionsResource extends Resource {
  readonly changes: SubscriptionChangesResource;

  constructor(http: HttpClient) {
    super(http);
    this.changes = new SubscriptionChangesResource(http);
  }

  /** `account_id` is sent as a query parameter; omit it with an API key. */
  create(params: CreateSubscriptionParams, options: MutationOptions = {}): Promise<Subscription> {
    const { account_id, ...body } = this.input(CreateSubscriptionParamsSchema, params, "subscriptions.create params");
    return this.http.data({ method: "POST", path: "/v1/subscriptions", query: { account_id }, body, ...options }, SubscriptionSchema);
  }

  list(params: ListSubscriptionsParams = {}, options: RequestOptions = {}): Promise<Page<Subscription>> {
    const query = this.input(ListSubscriptionsParamsSchema, params, "subscriptions.list params");
    return this.http.page({ method: "GET", path: "/v1/subscriptions", query, ...options }, SubscriptionSchema);
  }

  /** The subscription id identifies the account; there is no `account_id` parameter. */
  retrieve(subscriptionId: string, options: RequestOptions = {}): Promise<Subscription> {
    const path = `/v1/subscriptions/${this.id(subscriptionId, "subscriptionId")}`;
    return this.http.data({ method: "GET", path, ...options }, SubscriptionSchema);
  }

  /** Updates the payment method, metadata, collection behavior or days until due. */
  update(subscriptionId: string, params: UpdateSubscriptionParams, options: MutationOptions = {}): Promise<Subscription> {
    const path = `/v1/subscriptions/${this.id(subscriptionId, "subscriptionId")}`;
    const subscription = this.input(UpdateSubscriptionParamsSchema, params, "subscriptions.update params");
    return this.http.data({ method: "PATCH", path, body: { subscription }, ...options }, SubscriptionSchema);
  }

  /**
   * Cancels immediately (default) or at the end of the current period. Immediate cancel voids open invoices and, with
   * `prorate`, credits the unused part of a paid period. `prorate` with `cancel_at_period_end` is rejected.
   */
  cancel(subscriptionId: string, params: CancelSubscriptionParams = {}, options: MutationOptions = {}): Promise<Subscription> {
    const path = `/v1/subscriptions/${this.id(subscriptionId, "subscriptionId")}/cancel`;
    const cancel = this.input(CancelSubscriptionParamsSchema, params, "subscriptions.cancel params");
    return this.http.data({ method: "POST", path, body: { cancel }, ...options }, SubscriptionSchema);
  }

  /** Clears `cancel_at_period_end` on a subscription scheduled to cancel. */
  resume(subscriptionId: string, options: MutationOptions = {}): Promise<Subscription> {
    const path = `/v1/subscriptions/${this.id(subscriptionId, "subscriptionId")}/resume`;
    return this.http.data({ method: "POST", path, body: {}, ...options }, SubscriptionSchema);
  }
}
