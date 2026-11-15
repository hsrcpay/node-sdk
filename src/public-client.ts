import { createHttpClient, type BaseClientOptions } from "./core/config";
import { KeyKind } from "./core/key";
import { PublicCheckoutSessionsResource } from "./modules/checkout-sessions";
import { PublicPaymentsResource } from "./modules/payments";

export type HsrcpayPublicClientOptions = BaseClientOptions & {
  /** Publishable API key (`pk_live_...` or `pk_test_...`). Safe to ship to browsers and mobile apps. */
  publishableKey: string;
};

/**
 * Client for a publishable key. The API limits a publishable key to the hosted checkout flow, so this client exposes
 * exactly that: read a session by its token, set the customer-entered amount, prepare the payment, then read or
 * confirm it. Everything else (products, customers, creating payments, refunds) needs a secret key on your server.
 */
export class HsrcpayPublicClient {
  readonly checkoutSessions: PublicCheckoutSessionsResource;
  readonly payments: PublicPaymentsResource;

  constructor(options: HsrcpayPublicClientOptions) {
    const http = createHttpClient(options.publishableKey, KeyKind.PUBLISHABLE, options, "HsrcpayPublicClient");
    this.checkoutSessions = new PublicCheckoutSessionsResource(http);
    this.payments = new PublicPaymentsResource(http);
  }
}
