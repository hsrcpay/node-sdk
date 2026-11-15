import { assertServerEnvironment, createHttpClient, type BaseClientOptions } from "./core/config";
import { KeyKind } from "./core/key";
import { ChargesResource } from "./modules/charges";
import { CheckoutSessionsResource } from "./modules/checkout-sessions";
import { CustomersResource } from "./modules/customers";
import { DisputesResource } from "./modules/disputes";
import { InvoicesResource } from "./modules/invoices";
import { PaymentsResource } from "./modules/payments";
import { PricesResource } from "./modules/prices";
import { ProductsResource } from "./modules/products";
import { RefundsResource } from "./modules/refunds";
import { SubscriptionsResource } from "./modules/subscriptions";

export type HsrcpayClientOptions = BaseClientOptions & {
  /** Secret API key (`sk_live_...` or `sk_test_...`). Test keys use the sandbox. Server-side only. */
  apiKey: string;
  /** The client holds a secret key and refuses to start in a browser unless you opt in. */
  dangerouslyAllowBrowser?: boolean;
};

/** Server-side client for a secret key: the full account API. For browsers use `HsrcpayPublicClient`. */
export class HsrcpayClient {
  readonly payments: PaymentsResource;
  readonly charges: ChargesResource;
  readonly refunds: RefundsResource;
  readonly customers: CustomersResource;
  readonly products: ProductsResource;
  readonly prices: PricesResource;
  readonly checkoutSessions: CheckoutSessionsResource;
  readonly disputes: DisputesResource;
  readonly subscriptions: SubscriptionsResource;
  readonly invoices: InvoicesResource;

  constructor(options: HsrcpayClientOptions) {
    assertServerEnvironment(options.dangerouslyAllowBrowser);
    const http = createHttpClient(options.apiKey, KeyKind.SECRET, options, "HsrcpayClient");
    this.payments = new PaymentsResource(http);
    this.charges = new ChargesResource(http);
    this.refunds = new RefundsResource(http);
    this.customers = new CustomersResource(http);
    this.products = new ProductsResource(http);
    this.prices = new PricesResource(http);
    this.checkoutSessions = new CheckoutSessionsResource(http);
    this.disputes = new DisputesResource(http);
    this.subscriptions = new SubscriptionsResource(http);
    this.invoices = new InvoicesResource(http);
  }
}
