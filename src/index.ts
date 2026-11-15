export type HsrcpayClientOptions = {
  apiKey: string;
  baseUrl?: string;
};

export const DEFAULT_BASE_URL = "https://api.hsrcpay.com";

export class HsrcpayClient {
  readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(options: HsrcpayClientOptions) {
    if (!options.apiKey) throw new Error("apiKey is required");
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  }

  protected authHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.apiKey}` };
  }
}
