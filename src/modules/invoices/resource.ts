import type { HttpClient } from "../../core/http";
import { Resource } from "../../core/resource";
import type { MutationOptions, Page, RequestOptions } from "../../core/schemas";
import {
  CreateInvoiceParamsSchema,
  InvoiceLineItemParamsSchema,
  InvoiceLineItemSchema,
  InvoiceSchema,
  ListInvoicesParamsSchema,
  UpdateInvoiceLineItemParamsSchema,
  UpdateInvoiceParamsSchema,
  type CreateInvoiceParams,
  type Invoice,
  type InvoiceLineItem,
  type InvoiceLineItemParams,
  type ListInvoicesParams,
  type UpdateInvoiceLineItemParams,
  type UpdateInvoiceParams,
} from "./schemas";

/**
 * Line items of a draft invoice. A line change answers a bare `{ code }` when refused: 409 `invoice_not_draft` or
 * `system_line_not_removable`, 400 `system_line_type_not_allowed` (read `error.errorCode`).
 */
export class InvoiceLinesResource extends Resource {
  add(invoiceId: string, params: InvoiceLineItemParams, options: MutationOptions = {}): Promise<InvoiceLineItem> {
    const path = `/v1/invoices/${this.id(invoiceId, "invoiceId")}/lines`;
    const body = this.input(InvoiceLineItemParamsSchema, params, "invoices.lines.add params");
    return this.http.data({ method: "POST", path, body, ...options }, InvoiceLineItemSchema);
  }

  update(
    invoiceId: string,
    lineId: string,
    params: UpdateInvoiceLineItemParams,
    options: MutationOptions = {},
  ): Promise<InvoiceLineItem> {
    const path = `/v1/invoices/${this.id(invoiceId, "invoiceId")}/lines/${this.id(lineId, "lineId")}`;
    const line = this.input(UpdateInvoiceLineItemParamsSchema, params, "invoices.lines.update params");
    return this.http.data({ method: "PATCH", path, body: { line }, ...options }, InvoiceLineItemSchema);
  }

  remove(invoiceId: string, lineId: string, options: RequestOptions = {}): Promise<void> {
    const path = `/v1/invoices/${this.id(invoiceId, "invoiceId")}/lines/${this.id(lineId, "lineId")}`;
    return this.http.data({ method: "DELETE", path, ...options });
  }
}

export class InvoicesResource extends Resource {
  readonly lines: InvoiceLinesResource;

  constructor(http: HttpClient) {
    super(http);
    this.lines = new InvoiceLinesResource(http);
  }

  /** Creates a draft invoice. `account_id` is sent as a query parameter; omit it with an API key. */
  create(params: CreateInvoiceParams, options: MutationOptions = {}): Promise<Invoice> {
    const { account_id, ...body } = this.input(CreateInvoiceParamsSchema, params, "invoices.create params");
    return this.http.data({ method: "POST", path: "/v1/invoices", query: { account_id }, body, ...options }, InvoiceSchema);
  }

  list(params: ListInvoicesParams = {}, options: RequestOptions = {}): Promise<Page<Invoice>> {
    const query = this.input(ListInvoicesParamsSchema, params, "invoices.list params");
    return this.http.page({ method: "GET", path: "/v1/invoices", query, ...options }, InvoiceSchema);
  }

  /** The invoice id identifies the account; there is no `account_id` parameter. */
  retrieve(invoiceId: string, options: RequestOptions = {}): Promise<Invoice> {
    return this.http.data({ method: "GET", path: `/v1/invoices/${this.id(invoiceId, "invoiceId")}`, ...options }, InvoiceSchema);
  }

  /** Updates a draft invoice (description, collection behavior, metadata). */
  update(invoiceId: string, params: UpdateInvoiceParams, options: MutationOptions = {}): Promise<Invoice> {
    const path = `/v1/invoices/${this.id(invoiceId, "invoiceId")}`;
    const invoice = this.input(UpdateInvoiceParamsSchema, params, "invoices.update params");
    return this.http.data({ method: "PATCH", path, body: { invoice }, ...options }, InvoiceSchema);
  }

  /** Hard-deletes a draft invoice. */
  delete(invoiceId: string, options: RequestOptions = {}): Promise<void> {
    return this.http.data({ method: "DELETE", path: `/v1/invoices/${this.id(invoiceId, "invoiceId")}`, ...options });
  }

  /** Moves a draft to `open`. */
  finalize(invoiceId: string, options: MutationOptions = {}): Promise<Invoice> {
    const path = `/v1/invoices/${this.id(invoiceId, "invoiceId")}/finalize`;
    return this.http.data({ method: "POST", path, body: {}, ...options }, InvoiceSchema);
  }

  /** Marks an open invoice as paid outside the platform. */
  markPaid(invoiceId: string, options: MutationOptions = {}): Promise<Invoice> {
    const path = `/v1/invoices/${this.id(invoiceId, "invoiceId")}/mark-paid`;
    return this.http.data({ method: "POST", path, body: {}, ...options }, InvoiceSchema);
  }

  /** Voids a draft or open invoice. */
  void(invoiceId: string, options: MutationOptions = {}): Promise<Invoice> {
    const path = `/v1/invoices/${this.id(invoiceId, "invoiceId")}/void`;
    return this.http.data({ method: "POST", path, body: {}, ...options }, InvoiceSchema);
  }
}
