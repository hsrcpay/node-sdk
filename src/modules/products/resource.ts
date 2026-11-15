import { Resource } from "../../core/resource";
import type { HttpClient } from "../../core/http";
import type { MutationOptions, Page, RequestOptions } from "../../core/schemas";
import { ProductPricesResource } from "../prices/resource";
import {
  CreateProductParamsSchema,
  DeleteProductResultSchema,
  ListProductsParamsSchema,
  ProductSchema,
  ProductStatusSchema,
  ProductUsageSchema,
  UpdateProductParamsSchema,
  type CreateProductParams,
  type DeleteProductResult,
  type ListProductsParams,
  type Product,
  type ProductStatus,
  type ProductUsage,
  type UpdateProductParams,
} from "./schemas";

export class ProductsResource extends Resource {
  readonly prices: ProductPricesResource;

  constructor(http: HttpClient) {
    super(http);
    this.prices = new ProductPricesResource(http);
  }

  /** `account_id` is part of the request body; omit it with an API key. */
  create(params: CreateProductParams, options: MutationOptions = {}): Promise<Product> {
    const body = this.input(CreateProductParamsSchema, params, "products.create params");
    return this.http.data({ method: "POST", path: "/v1/products", body, ...options }, ProductSchema);
  }

  /** The product id identifies the account; there is no `account_id` parameter. */
  retrieve(productId: string, options: RequestOptions = {}): Promise<Product> {
    return this.http.data({ method: "GET", path: `/v1/products/${this.id(productId, "productId")}`, ...options }, ProductSchema);
  }

  /** How many records reference the product and whether it can still be deleted. */
  usage(productId: string, options: RequestOptions = {}): Promise<ProductUsage> {
    return this.http.data({ method: "GET", path: `/v1/products/${this.id(productId, "productId")}/usage`, ...options }, ProductUsageSchema);
  }

  list(params: ListProductsParams = {}, options: RequestOptions = {}): Promise<Page<Product>> {
    const query = this.input(ListProductsParamsSchema, params, "products.list params");
    return this.http.page({ method: "GET", path: "/v1/products", query, ...options }, ProductSchema);
  }

  update(productId: string, params: UpdateProductParams, options: MutationOptions = {}): Promise<Product> {
    const id = this.id(productId, "productId");
    const body = this.input(UpdateProductParamsSchema, params, "products.update params");
    return this.http.data({ method: "PUT", path: `/v1/products/${id}`, body, ...options }, ProductSchema);
  }

  /** active, inactive or archived. Archiving is terminal. */
  updateStatus(productId: string, status: ProductStatus, options: MutationOptions = {}): Promise<Product> {
    const id = this.id(productId, "productId");
    const body = this.input(ProductStatusSchema.transform((value) => ({ status: value })), status, "products.updateStatus status");
    return this.http.data({ method: "POST", path: `/v1/products/${id}/status`, body, ...options }, ProductSchema);
  }

  /** Only for products with no prices that nothing references. Archive everything else. */
  delete(productId: string, options: RequestOptions = {}): Promise<DeleteProductResult> {
    return this.http.data(
      { method: "DELETE", path: `/v1/products/${this.id(productId, "productId")}`, ...options },
      DeleteProductResultSchema,
    );
  }
}
