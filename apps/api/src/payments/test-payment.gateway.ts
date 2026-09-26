import type { PaymentStatus } from "@prisma/client";
import type { CheckoutRequest, CheckoutSession, PaymentGateway } from "./payment-gateway.port.js";

// Development/demo only (refused in production by createPaymentGateway): approves at once.
export class TestPaymentGateway implements PaymentGateway {
  readonly name = "test" as const;

  async createCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
    return { providerTransactionId: `test_${request.paymentId}`, redirectUrl: request.returnUrl, initialStatus: "approved" };
  }

  async fetchStatus(): Promise<PaymentStatus> {
    return "approved";
  }
}
