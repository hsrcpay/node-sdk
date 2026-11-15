import { Resource } from "../../core/resource";
import type { HttpClient } from "../../core/http";
import type { MutationOptions, Page, RequestOptions } from "../../core/schemas";
import {
  CreateCustomerAddressParamsSchema,
  CreateCustomerParamsSchema,
  CustomerAddressSchema,
  CustomerSchema,
  ListCustomersParamsSchema,
  UpdateCustomerAddressParamsSchema,
  UpdateCustomerParamsSchema,
  type CreateCustomerAddressParams,
  type CreateCustomerParams,
  type Customer,
  type CustomerAddress,
  type ListCustomersParams,
  type UpdateCustomerAddressParams,
  type UpdateCustomerParams,
} from "./schemas";

/** Addresses of one customer. No `account_id` anywhere: the customer id already identifies the account. */
export class CustomerAddressesResource extends Resource {
  create(customerId: string, params: CreateCustomerAddressParams, options: MutationOptions = {}): Promise<CustomerAddress> {
    const id = this.id(customerId, "customerId");
    const body = this.input(CreateCustomerAddressParamsSchema, params, "customers.addresses.create params");
    return this.http.data({ method: "POST", path: `/v1/customers/${id}/addresses`, body, ...options }, CustomerAddressSchema);
  }

  update(
    customerId: string,
    addressId: string,
    params: UpdateCustomerAddressParams,
    options: MutationOptions = {},
  ): Promise<CustomerAddress> {
    const path = `/v1/customers/${this.id(customerId, "customerId")}/addresses/${this.id(addressId, "addressId")}`;
    const body = this.input(UpdateCustomerAddressParamsSchema, params, "customers.addresses.update params");
    return this.http.data({ method: "PATCH", path, body, ...options }, CustomerAddressSchema);
  }

  /** Sets the address as the default of its type. */
  markPrimary(customerId: string, addressId: string, options: MutationOptions = {}): Promise<CustomerAddress> {
    const path = `/v1/customers/${this.id(customerId, "customerId")}/addresses/${this.id(addressId, "addressId")}/mark-primary`;
    return this.http.data({ method: "POST", path, body: {}, ...options }, CustomerAddressSchema);
  }

  delete(customerId: string, addressId: string, options: RequestOptions = {}): Promise<void> {
    const path = `/v1/customers/${this.id(customerId, "customerId")}/addresses/${this.id(addressId, "addressId")}`;
    return this.http.data({ method: "DELETE", path, ...options });
  }
}

export class CustomersResource extends Resource {
  readonly addresses: CustomerAddressesResource;

  constructor(http: HttpClient) {
    super(http);
    this.addresses = new CustomerAddressesResource(http);
  }

  /** `account_id` is sent as a query parameter; omit it with an API key. */
  create(params: CreateCustomerParams, options: MutationOptions = {}): Promise<Customer> {
    const { account_id, ...body } = this.input(CreateCustomerParamsSchema, params, "customers.create params");
    return this.http.data({ method: "POST", path: "/v1/customers", query: { account_id }, body, ...options }, CustomerSchema);
  }

  /** The customer id identifies the account; there is no `account_id` parameter. */
  retrieve(customerId: string, options: RequestOptions = {}): Promise<Customer> {
    return this.http.data({ method: "GET", path: `/v1/customers/${this.id(customerId, "customerId")}`, ...options }, CustomerSchema);
  }

  list(params: ListCustomersParams = {}, options: RequestOptions = {}): Promise<Page<Customer>> {
    const query = this.input(ListCustomersParamsSchema, params, "customers.list params");
    return this.http.page({ method: "GET", path: "/v1/customers", query, ...options }, CustomerSchema);
  }

  update(customerId: string, params: UpdateCustomerParams, options: MutationOptions = {}): Promise<Customer> {
    const id = this.id(customerId, "customerId");
    const body = this.input(UpdateCustomerParamsSchema, params, "customers.update params");
    return this.http.data({ method: "PATCH", path: `/v1/customers/${id}`, body, ...options }, CustomerSchema);
  }

  /**
   * Soft-deletes a customer. Answers 409 with `errorCode: "customer_has_active_subscriptions"` while the
   * customer still has a subscription.
   */
  delete(customerId: string, options: RequestOptions = {}): Promise<void> {
    return this.http.data({ method: "DELETE", path: `/v1/customers/${this.id(customerId, "customerId")}`, ...options });
  }
}
