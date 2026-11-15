import { Resource } from "../../core/resource";
import type { MutationOptions, Page, RequestOptions } from "../../core/schemas";
import {
  CreatePriceParamsSchema,
  ListPricesParamsSchema,
  ListProductPricesParamsSchema,
  PriceSchema,
  PriceStatusSchema,
  UpdatePriceParamsSchema,
  type CreatePriceParams,
  type ListPricesParams,
  type ListProductPricesParams,
  type Price,
  type PriceStatus,
  type UpdatePriceParams,
} from "./schemas";

/** Account-wide prices. `account_id` is optional with an API key (it is the key's account). */
export class PricesResource extends Resource {
  list(params: ListPricesParams = {}, options: RequestOptions = {}): Promise<Page<Price>> {
    const { lookup_keys, ...rest } = this.input(ListPricesParamsSchema, params, "prices.list params");
    const query = { ...rest, lookup_keys: lookup_keys?.join(",") };
    return this.http.page({ method: "GET", path: "/v1/prices", query, ...options }, PriceSchema);
  }

  retrieve(priceId: string, options: RequestOptions = {}): Promise<Price> {
    return this.http.data({ method: "GET", path: `/v1/prices/${this.id(priceId, "priceId")}`, ...options }, PriceSchema);
  }
}

/**
 * Prices of one product (`/v1/products/:id/prices`). The product id identifies the account, so none of these
 * methods take an `account_id`. Deleting a price is reserved to the platform and is not exposed.
 */
export class ProductPricesResource extends Resource {
  list(productId: string, params: ListProductPricesParams = {}, options: RequestOptions = {}): Promise<Page<Price>> {
    const id = this.id(productId, "productId");
    const query = this.input(ListProductPricesParamsSchema, params, "products.prices.list params");
    return this.http.page({ method: "GET", path: `/v1/products/${id}/prices`, query, ...options }, PriceSchema);
  }

  create(productId: string, params: CreatePriceParams, options: MutationOptions = {}): Promise<Price> {
    const id = this.id(productId, "productId");
    const body = this.input(CreatePriceParamsSchema, params, "products.prices.create params");
    return this.http.data({ method: "POST", path: `/v1/products/${id}/prices`, body, ...options }, PriceSchema);
  }

  /** Answers 404 when the price belongs to another product. */
  retrieve(productId: string, priceId: string, options: RequestOptions = {}): Promise<Price> {
    const path = `/v1/products/${this.id(productId, "productId")}/prices/${this.id(priceId, "priceId")}`;
    return this.http.data({ method: "GET", path, ...options }, PriceSchema);
  }

  update(productId: string, priceId: string, params: UpdatePriceParams, options: MutationOptions = {}): Promise<Price> {
    const path = `/v1/products/${this.id(productId, "productId")}/prices/${this.id(priceId, "priceId")}`;
    const body = this.input(UpdatePriceParamsSchema, params, "products.prices.update params");
    return this.http.data({ method: "PUT", path, body, ...options }, PriceSchema);
  }

  /** active <-> inactive, either to archived (terminal). The default price must stay active. */
  updateStatus(productId: string, priceId: string, status: PriceStatus, options: MutationOptions = {}): Promise<Price> {
    const path = `/v1/products/${this.id(productId, "productId")}/prices/${this.id(priceId, "priceId")}/status`;
    const body = this.input(PriceStatusSchema.transform((value) => ({ status: value })), status, "products.prices.updateStatus status");
    return this.http.data({ method: "POST", path, body, ...options }, PriceSchema);
  }
}
