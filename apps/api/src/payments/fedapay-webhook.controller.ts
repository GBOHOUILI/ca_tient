import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Req,
  ServiceUnavailableException,
  type RawBodyRequest,
} from "@nestjs/common";
import type { Request } from "express";
import { extractFedaPayTransactionId } from "./fedapay.gateway.js";
import { verifyFedaPaySignature } from "./fedapay-signature.js";
import { PaymentGatewayError } from "./payment-gateway.port.js";
import { PaymentService } from "./payment.service.js";

@Controller("payments/webhook")
export class FedaPayWebhookController {
  constructor(private readonly payments: PaymentService) {}

  @Post("fedapay")
  @HttpCode(HttpStatus.OK)
  async handle(@Req() request: RawBodyRequest<Request>, @Headers("x-fedapay-signature") signature?: string) {
    const secret = process.env.FEDAPAY_WEBHOOK_SECRET?.trim();
    if (!secret) {
      throw new NotFoundException();
    }

    const rawBody = request.rawBody;
    if (!rawBody || !verifyFedaPaySignature(rawBody, signature, secret)) {
      throw new BadRequestException("Signature FedaPay invalide.");
    }

    let event: unknown;
    try {
      event = JSON.parse(rawBody.toString("utf8"));
    } catch {
      throw new BadRequestException("Corps de webhook illisible.");
    }

    const transactionId = extractFedaPayTransactionId(event);
    if (transactionId) {
      try {
        await this.payments.handleProviderUpdate(transactionId);
      } catch (error) {
        // Let FedaPay retry later when its own API could not be re-read.
        if (error instanceof PaymentGatewayError) throw new ServiceUnavailableException();
        throw error;
      }
    }

    return { received: true };
  }
}
