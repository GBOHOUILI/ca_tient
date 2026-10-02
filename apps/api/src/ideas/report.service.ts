import { Inject, Injectable } from "@nestjs/common";
import type { BusinessModel } from "@prisma/client";
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
  summary: { text: string; source: "ai" | "template" };
}

@Injectable()
export class ReportService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AI_PROVIDER) private readonly ai: AiProvider,
  ) {}

  async saveCapital(ideaId: string, dto: CapitalPlanDto): Promise<{ capitalNeed: CapitalNeed }> {
    const idea = await this.prisma.idea.findUniqueOrThrow({ where: { id: ideaId }, include: { hypotheses: true } });
    const plan = toPlan(dto);
    // Computed before writing: the engine validates the totals.
    const capitalNeed = computeCapitalNeed(toHypotheses(idea.currency, idea.hypotheses), plan);
    await this.prisma.capitalPlan.upsert({ where: { ideaId }, create: { ideaId, ...plan }, update: plan });
    return { capitalNeed };
  }

  async getReport(ideaId: string): Promise<IdeaReport> {
    const idea = await this.prisma.idea.findUniqueOrThrow({
      where: { id: ideaId },
      include: { hypotheses: true, canvasBlocks: true, capitalPlan: true, reportSummary: true },
    });
    const currency = idea.currency as CurrencyCode;
    const hypotheses = toHypotheses(currency, idea.hypotheses);
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

    return {
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
      summary: await this.resolveSummary(ideaId, facts, idea.reportSummary),
    };
  }

  // Only an AI summary is stored: a template fallback is rebuilt on each request so the AI
  // gets another chance next time.
  private async resolveSummary(
    ideaId: string,
    facts: ReportSummaryFacts,
    stored: { text: string; factsHash: string } | null,
  ): Promise<IdeaReport["summary"]> {
    const hash = factsHash(facts);
    if (stored?.factsHash === hash) return { text: stored.text, source: "ai" };

    const text = await this.ai.writeReportSummary(facts);
    if (!text) return { text: templateSummary(facts), source: "template" };

    await this.prisma.reportSummary.upsert({
      where: { ideaId },
      create: { ideaId, text, factsHash: hash },
      update: { text, factsHash: hash },
    });
    return { text, source: "ai" };
  }
}

function toHypotheses(currency: string, rows: { key: string; value: number }[]): Hypotheses {
  const value = (key: string) => rows.find((row) => row.key === key)?.value ?? 0;
  return {
    currency: currency as CurrencyCode,
    price: value("price"),
    volume: value("volume"),
    variableCostPerUnit: value("variableCostPerUnit"),
    fixedCosts: value("fixedCosts"),
  };
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
