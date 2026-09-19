import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { FinancialEngineService } from "../financial-engine/financial-engine.service.js";
import type { CreateIdeaDto } from "./dto/create-idea.dto.js";
import type { Hypotheses } from "../financial-engine/financial-engine.types.js";

@Injectable()
export class IdeasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financialEngine: FinancialEngineService,
  ) {}

  async create(dto: CreateIdeaDto) {
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

    const idea = await this.prisma.idea.create({
      data: {
        businessModel: dto.businessModel,
        rawDescription: dto.rawDescription,
        currency: dto.currency,
        hypotheses: { create: hypothesesRows },
        simulations: {
          create: {
            type: "apercu",
            inputsSnapshot: hypotheses,
            result,
            breakEven,
          },
        },
      },
    });

    return { ideaId: idea.id, result, breakEven };
  }
}
