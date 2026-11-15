import { Resource } from "../../core/resource";
import type { Page, RequestOptions } from "../../core/schemas";
import { ListRefundsParamsSchema, RefundSchema, type ListRefundsParams, type Refund } from "./schemas";

export class RefundsResource extends Resource {
  retrieve(refundId: string, options: RequestOptions = {}): Promise<Refund> {
    return this.http.data({ method: "GET", path: `/v1/refunds/${this.id(refundId, "refundId")}`, ...options }, RefundSchema);
  }

  list(params: ListRefundsParams = {}, options: RequestOptions = {}): Promise<Page<Refund>> {
    const query = this.input(ListRefundsParamsSchema, params, "refunds.list params");
    return this.http.page({ method: "GET", path: "/v1/refunds", query, ...options }, RefundSchema);
  }
}
