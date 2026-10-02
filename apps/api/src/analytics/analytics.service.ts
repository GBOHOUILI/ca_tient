import { Injectable } from "@nestjs/common";
import type { AnalyticsEventType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";
import type { ClientEventType, StatsPeriod } from "./dto/track-event.dto.js";

const PERIOD_DAYS: Record<Exclude<StatsPeriod, "all">, number> = { "7d": 7, "30d": 30 };
const DAY_MS = 24 * 60 * 60 * 1000;

export type FunnelStepKey =
  | "landing_view"
  | "test_started"
  | "preview"
  | "offer_viewed"
  | "payment_initiated"
  | "payment_confirmed"
  | "what_if_used"
  | "report_viewed";

export interface FunnelStats {
  period: StatsPeriod;
  from: string | null;
  steps: { key: FunnelStepKey; count: number }[];
  reportPrinted: number;
  recoveries: number;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async track(event: { type: ClientEventType; sessionId: string; ideaId?: string }): Promise<void> {
    await this.prisma.analyticsEvent.create({ data: event });
  }

  async funnel(period: StatsPeriod, now = new Date()): Promise<FunnelStats> {
    const from = period === "all" ? null : new Date(now.getTime() - PERIOD_DAYS[period] * DAY_MS);
    const since = from ? { gte: from } : undefined;

    // Distinct counts everywhere: a reload or a React double render must not inflate a step.
    const distinctSessions = (type: AnalyticsEventType) =>
      this.prisma.analyticsEvent
        .findMany({ where: { type, createdAt: since }, distinct: ["sessionId"], select: { sessionId: true } })
        .then((rows) => rows.length);
    const distinctIdeas = (type: AnalyticsEventType) =>
      this.prisma.analyticsEvent
        .findMany({ where: { type, createdAt: since, ideaId: { not: null } }, distinct: ["ideaId"], select: { ideaId: true } })
        .then((rows) => rows.length);

    const [landing, started, preview, offer, initiated, confirmed, whatIf, reportViewed, reportPrinted, recoveries] =
      await Promise.all([
        distinctSessions("landing_view"),
        distinctSessions("test_started"),
        this.prisma.idea.count({ where: { createdAt: since } }),
        distinctIdeas("offer_viewed"),
        this.prisma.payment
          .findMany({ where: { createdAt: since }, distinct: ["ideaId"], select: { ideaId: true } })
          .then((rows) => rows.length),
        this.prisma.idea.count({ where: { paidAt: since ?? { not: null } } }),
        distinctIdeas("what_if_used"),
        distinctIdeas("report_viewed"),
        distinctIdeas("report_printed"),
        this.prisma.ideaAccessToken.count({ where: { createdAt: since } }),
      ]);

    return {
      period,
      from: from?.toISOString() ?? null,
      steps: [
        { key: "landing_view", count: landing },
        { key: "test_started", count: started },
        { key: "preview", count: preview },
        { key: "offer_viewed", count: offer },
        { key: "payment_initiated", count: initiated },
        { key: "payment_confirmed", count: confirmed },
        { key: "what_if_used", count: whatIf },
        { key: "report_viewed", count: reportViewed },
      ],
      reportPrinted,
      recoveries,
    };
  }
}
