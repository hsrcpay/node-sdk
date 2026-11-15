import { Resource } from "../../core/resource";
import type { Page, RequestOptions } from "../../core/schemas";
import {
  ChargeSchema,
  ListChargesParamsSchema,
  RetrieveChargeParamsSchema,
  type Charge,
  type ListChargesParams,
  type RetrieveChargeParams,
} from "./schemas";

export class ChargesResource extends Resource {
  retrieve(chargeId: string, params: RetrieveChargeParams = {}, options: RequestOptions = {}): Promise<Charge> {
    const query = this.input(RetrieveChargeParamsSchema, params, "charges.retrieve params");
    return this.http.data({ method: "GET", path: `/v1/charges/${this.id(chargeId, "chargeId")}`, query, ...options }, ChargeSchema);
  }

  list(params: ListChargesParams = {}, options: RequestOptions = {}): Promise<Page<Charge>> {
    const query = this.input(ListChargesParamsSchema, params, "charges.list params");
    return this.http.page({ method: "GET", path: "/v1/charges", query, ...options }, ChargeSchema);
  }
}
