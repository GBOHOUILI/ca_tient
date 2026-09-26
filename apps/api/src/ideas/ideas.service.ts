import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";
import { FinancialEngineService } from "../financial-engine/financial-engine.service.js";
import type { CreateIdeaDto } from "./dto/create-idea.dto.js";
import type { UpdateCanvasBlocksDto } from "./dto/update-canvas-blocks.dto.js";
import type { Hypotheses } from "financial-engine";

export interface IdeaDetail {
  id: string;
  businessModel: string;
  rawDescription: string;
  currency: string;
  hypotheses: { key: string; label: string; value: number; unit: string | null }[];
  simulation: { type: string; inputsSnapshot: unknown; result: unknown; breakEven: unknown; createdAt: Date } | null;
}

@Injectable()
export class IdeasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financialEngine: FinancialEngineService,
  ) {}

  async create(dto: CreateIdeaDto) {
    const { result, breakEven, hypothesesRows, simulation } = this.buildPreview(dto);

    const idea = await this.prisma.idea.create({
      data: {
        businessModel: dto.businessModel,
        rawDescription: dto.rawDescription,
        currency: dto.currency,
        hypotheses: { create: hypothesesRows },
        simulations: { create: simulation },
      },
    });

    return { ideaId: idea.id, result, breakEven };
  }

  // Resubmitting the wizard updates the same idea instead of creating a new one,
  // so going back a step never leaves an orphan idea (and keeps its canvas blocks).
  async update(ideaId: string, dto: CreateIdeaDto) {
    const existing = await this.prisma.idea.findUnique({ where: { id: ideaId }, select: { id: true } });
    if (!existing) {
      throw new NotFoundException(`Idee ${ideaId} introuvable.`);
    }

    const { result, breakEven, hypothesesRows, simulation } = this.buildPreview(dto);

    await this.prisma.idea.update({
      where: { id: ideaId },
      data: {
        businessModel: dto.businessModel,
        rawDescription: dto.rawDescription,
        currency: dto.currency,
        hypotheses: { deleteMany: {}, create: hypothesesRows },
        simulations: { deleteMany: { type: "apercu" }, create: simulation },
      },
    });

    return { ideaId, result, breakEven };
  }

  private buildPreview(dto: CreateIdeaDto) {
    const hypotheses: Hypotheses = {
      currency: dto.currency,
      price: dto.hypotheses.price,
      volume: dto.hypotheses.volume,
      variableCostPerUnit: dto.hypotheses.variableCostPerUnit,
      fixedCosts: dto.hypotheses.fixedCosts,
    };

    const result = this.financialEngine.computeResult(hypotheses);
    const breakEven = this.financialEngine.computeBreakEven(hypotheses);

    const hypothesesRows = [
      { key: "price", label: "Prix de vente unitaire", value: dto.hypotheses.price, unit: dto.currency },
      { key: "volume", label: "Volume de ventes", value: dto.hypotheses.volume, unit: "unites/mois" },
      {
        key: "variableCostPerUnit",
        label: "Coût variable par unité",
        value: dto.hypotheses.variableCostPerUnit,
        unit: dto.currency,
      },
      { key: "fixedCosts", label: "Coûts fixes", value: dto.hypotheses.fixedCosts, unit: dto.currency },
    ].map((row) => ({ ...row, source: "utilisateur_saisi" }));

    const simulation = {
      type: "apercu",
      inputsSnapshot: hypotheses as unknown as Prisma.InputJsonValue,
      result: result as unknown as Prisma.InputJsonValue,
      breakEven: breakEven as unknown as Prisma.InputJsonValue,
    };

    return { result, breakEven, hypothesesRows, simulation };
  }

  async findOne(id: string): Promise<IdeaDetail | null> {
    const idea = await this.prisma.idea.findUnique({
      where: { id },
      include: {
        hypotheses: true,
        simulations: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (!idea) return null;

    return {
      id: idea.id,
      businessModel: idea.businessModel,
      rawDescription: idea.rawDescription,
      currency: idea.currency,
      hypotheses: idea.hypotheses.map((h) => ({ key: h.key, label: h.label, value: h.value, unit: h.unit })),
      simulation: idea.simulations[0]
        ? {
            type: idea.simulations[0].type,
            inputsSnapshot: idea.simulations[0].inputsSnapshot,
            result: idea.simulations[0].result,
            breakEven: idea.simulations[0].breakEven,
            createdAt: idea.simulations[0].createdAt,
          }
        : null,
    };
  }

  async updateCanvasBlocks(ideaId: string, dto: UpdateCanvasBlocksDto): Promise<void> {
    const idea = await this.prisma.idea.findUnique({ where: { id: ideaId }, select: { id: true } });
    if (!idea) {
      throw new NotFoundException(`Idee ${ideaId} introuvable.`);
    }

    await this.prisma.$transaction(
      dto.blocks.map((block) =>
        this.prisma.canvasBlock.upsert({
          where: { ideaId_key: { ideaId, key: block.key } },
          create: { ideaId, key: block.key, content: block.content, source: dto.source },
          update: { content: block.content, source: dto.source },
        }),
      ),
    );
  }
}
