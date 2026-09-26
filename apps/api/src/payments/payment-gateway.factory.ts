import { FedaPayGateway } from "./fedapay.gateway.js";
import type { PaymentGateway } from "./payment-gateway.port.js";
import { TestPaymentGateway } from "./test-payment.gateway.js";

export function createPaymentGateway(env: NodeJS.ProcessEnv = process.env): PaymentGateway {
  const provider = env.PAYMENT_PROVIDER?.trim() || "test";

  if (provider === "test") {
    if (env.NODE_ENV === "production") {
      throw new Error("PAYMENT_PROVIDER=test est interdit en production : il approuve tout paiement.");
    }
    return new TestPaymentGateway();
  }

  if (provider === "fedapay") {
    const secretKey = env.FEDAPAY_SECRET_KEY?.trim();
    if (!secretKey) throw new Error("PAYMENT_PROVIDER=fedapay exige FEDAPAY_SECRET_KEY.");
    if (!env.FEDAPAY_WEBHOOK_SECRET?.trim()) throw new Error("PAYMENT_PROVIDER=fedapay exige FEDAPAY_WEBHOOK_SECRET.");
    return new FedaPayGateway({ secretKey, environment: env.FEDAPAY_ENV === "live" ? "live" : "sandbox" });
  }

  throw new Error(`PAYMENT_PROVIDER inconnu : ${provider}`);
}
