import { Resource } from "../../core/resource";
import type { MutationOptions, Page, RequestOptions } from "../../core/schemas";
import {
  CloseTestDisputeParamsSchema,
  CreateTestDisputeParamsSchema,
  DisputeAccountParamsSchema,
  DisputeSchema,
  ListDisputesParamsSchema,
  UpdateDisputeParamsSchema,
  type CloseTestDisputeParams,
  type CreateTestDisputeParams,
  type Dispute,
  type DisputeAccountParams,
  type ListDisputesParams,
  type UpdateDisputeParams,
} from "./schemas";

export class DisputesResource extends Resource {
  list(params: ListDisputesParams = {}, options: RequestOptions = {}): Promise<Page<Dispute>> {
    const query = this.input(ListDisputesParamsSchema, params, "disputes.list params");
    return this.http.page({ method: "GET", path: "/v1/disputes", query, ...options }, DisputeSchema);
  }

  retrieve(disputeId: string, params: DisputeAccountParams = {}, options: RequestOptions = {}): Promise<Dispute> {
    const id = this.id(disputeId, "disputeId");
    const query = this.input(DisputeAccountParamsSchema, params, "disputes.retrieve params");
    return this.http.data({ method: "GET", path: `/v1/disputes/${id}`, query, ...options }, DisputeSchema);
  }

  /**
   * Saves evidence and metadata while the dispute needs a response. Evidence fields merge and an empty string clears
   * one. With `submit: true` the evidence goes to the issuer. Answers 409 `dispute_evidence_window_closed` after the
   * due date, `dispute_not_awaiting_response` once submitted, and 400 `dispute_evidence_missing` when submitting
   * without evidence (the code is in `error.details`).
   */
  update(disputeId: string, params: UpdateDisputeParams, options: MutationOptions = {}): Promise<Dispute> {
    const id = this.id(disputeId, "disputeId");
    const { account_id, ...body } = this.input(UpdateDisputeParamsSchema, params, "disputes.update params");
    return this.http.data({ method: "PATCH", path: `/v1/disputes/${id}`, query: { account_id }, body, ...options }, DisputeSchema);
  }

  /** Concedes without evidence. The dispute closes as `lost` and cannot be reopened. */
  accept(disputeId: string, params: DisputeAccountParams = {}, options: MutationOptions = {}): Promise<Dispute> {
    const id = this.id(disputeId, "disputeId");
    const query = this.input(DisputeAccountParamsSchema, params, "disputes.accept params");
    return this.http.data({ method: "POST", path: `/v1/disputes/${id}/accept`, query, body: {}, ...options }, DisputeSchema);
  }

  /**
   * Opens a dispute on a captured payment so dispute handling can be rehearsed. Test keys only: a live key gets 403
   * `dispute_test_mode_only`. One open dispute per charge (409 `dispute_already_open`).
   */
  createTest(params: CreateTestDisputeParams, options: MutationOptions = {}): Promise<Dispute> {
    const { account_id, ...body } = this.input(CreateTestDisputeParamsSchema, params, "disputes.createTest params");
    return this.http.data({ method: "POST", path: "/v1/disputes", query: { account_id }, body, ...options }, DisputeSchema);
  }

  /** Plays the issuer's decision on an open test dispute. Test keys only. */
  closeTest(disputeId: string, params: CloseTestDisputeParams, options: MutationOptions = {}): Promise<Dispute> {
    const id = this.id(disputeId, "disputeId");
    const { account_id, ...body } = this.input(CloseTestDisputeParamsSchema, params, "disputes.closeTest params");
    return this.http.data({ method: "POST", path: `/v1/disputes/${id}/close`, query: { account_id }, body, ...options }, DisputeSchema);
  }
}
