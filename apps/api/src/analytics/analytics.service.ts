import { Injectable } from "@nestjs/common";
import type { AnalyticsEventType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";
import type { PageViewDto } from "./dto/page-view.dto.js";
import type { ClientEventType, StatsPeriod } from "./dto/track-event.dto.js";
import { countryFromTimeZone, normalizePath, trafficSource, trafficStats } from "./traffic.js";

const PERIOD_DAYS: Record<Exclude<StatsPeriod, "all">, number> = { "7d": 7, "30d": 30, "90d": 90 };
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

  async recordPageView(dto: PageViewDto): Promise<void> {
    await this.prisma.pageView.create({
      data: {
        visitorId: dto.visitorId,
        sessionId: dto.sessionId,
        path: normalizePath(dto.path),
        locale: dto.locale,
        device: dto.device,
        country: countryFromTimeZone(dto.timeZone),
        source: trafficSource({ utmSource: dto.utmSource, referrerHost: dto.referrerHost }),
      },
    });
  }

  async traffic(period: StatsPeriod, filters: { locale?: string; country?: string } = {}, now = new Date()) {
    const firstView = period === "all" ? await this.prisma.pageView.findFirst({ orderBy: { createdAt: "asc" } }) : null;
    const from = period === "all" ? (firstView?.createdAt ?? now) : new Date(now.getTime() - PERIOD_DAYS[period] * DAY_MS);
    const views = await this.prisma.pageView.findMany({
      where: { createdAt: { gte: from }, locale: filters.locale, country: filters.country },
      select: { visitorId: true, sessionId: true, path: true, locale: true, device: true, country: true, source: true, createdAt: true },
    });
    // A visitor is new when their very first view, ever, falls inside the period.
    const visitorIds = [...new Set(views.map((view) => view.visitorId))];
    const firsts = visitorIds.length
      ? await this.prisma.pageView.groupBy({ by: ["visitorId"], where: { visitorId: { in: visitorIds } }, _min: { createdAt: true } })
      : [];
    const firstSeen = new Map(firsts.map((row) => [row.visitorId, row._min.createdAt ?? now]));
    return { period, ...trafficStats(views, firstSeen, from, now) };
  }

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
