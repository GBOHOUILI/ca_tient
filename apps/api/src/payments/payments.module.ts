import { Module } from "@nestjs/common";
import { FedaPayWebhookController } from "./fedapay-webhook.controller.js";
import { createPaymentGateway } from "./payment-gateway.factory.js";
import { PAYMENT_GATEWAY } from "./payment-gateway.port.js";
import { PaymentService } from "./payment.service.js";
import { PaymentsController } from "./payments.controller.js";

@Module({
  controllers: [PaymentsController, FedaPayWebhookController],
  providers: [PaymentService, { provide: PAYMENT_GATEWAY, useFactory: () => createPaymentGateway() }],
})
export class PaymentsModule {}
