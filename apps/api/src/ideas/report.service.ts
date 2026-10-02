import { Inject, Injectable, UnprocessableEntityException } from "@nestjs/common";
import { Prisma, type BusinessModel } from "@prisma/client";
import {
  applyScenario,
  computeBreakEven,
  computeCapitalNeed,
  computeResult,
  computeSensitivity,
  computeWatchPoints,
  type BreakEvenResult,
  type CapitalNeed,
  type CapitalPlanInput,
  type CurrencyCode,
  type FinancialResult,
  type Hypotheses,
  type ScenarioKey,
  type SensitivityEntry,
  type WatchPointCode,
} from "financial-engine";
import { AI_PROVIDER, type AiProvider, type CanvasBlockKey, type ReportSummaryFacts } from "../ai/ai-provider.port.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { CapitalPlanDto } from "./dto/capital-plan.dto.js";
import { hypothesesFromRows } from "./hypotheses-from-rows.js";
import { buildReportFacts, factsHash, templateSummary } from "./report-summary.js";

const SCENARIOS: readonly ScenarioKey[] = ["prudent", "realiste", "ambitieux", "crise"];

export interface IdeaReport {
  idea: { id: string; businessModel: BusinessModel; rawDescription: string; currency: CurrencyCode };
  hypotheses: Hypotheses;
  result: FinancialResult;
  breakEven: BreakEvenResult;
  scenarios: { key: ScenarioKey; result: FinancialResult }[];
  capital: { plan: CapitalPlanInput; need: CapitalNeed } | null;
  sensitivity: SensitivityEntry[];
  watchPoints: WatchPointCode[];
  canvas: {
    blocks: Partial<Record<CanvasBlockKey, string>>;
    costStructure: { variableCostPerUnit: number; fixedCosts: number; startupCosts: number | null };
    revenueStreams: { price: number; volume: number; revenue: number };
  };
}

export interface ReportSummary {
  text: string;
  source: "ai" | "template";
}

@Injectable()
export class ReportService {
  // In-flight AI summaries, keyed by idea + facts hash: simultaneous requests for the same
  // report share one AI call. Process-local, which is enough for the single MVP API instance.
  private readonly pendingSummaries = new Map<string, Promise<ReportSummary>>();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(AI_PROVIDER) private readonly ai: AiProvider,
  ) {}

  async saveCapital(ideaId: string, dto: CapitalPlanDto): Promise<{ capitalNeed: CapitalNeed }> {
    const idea = await this.prisma.idea.findUniqueOrThrow({ where: { id: ideaId }, include: { hypotheses: true } });
    const plan = toPlan(dto);
    // Computed before writing: the engine validates the totals.
    const capitalNeed = computeCapitalNeed(requireHypotheses(idea.currency, idea.hypotheses), plan);
    await this.prisma.capitalPlan.upsert({ where: { ideaId }, create: { ideaId, ...plan }, update: plan });
    return { capitalNeed };
  }

  async getReport(ideaId: string): Promise<IdeaReport> {
    return (await this.loadReport(ideaId)).report;
  }

  async getSummary(ideaId: string): Promise<ReportSummary> {
    const { facts, storedSummary } = await this.loadReport(ideaId);
    const hash = factsHash(facts);
    if (storedSummary?.factsHash === hash) return { text: storedSummary.text, source: "ai" };

    const key = `${ideaId}:${hash}`;
    const pending = this.pendingSummaries.get(key);
    if (pending) return pending;

    const generation = this.generateSummary(ideaId, facts, hash).finally(() => this.pendingSummaries.delete(key));
    this.pendingSummaries.set(key, generation);
    return generation;
  }

  private async loadReport(ideaId: string): Promise<{
    report: IdeaReport;
    facts: ReportSummaryFacts;
    storedSummary: { text: string; factsHash: string } | null;
  }> {
    const idea = await this.prisma.idea.findUniqueOrThrow({
      where: { id: ideaId },
      include: { hypotheses: true, canvasBlocks: true, capitalPlan: true, reportSummary: true },
    });
    const currency = idea.currency as CurrencyCode;
    const hypotheses = requireHypotheses(currency, idea.hypotheses);
    const result = computeResult(hypotheses);
    const breakEven = computeBreakEven(hypotheses);
    const plan = idea.capitalPlan ? toPlan(idea.capitalPlan) : null;
    const need = plan ? computeCapitalNeed(hypotheses, plan) : null;
    const sensitivity = computeSensitivity(hypotheses);
    const watchPoints = computeWatchPoints(hypotheses, need);
    const blocks = Object.fromEntries(idea.canvasBlocks.map((block) => [block.key, block.content])) as Partial<
      Record<CanvasBlockKey, string>
    >;

    const facts = buildReportFacts({
      businessModel: idea.businessModel,
      estimatedResult: result.estimatedResult,
      breakEvenReachable: breakEven.reachable,
      watchPoints,
      sensitivity,
      capitalNeed: need,
      valueProposition: blocks.valueProposition ?? null,
      customerSegments: blocks.customerSegments ?? null,
    });

    const report: IdeaReport = {
      idea: { id: idea.id, businessModel: idea.businessModel, rawDescription: idea.rawDescription, currency },
      hypotheses,
      result,
      breakEven,
      scenarios: SCENARIOS.map((key) => ({ key, result: computeResult(applyScenario(hypotheses, key)) })),
      capital: plan && need ? { plan, need } : null,
      sensitivity,
      watchPoints,
      canvas: {
        blocks,
        costStructure: {
          variableCostPerUnit: hypotheses.variableCostPerUnit,
          fixedCosts: hypotheses.fixedCosts,
          startupCosts: need?.startupCosts ?? null,
        },
        revenueStreams: { price: hypotheses.price, volume: hypotheses.volume, revenue: result.revenue },
      },
    };
    return { report, facts, storedSummary: idea.reportSummary };
  }

  // Only an AI summary is stored: a template fallback is rebuilt on each request so the AI
  // gets another chance next time.
  private async generateSummary(ideaId: string, facts: ReportSummaryFacts, hash: string): Promise<ReportSummary> {
    const text = await this.ai.writeReportSummary(facts);
    if (!text) return { text: templateSummary(facts), source: "template" };

    try {
      await this.prisma.reportSummary.upsert({
        where: { ideaId },
        create: { ideaId, text, factsHash: hash },
        update: { text, factsHash: hash },
      });
    } catch (error) {
      // Another API process stored a summary at the same moment: theirs is as good as ours.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
    }
    return { text, source: "ai" };
  }
}


function requireHypotheses(currency: string, rows: { key: string; value: number }[]): Hypotheses {
  const hypotheses = hypothesesFromRows(currency, rows);
  if (!hypotheses) throw new UnprocessableEntityException("Hypotheses incompletes pour cette idee.");
  return hypotheses;
}

function toPlan(source: CapitalPlanInput): CapitalPlanInput {
  return {
    equipment: source.equipment,
    initialStock: source.initialStock,
    openingCosts: source.openingCosts,
    other: source.other,
    availableCapital: source.availableCapital,
  };
}
