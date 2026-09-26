import { ConflictException, Inject, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import type { PaymentStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";
import { PAYMENT_GATEWAY, type PaymentGateway } from "./payment-gateway.port.js";
import { nextPaymentStatus } from "./payment-state.js";

export const ANALYSIS_PRICE_XOF = 1000;

function webAppUrl(): string {
  return (process.env.WEB_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}

  async startCheckout(ideaId: string): Promise<{ paymentId: string; redirectUrl: string }> {
    const idea = await this.prisma.idea.findUniqueOrThrow({ where: { id: ideaId }, select: { paidAt: true } });
    if (idea.paidAt) {
      throw new ConflictException("Cette analyse est deja payee.");
    }

    const payment = await this.prisma.payment.create({
      data: { ideaId, provider: this.gateway.name, amount: ANALYSIS_PRICE_XOF, currency: "XOF" },
    });

    let session;
    try {
      session = await this.gateway.createCheckout({
        ideaId,
        paymentId: payment.id,
        amount: ANALYSIS_PRICE_XOF,
        currency: "XOF",
        description: "Analyse complete Ca tient ?",
        returnUrl: `${webAppUrl()}/analyse/${ideaId}`,
      });
    } catch (error) {
      // A payment that never reached the provider must not look "pending" forever to the user.
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: "canceled" } });
      this.logger.warn(`Creation du paiement ${payment.id} impossible : ${error instanceof Error ? error.message : error}`);
      throw new ServiceUnavailableException("Le paiement n'a pas pu etre initialise, reessaie.");
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { providerTransactionId: session.providerTransactionId },
    });
    await this.applyStatus(payment.id, session.initialStatus);

    return { paymentId: payment.id, redirectUrl: session.redirectUrl };
  }

  async getStatus(ideaId: string): Promise<{ paid: boolean; status: PaymentStatus | null }> {
    const latest = await this.prisma.payment.findFirst({ where: { ideaId }, orderBy: { createdAt: "desc" } });

    // The user may come back from FedaPay before the webhook: ask FedaPay directly (server side).
    if (latest?.status === "pending" && latest.providerTransactionId) {
      try {
        await this.applyStatus(latest.id, await this.gateway.fetchStatus(latest.providerTransactionId));
      } catch (error) {
        this.logger.warn(`Relecture du paiement ${latest.id} impossible : ${error instanceof Error ? error.message : error}`);
      }
    }

    const [idea, current] = await Promise.all([
      this.prisma.idea.findUniqueOrThrow({ where: { id: ideaId }, select: { paidAt: true } }),
      latest ? this.prisma.payment.findUniqueOrThrow({ where: { id: latest.id }, select: { status: true } }) : null,
    ]);
    return { paid: idea.paidAt !== null, status: current?.status ?? null };
  }

  async handleProviderUpdate(providerTransactionId: string): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { provider_providerTransactionId: { provider: this.gateway.name, providerTransactionId } },
    });
    if (!payment) return;

    await this.applyStatus(payment.id, await this.gateway.fetchStatus(providerTransactionId));
  }

  private async applyStatus(paymentId: string, incoming: PaymentStatus): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
      const next = nextPaymentStatus(payment.status, incoming);
      if (!next) return;

      // Conditional on the status we read: two concurrent webhooks cannot both apply the transition.
      const updated = await tx.payment.updateMany({
        where: { id: paymentId, status: payment.status },
        data: { status: next, ...(next === "approved" ? { confirmedAt: new Date() } : {}) },
      });
      if (updated.count === 0 || next !== "approved") return;

      await tx.idea.updateMany({ where: { id: payment.ideaId, paidAt: null }, data: { paidAt: new Date() } });
    });
  }
}
