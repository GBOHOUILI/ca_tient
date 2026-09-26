import { NotFoundException } from "@nestjs/common";
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

describe("IdeasService.updateCanvasBlocks", () => {
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

  function canvasPayload() {
    return {
      blocks: [
        { key: "valueProposition" as const, content: "Des sacs faits main." },
        { key: "customerSegments" as const, content: "Jeunes actifs urbains." },
        { key: "channels" as const, content: "Instagram." },
        { key: "customerRelationships" as const, content: "WhatsApp." },
        { key: "keyResources" as const, content: "Machine a coudre." },
        { key: "keyActivities" as const, content: "Production." },
        { key: "keyPartners" as const, content: "Fournisseur de tissu." },
      ],
      source: "utilisateur_edite" as const,
    };
  }

  it("persists the 7 blocks for an existing idea", async () => {
    const { ideaId } = await service.create(payload());

    await service.updateCanvasBlocks(ideaId, canvasPayload());

    const stored = await prisma.canvasBlock.findMany({ where: { ideaId } });
    expect(stored).toHaveLength(7);
    expect(stored.every((b) => b.source === "utilisateur_edite")).toBe(true);
    expect(stored.find((b) => b.key === "valueProposition")?.content).toBe("Des sacs faits main.");
  });

  it("upserts on a second call instead of duplicating", async () => {
    const { ideaId } = await service.create(payload());

    await service.updateCanvasBlocks(ideaId, canvasPayload());
    const updated = canvasPayload();
    updated.blocks[0].content = "Contenu modifie.";
    await service.updateCanvasBlocks(ideaId, updated);

    const stored = await prisma.canvasBlock.findMany({ where: { ideaId } });
    expect(stored).toHaveLength(7);
    expect(stored.find((b) => b.key === "valueProposition")?.content).toBe("Contenu modifie.");
  });

  it("throws NotFoundException for an unknown idea", async () => {
    await expect(service.updateCanvasBlocks("does-not-exist", canvasPayload())).rejects.toThrow();
  });
});

describe("IdeasService.update", () => {
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

  it("replaces the hypotheses and the preview simulation of the same idea", async () => {
    const { ideaId } = await service.create(payload());

    const updated = await service.update(
      ideaId,
      payload({ hypotheses: { price: 6000, volume: 50, variableCostPerUnit: 2000, fixedCosts: 100000 } }),
    );

    expect(updated.ideaId).toBe(ideaId);
    expect(updated.result.revenue).toBe(300000);

    const stored = await prisma.idea.findUniqueOrThrow({
      where: { id: ideaId },
      include: { hypotheses: true, simulations: true },
    });
    expect(stored.hypotheses).toHaveLength(4);
    expect(stored.hypotheses.find((h) => h.key === "price")?.value).toBe(6000);
    expect(stored.simulations).toHaveLength(1);
    expect(await prisma.idea.count()).toBe(1);
  });

  it("keeps the canvas blocks already saved for the idea", async () => {
    const { ideaId } = await service.create(payload());
    await prisma.canvasBlock.create({
      data: { ideaId, key: "valueProposition", content: "Des sacs faits main.", source: "utilisateur_edite" },
    });

    await service.update(ideaId, payload());

    expect(await prisma.canvasBlock.count({ where: { ideaId } })).toBe(1);
  });

  it("throws NotFoundException for an unknown idea", async () => {
    await expect(service.update("does-not-exist", payload())).rejects.toThrow(NotFoundException);
  });
});
