import type { HttpClient } from "../http";
import type { Page, Refund, RequestOptions } from "../types";
import { pathId } from "./path";

export type ListRefundsParams = {
  account_id?: string;
  payment_id?: string;
  charge_id?: string;
  page?: number;
  limit?: number;
};

export class RefundsResource {
  constructor(private readonly http: HttpClient) {}

  retrieve(refundId: string, options: RequestOptions = {}): Promise<Refund> {
    return this.http.data<Refund>({ method: "GET", path: `/v1/refunds/${pathId(refundId, "refundId")}`, ...options });
  }

  list(params: ListRefundsParams = {}, options: RequestOptions = {}): Promise<Page<Refund>> {
    return this.http.page<Refund>({ method: "GET", path: "/v1/refunds", query: params, ...options });
  }
}
