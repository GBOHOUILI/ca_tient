import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { computeBreakEven, computeCapitalNeed, computeResult } from "financial-engine";
import { AnalyticsService } from "../analytics/analytics.service.js";
import { deleteIdeaWithData } from "../ideas/delete-idea.js";
import { hypothesesFromRows } from "../ideas/hypotheses-from-rows.js";
import { PrismaService } from "../prisma/prisma.service.js";
import {
  conversionBy,
  countBy,
  dailyActivity,
  holds,
  holdsShare,
  perBusinessModel,
  revenueSeries,
  type IdeaRow,
} from "./admin-stats.js";
import { toCsv } from "./csv.js";
import type { AdminFiltersDto, AdminIdeasQueryDto, AdminPeriod } from "./dto/admin-filters.dto.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const PERIOD_DAYS: Record<Exclude<AdminPeriod, "all">, number> = { "7d": 7, "30d": 30, "90d": 90 };
const PAGE_SIZE = 20;

const IDEA_INCLUDE = { hypotheses: true, profile: true, capitalPlan: true } satisfies Prisma.IdeaInclude;
type LoadedIdea = Prisma.IdeaGetPayload<{ include: typeof IDEA_INCLUDE }>;


function toRow(idea: LoadedIdea): IdeaRow {
  const plan = idea.capitalPlan;
  return {
    id: idea.id,
    createdAt: idea.createdAt,
    businessModel: idea.businessModel,
    currency: idea.currency,
    paidAt: idea.paidAt,
    hypotheses: hypothesesFromRows(idea.currency, idea.hypotheses),
    country: idea.profile?.country ?? null,
    profile: idea.profile?.profile ?? null,
    stage: idea.profile?.stage ?? null,
    heardFrom: idea.profile?.heardFrom ?? null,
    utmSource: idea.utmSource,
    capital: plan
      ? {
          equipment: plan.equipment,
          initialStock: plan.initialStock,
          openingCosts: plan.openingCosts,
          other: plan.other,
          availableCapital: plan.availableCapital,
        }
      : null,
  };
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
  ) {}

  private since(period: AdminPeriod, now: Date): Date | null {
    return period === "all" ? null : new Date(now.getTime() - PERIOD_DAYS[period] * DAY_MS);
  }

  private ideaWhere(filters: AdminFiltersDto, since: Date | null): Prisma.IdeaWhereInput {
    return {
      createdAt: since ? { gte: since } : undefined,
      businessModel: filters.businessModel,
      locale: filters.locale,
      profile: filters.country ? { is: { country: filters.country } } : undefined,
    };
  }

  private async loadRows(filters: AdminFiltersDto, since: Date | null): Promise<IdeaRow[]> {
    const ideas = await this.prisma.idea.findMany({ where: this.ideaWhere(filters, since), include: IDEA_INCLUDE });
    return ideas.map(toRow);
  }

  async overview(filters: AdminFiltersDto, now = new Date()) {
    const period = filters.period ?? "30d";
    const since = this.since(period, now);
    const rows = await this.loadRows(filters, since);
    const [visits, revenue] = await Promise.all([
      this.prisma.analyticsEvent
        .findMany({
          where: { type: "landing_view", createdAt: since ? { gte: since } : undefined },
          distinct: ["sessionId"],
          select: { sessionId: true },
        })
        .then((sessions) => sessions.length),
      this.revenue(filters, now).then((series) => series.total),
    ]);
    const paidIdeas = rows.filter((row) => row.paidAt !== null).length;
    const firstDay = since ?? rows.reduce<Date | null>((min, row) => (!min || row.createdAt < min ? row.createdAt : min), null) ?? now;

    return {
      kpis: {
        visits,
        ideas: rows.length,
        paidIdeas,
        revenue,
        previewToPaidRate: rows.length === 0 ? null : paidIdeas / rows.length,
        holdsShare: holdsShare(rows),
      },
      daily: dailyActivity(rows, firstDay, now),
    };
  }

  async market(filters: AdminFiltersDto, now = new Date()) {
    const rows = await this.loadRows(filters, this.since(filters.period ?? "30d", now));
    const currency = filters.currency ?? "XOF";
    return {
      total: rows.length,
      currency,
      currencies: countBy(rows, (row) => row.currency),
      byBusinessModel: countBy(rows, (row) => row.businessModel),
      byCountry: countBy(rows, (row) => row.country),
      byProfile: countBy(rows, (row) => row.profile),
      byStage: countBy(rows, (row) => row.stage),
      perBusinessModel: perBusinessModel(rows, currency),
    };
  }

  async conversion(filters: AdminFiltersDto, now = new Date()) {
    const period = filters.period ?? "30d";
    const rows = await this.loadRows(filters, this.since(period, now));
    return {
      // Browser events carry no business model or country: the funnel only follows the period.
      funnel: await this.analytics.funnel(period, now),
      byBusinessModel: conversionBy(rows, (row) => row.businessModel),
      byHeardFrom: conversionBy(rows, (row) => row.heardFrom),
      byUtmSource: conversionBy(rows, (row) => row.utmSource),
      byCountry: conversionBy(rows, (row) => row.country),
    };
  }

  async revenue(filters: AdminFiltersDto, now = new Date()) {
    const since = this.since(filters.period ?? "30d", now);
    const payments = await this.prisma.payment.findMany({
      where: {
        currency: "XOF",
        createdAt: since ? { gte: since } : undefined,
        idea: {
          businessModel: filters.businessModel,
          locale: filters.locale,
          profile: filters.country ? { is: { country: filters.country } } : undefined,
        },
      },
      select: { amount: true, currency: true, status: true, createdAt: true, confirmedAt: true },
    });
    return revenueSeries(payments);
  }

  async ideas(query: AdminIdeasQueryDto, now = new Date()) {
    const where: Prisma.IdeaWhereInput = {
      ...this.ideaWhere(query, this.since(query.period ?? "all", now)),
      // Prisma binds the search as a parameter and escapes % and _ itself. The contact is searched
      // too, to find a person who asks for their data to be deleted.
      OR: query.search
        ? [
            { rawDescription: { contains: query.search, mode: "insensitive" } },
            { profile: { is: { contact: { contains: query.search, mode: "insensitive" } } } },
          ]
        : undefined,
      paidAt: query.paid === "true" ? { not: null } : query.paid === "false" ? null : undefined,
    };
    const page = query.page ?? 1;
    const [total, ideas] = await Promise.all([
      this.prisma.idea.count({ where }),
      this.prisma.idea.findMany({
        where,
        include: IDEA_INCLUDE,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
    ]);

    return {
      total,
      page,
      pageSize: PAGE_SIZE,
      items: ideas.map((idea) => ({
        id: idea.id,
        createdAt: idea.createdAt,
        businessModel: idea.businessModel,
        country: idea.profile?.country ?? null,
        currency: idea.currency,
        locale: idea.locale,
        holds: holds(toRow(idea)),
        paid: idea.paidAt !== null,
        hasContact: Boolean(idea.profile?.contactConsent && idea.profile.contact),
        excerpt: idea.rawDescription.slice(0, 140),
      })),
    };
  }

  async idea(id: string) {
    const idea = await this.prisma.idea.findUnique({
      where: { id },
      include: {
        ...IDEA_INCLUDE,
        canvasBlocks: true,
        payments: { orderBy: { createdAt: "asc" } },
        accessTokens: { select: { id: true } },
      },
    });
    if (!idea) throw new NotFoundException(`Idee ${id} introuvable.`);

    const hypotheses = hypothesesFromRows(idea.currency, idea.hypotheses);
    const row = toRow(idea);
    let result = null;
    let breakEven = null;
    let need = null;
    if (hypotheses) {
      try {
        result = computeResult(hypotheses);
        breakEven = computeBreakEven(hypotheses);
        need = row.capital ? computeCapitalNeed(hypotheses, row.capital) : null;
      } catch {
        // invalid stored hypotheses: shown as entered, without computed figures
      }
    }
    const events = await this.prisma.analyticsEvent.findMany({
      where: { ideaId: id },
      orderBy: { createdAt: "asc" },
      select: { type: true, createdAt: true },
    });
    const profile = idea.profile;

    return {
      idea: {
        id: idea.id,
        createdAt: idea.createdAt,
        businessModel: idea.businessModel,
        rawDescription: idea.rawDescription,
        currency: idea.currency,
        locale: idea.locale,
        paidAt: idea.paidAt,
      },
      acquisition: {
        utmSource: idea.utmSource,
        utmMedium: idea.utmMedium,
        utmCampaign: idea.utmCampaign,
        referrerHost: idea.referrerHost,
      },
      hypotheses,
      result,
      breakEven,
      canvas: Object.fromEntries(idea.canvasBlocks.map((block) => [block.key, block.content])),
      capital: row.capital && need ? { plan: row.capital, need } : null,
      profile: profile
        ? {
            country: profile.country,
            city: profile.city,
            profile: profile.profile,
            stage: profile.stage,
            heardFrom: profile.heardFrom,
            // Never exposed without consent, even for older rows written before the rule.
            contact: profile.contactConsent ? profile.contact : null,
            consentAt: profile.contactConsent ? profile.consentAt : null,
          }
        : null,
      payments: idea.payments.map((payment) => ({
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        provider: payment.provider,
        createdAt: payment.createdAt,
        confirmedAt: payment.confirmedAt,
      })),
      events,
      recoveries: idea.accessTokens.length,
    };
  }

  // Deletion on request (data protection): the idea and everything attached to it.
  async deleteIdea(id: string): Promise<void> {
    if (!(await deleteIdeaWithData(this.prisma, id))) throw new NotFoundException(`Idee ${id} introuvable.`);
  }

  async contactsCsv(): Promise<string> {
    const profiles = await this.prisma.ideaProfile.findMany({
      where: { contactConsent: true, contact: { not: null } },
      include: { idea: { select: { id: true, businessModel: true, createdAt: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return toCsv(
      ["date", "pays", "ville", "profil", "avancement", "type_de_business", "contact", "consentement_le", "idee"],
      profiles.map((profile) => [
        profile.idea.createdAt.toISOString().slice(0, 10),
        profile.country,
        profile.city,
        profile.profile,
        profile.stage,
        profile.idea.businessModel,
        profile.contact,
        profile.consentAt?.toISOString() ?? null,
        profile.idea.id,
      ]),
    );
  }
}
