import { ConflictException, Inject, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import type { PaymentStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";
import { PAYMENT_GATEWAY, type PaymentGateway } from "./payment-gateway.port.js";
import { nextPaymentStatus } from "./payment-state.js";
import { analysisPriceXof } from "./pricing.js";
import { primaryWebAppUrl } from "../web-app-url.js";
import { asLocale, localePrefix } from "../i18n/locale.js";

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}

  async startCheckout(ideaId: string): Promise<{ paymentId: string | null; redirectUrl: string }> {
    // Re-read any pending payment before charging again: the user may already have paid at
    // FedaPay (webhook not arrived yet) — creating a second transaction would be a double charge.
    const { anyFailed } = await this.reReadPendingPayments(ideaId);

    const idea = await this.prisma.idea.findUniqueOrThrow({ where: { id: ideaId }, select: { paidAt: true, locale: true } });
    const analysisUrl = `${primaryWebAppUrl()}${localePrefix(asLocale(idea.locale))}/analyse/${ideaId}`;
    if (idea.paidAt) {
      throw new ConflictException("Cette analyse est deja payee.");
    }
    if (anyFailed) {
      throw new ServiceUnavailableException("Le paiement n'a pas pu etre initialise, reessaie.");
    }

    const price = analysisPriceXof();
    // Free analysis (ANALYSIS_PRICE_XOF=0, used for tests): unlocked at once, no provider involved.
    if (price === 0) {
      await this.prisma.idea.updateMany({ where: { id: ideaId, paidAt: null }, data: { paidAt: new Date() } });
      return { paymentId: null, redirectUrl: analysisUrl };
    }

    const payment = await this.prisma.payment.create({
      data: { ideaId, provider: this.gateway.name, amount: price, currency: "XOF" },
    });

    let session;
    try {
      session = await this.gateway.createCheckout({
        ideaId,
        paymentId: payment.id,
        amount: price,
        currency: "XOF",
        description: "Analyse complete Ca tient ?",
        returnUrl: analysisUrl,
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
    // The user may come back from FedaPay before the webhook: ask FedaPay directly (server side).
    // Every pending payment is re-read, not just the latest one, so an older payment approved
    // out of order is not missed (see reReadPendingPayments).
    await this.reReadPendingPayments(ideaId);

    const [idea, latest] = await Promise.all([
      this.prisma.idea.findUniqueOrThrow({ where: { id: ideaId }, select: { paidAt: true } }),
      this.prisma.payment.findFirst({ where: { ideaId }, orderBy: { createdAt: "desc" }, select: { status: true } }),
    ]);
    return { paid: idea.paidAt !== null, status: idea.paidAt !== null ? "approved" : (latest?.status ?? null) };
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

  // Bounded to the 5 most recent pending payments: enough to catch a stale one without an
  // unbounded re-read loop. Each re-read is isolated so one provider failure does not block the
  // others; the caller decides what to do when `anyFailed` is true (getStatus ignores it and
  // still answers with whatever it could confirm, startCheckout refuses to charge again).
  private async reReadPendingPayments(ideaId: string): Promise<{ anyFailed: boolean }> {
    const pending = await this.prisma.payment.findMany({
      where: { ideaId, status: "pending", providerTransactionId: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    let anyFailed = false;
    for (const payment of pending) {
      try {
        await this.applyStatus(payment.id, await this.gateway.fetchStatus(payment.providerTransactionId!));
      } catch (error) {
        anyFailed = true;
        this.logger.warn(`Relecture du paiement ${payment.id} impossible : ${error instanceof Error ? error.message : error}`);
      }
    }
    return { anyFailed };
  }
}
