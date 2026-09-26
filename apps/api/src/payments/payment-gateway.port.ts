import type { PaymentProvider, PaymentStatus } from "@prisma/client";

export const PAYMENT_GATEWAY = Symbol("PAYMENT_GATEWAY");

export interface CheckoutRequest {
  ideaId: string;
  paymentId: string;
  amount: number;
  currency: string;
  description: string;
  returnUrl: string;
}

export interface CheckoutSession {
  providerTransactionId: string;
  redirectUrl: string;
  initialStatus: PaymentStatus;
}

export interface PaymentGateway {
  readonly name: PaymentProvider;
  createCheckout(request: CheckoutRequest): Promise<CheckoutSession>;
  fetchStatus(providerTransactionId: string): Promise<PaymentStatus>;
}

export class PaymentGatewayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentGatewayError";
  }
}
