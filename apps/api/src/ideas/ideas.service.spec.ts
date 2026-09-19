import { PrismaService } from "../prisma/prisma.service.js";
import { FinancialEngineService } from "../financial-engine/financial-engine.service.js";
import { IdeasService } from "./ideas.service.js";
import type { CreateIdeaDto } from "./dto/create-idea.dto.js";

function payload(overrides: Partial<CreateIdeaDto> = {}): CreateIdeaDto {
  return {
    businessModel: "ECOMMERCE",
    rawDescription: "Vente de vêtements en ligne pour jeunes actifs.",
    currency: "XOF",
    hypotheses: { price: 5000, volume: 50, variableCostPerUnit: 2000, fixedCosts: 100000 },
    ...overrides,
  } as CreateIdeaDto;
}

describe("IdeasService.create", () => {
  const prisma = new PrismaService();
  const service = new IdeasService(prisma, new FinancialEngineService());

  beforeAll(async () => {
    await prisma.onModuleInit();
  });

  afterEach(async () => {
    await prisma.idea.deleteMany();
  });

  afterAll(async () => {
    await prisma.onModuleDestroy();
  });

  it("persists the idea, its hypotheses and the preview simulation", async () => {
    const { ideaId, result, breakEven } = await service.create(payload());

    expect(result).toEqual({ currency: "XOF", revenue: 250000, grossMargin: 150000, estimatedResult: 50000 });
    expect(breakEven).toEqual({ reachable: true, volumeUnits: 34 });

    const stored = await prisma.idea.findUniqueOrThrow({
      where: { id: ideaId },
      include: { hypotheses: true, simulations: true },
    });

    expect(stored.businessModel).toBe("ECOMMERCE");
    expect(stored.currency).toBe("XOF");
    expect(stored.hypotheses).toHaveLength(4);
    expect(stored.hypotheses.every((h) => h.source === "utilisateur_saisi")).toBe(true);
    expect(stored.simulations).toHaveLength(1);
    expect(stored.simulations[0]?.type).toBe("apercu");
  });

  it("stores the input snapshot used for the simulation", async () => {
    const { ideaId } = await service.create(payload());

    const simulation = await prisma.simulation.findFirstOrThrow({ where: { ideaId } });

    expect(simulation.inputsSnapshot).toEqual({
      currency: "XOF",
      price: 5000,
      volume: 50,
      variableCostPerUnit: 2000,
      fixedCosts: 100000,
    });
  });
});

describe("IdeasService.findOne", () => {
  const prisma = new PrismaService();
  const service = new IdeasService(prisma, new FinancialEngineService());

  beforeAll(async () => {
    await prisma.onModuleInit();
  });

  afterEach(async () => {
    await prisma.idea.deleteMany();
  });

  afterAll(async () => {
    await prisma.onModuleDestroy();
  });

  it("returns the idea with its hypotheses and latest simulation", async () => {
    const { ideaId } = await service.create(payload());

    const idea = await service.findOne(ideaId);

    expect(idea?.id).toBe(ideaId);
    expect(idea?.businessModel).toBe("ECOMMERCE");
    expect(idea?.hypotheses).toHaveLength(4);
    expect(idea?.simulation?.type).toBe("apercu");
  });

  it("returns null for an unknown id", async () => {
    const idea = await service.findOne("does-not-exist");

    expect(idea).toBeNull();
  });
});
