import type { PaymentStatus } from "@prisma/client";
import {
  PaymentGatewayError,
  type CheckoutRequest,
  type CheckoutSession,
  type PaymentGateway,
} from "./payment-gateway.port.js";

const BASE_URLS = { sandbox: "https://sandbox-api.fedapay.com", live: "https://api.fedapay.com" } as const;
const REQUEST_TIMEOUT_MS = 10_000;

export interface FedaPayConfig {
  secretKey: string;
  environment: "sandbox" | "live";
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : undefined;
}

// FedaPay's response envelope is not documented reliably: accept both {"v1/transaction": {...}} and a bare object.
export function unwrapFedaPayTransaction(body: unknown): Record<string, unknown> | undefined {
  const record = asRecord(body);
  if (!record) return undefined;
  return asRecord(record["v1/transaction"]) ?? asRecord(record.transaction) ?? record;
}

export function mapFedaPayStatus(status: unknown): PaymentStatus {
  switch (status) {
    case "approved":
    case "transferred":
    case "refunded":
    case "partially_refunded":
    case "approved_partially_refunded":
    case "transferred_partially_refunded":
      // Access was paid for; refunds are out of MVP scope and handled manually.
      return "approved";
    case "declined":
      return "declined";
    case "canceled":
    case "cancelled":
    case "expired":
      return "canceled";
    default:
      return "pending";
  }
}

export function extractFedaPayTransactionId(event: unknown): string | undefined {
  const id = asRecord(asRecord(event)?.entity)?.id;
  return typeof id === "number" || (typeof id === "string" && id.length > 0) ? String(id) : undefined;
}

export class FedaPayGateway implements PaymentGateway {
  readonly name = "fedapay" as const;

  constructor(private readonly config: FedaPayConfig) {}

  async createCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
    const created = unwrapFedaPayTransaction(
      await this.call("POST", "/v1/transactions", {
        description: request.description,
        amount: request.amount,
        currency: { iso: request.currency },
        callback_url: request.returnUrl,
      }),
    );
    const id = created?.id;
    if (typeof id !== "number" && typeof id !== "string") {
      throw new PaymentGatewayError("fedapay: transaction creee sans identifiant");
    }

    const token = asRecord(await this.call("POST", `/v1/transactions/${id}/token`));
    if (typeof token?.url !== "string") {
      throw new PaymentGatewayError("fedapay: jeton de paiement sans url");
    }

    return { providerTransactionId: String(id), redirectUrl: token.url, initialStatus: "pending" };
  }

  async fetchStatus(providerTransactionId: string): Promise<PaymentStatus> {
    const body = await this.call("GET", `/v1/transactions/${encodeURIComponent(providerTransactionId)}`);
    return mapFedaPayStatus(unwrapFedaPayTransaction(body)?.status);
  }

  private async call(method: "GET" | "POST", path: string, body?: unknown): Promise<unknown> {
    let response: Response;
    try {
      const init: RequestInit = {
        method,
        headers: {
          Authorization: `Bearer ${this.config.secretKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      };
      if (body !== undefined) {
        init.body = JSON.stringify(body);
      }
      response = await fetch(`${BASE_URLS[this.config.environment]}${path}`, init);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new PaymentGatewayError(`fedapay: ${method} ${path} injoignable (${message})`);
    }

    if (!response.ok) {
      throw new PaymentGatewayError(`fedapay: HTTP ${response.status} sur ${method} ${path}`);
    }

    try {
      return await response.json();
    } catch {
      throw new PaymentGatewayError(`fedapay: reponse illisible sur ${method} ${path}`);
    }
  }
}
