import { Logger } from "@nestjs/common";
import { FedaPayGateway } from "./fedapay.gateway.js";
import type { PaymentGateway } from "./payment-gateway.port.js";
import { TestPaymentGateway } from "./test-payment.gateway.js";

export function createPaymentGateway(env: NodeJS.ProcessEnv = process.env): PaymentGateway {
  const provider = env.PAYMENT_PROVIDER?.trim() || "test";

  if (provider === "test") {
    if (env.NODE_ENV === "production") {
      throw new Error("PAYMENT_PROVIDER=test est interdit en production : il approuve tout paiement.");
    }
    // FEDAPAY_ENV=live signals a real merchant account is configured for this deployment:
    // refuse the always-approving test gateway even if NODE_ENV is not "production".
    if (env.FEDAPAY_ENV === "live") {
      throw new Error("PAYMENT_PROVIDER=test est interdit quand FEDAPAY_ENV=live : il approuve tout paiement.");
    }
    new Logger("PaymentsModule").warn("PAYMENT_PROVIDER=test : les paiements sont simules, ne jamais utiliser en production");
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
