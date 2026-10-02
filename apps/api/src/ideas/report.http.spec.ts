import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { AI_PROVIDER, CANVAS_BLOCK_KEYS, type AiProvider } from "../ai/ai-provider.port.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { IdeasModule } from "./ideas.module.js";

const CAPITAL = { equipment: 200000, initialStock: 150000, openingCosts: 50000, other: 0, availableCapital: 500000 };

const ai = {
  suggestHypotheses: vi.fn(),
  suggestCanvasBlocks: vi.fn(),
  writeReportSummary: vi.fn<AiProvider["writeReportSummary"]>(),
} satisfies AiProvider;

describe("Capital and report", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [IdeasModule] })
      .overrideProvider(AI_PROVIDER)
      .useValue(ai)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
    prisma = moduleRef.get(PrismaService);
  });

  afterEach(async () => {
    await prisma.idea.deleteMany();
    ai.writeReportSummary.mockReset();
  });

  afterAll(async () => {
    await app.close();
  });

  async function createIdea(paid: boolean): Promise<{ id: string; auth: [string, string] }> {
    const response = await request(app.getHttpServer())
      .post("/ideas")
      .send({
        businessModel: "SERVICE",
        rawDescription: "Cours de soutien scolaire a domicile.",
        currency: "XOF",
        hypotheses: { price: 5000, volume: 50, variableCostPerUnit: 2000, fixedCosts: 100000 },
      })
      .expect(201);
    const id = response.body.ideaId as string;
    if (paid) await prisma.idea.update({ where: { id }, data: { paidAt: new Date() } });
    return { id, auth: ["Authorization", `Bearer ${response.body.accessToken}`] };
  }

  it("requires the access token", async () => {
    const { id } = await createIdea(true);
    await request(app.getHttpServer()).put(`/ideas/${id}/capital`).send(CAPITAL).expect(401);
    await request(app.getHttpServer()).get(`/ideas/${id}/report`).expect(401);
  });

  it("refuses an unpaid idea with 403", async () => {
    const { id, auth } = await createIdea(false);
    await request(app.getHttpServer()).put(`/ideas/${id}/capital`).set(...auth).send(CAPITAL).expect(403);
    await request(app.getHttpServer()).get(`/ideas/${id}/report`).set(...auth).expect(403);
  });

  it("validates the capital plan", async () => {
    const { id, auth } = await createIdea(true);
    const put = (body: object) => request(app.getHttpServer()).put(`/ideas/${id}/capital`).set(...auth).send(body);
    await put({ ...CAPITAL, equipment: -1 }).expect(400);
    await put({ ...CAPITAL, other: 2_147_483_648 }).expect(400);
    await put({ ...CAPITAL, other: 1.5 }).expect(400);
  });

  it("saves the capital plan (upsert) and returns the need", async () => {
    const { id, auth } = await createIdea(true);
    const first = await request(app.getHttpServer()).put(`/ideas/${id}/capital`).set(...auth).send(CAPITAL).expect(200);
    expect(first.body.capitalNeed).toMatchObject({ capitalNeeded: 700000, financingGap: 200000 });

    await request(app.getHttpServer())
      .put(`/ideas/${id}/capital`)
      .set(...auth)
      .send({ ...CAPITAL, availableCapital: 900000 })
      .expect(200);
    expect(await prisma.capitalPlan.count({ where: { ideaId: id } })).toBe(1);
  });

  it("report without canvas blocks and without capital", async () => {
    ai.writeReportSummary.mockResolvedValue(null);
    const { id, auth } = await createIdea(true);

    const { body } = await request(app.getHttpServer()).get(`/ideas/${id}/report`).set(...auth).expect(200);

    expect(body.result).toEqual({ currency: "XOF", revenue: 250000, grossMargin: 150000, estimatedResult: 50000 });
    expect(body.breakEven).toEqual({ reachable: true, volumeUnits: 34 });
    expect(body.scenarios.map((s: { key: string }) => s.key)).toEqual(["prudent", "realiste", "ambitieux", "crise"]);
    expect(body.capital).toBeNull();
    expect(body.sensitivity[0].key).toBe("price");
    expect(body.canvas.blocks).toEqual({});
    expect(body.canvas.costStructure).toEqual({ variableCostPerUnit: 2000, fixedCosts: 100000, startupCosts: null });
    expect(body.canvas.revenueStreams).toEqual({ price: 5000, volume: 50, revenue: 250000 });
    expect(body.summary.source).toBe("template");
    expect(body.summary.text).not.toMatch(/\d/);
    expect(await prisma.reportSummary.count()).toBe(0);
  });

  it("includes the capital, canvas blocks and watch points", async () => {
    ai.writeReportSummary.mockResolvedValue(null);
    const { id, auth } = await createIdea(true);
    await request(app.getHttpServer())
      .patch(`/ideas/${id}/canvas-blocks`)
      .set(...auth)
      .send({ source: "utilisateur_edite", blocks: CANVAS_BLOCK_KEYS.map((key) => ({ key, content: `Texte ${key}` })) })
      .expect(200);
    await request(app.getHttpServer()).put(`/ideas/${id}/capital`).set(...auth).send(CAPITAL).expect(200);

    const { body } = await request(app.getHttpServer()).get(`/ideas/${id}/report`).set(...auth).expect(200);

    expect(body.capital.plan).toEqual(CAPITAL);
    expect(body.capital.need.financingGap).toBe(200000);
    expect(body.watchPoints).toContain("financing_gap");
    expect(body.canvas.blocks.valueProposition).toBe("Texte valueProposition");
    expect(body.canvas.costStructure.startupCosts).toBe(400000);
  });

  it("stores the AI summary and reuses it while the facts are unchanged", async () => {
    ai.writeReportSummary.mockResolvedValue("Ton idee tient sur le papier.");
    const { id, auth } = await createIdea(true);

    const first = await request(app.getHttpServer()).get(`/ideas/${id}/report`).set(...auth).expect(200);
    const second = await request(app.getHttpServer()).get(`/ideas/${id}/report`).set(...auth).expect(200);

    expect(first.body.summary).toEqual({ text: "Ton idee tient sur le papier.", source: "ai" });
    expect(second.body.summary).toEqual({ text: "Ton idee tient sur le papier.", source: "ai" });
    expect(ai.writeReportSummary).toHaveBeenCalledTimes(1);
  });

  it("regenerates summary when facts change", async () => {
    ai.writeReportSummary.mockResolvedValueOnce("Premiere synthese.").mockResolvedValueOnce("Seconde synthese.");
    const { id, auth } = await createIdea(true);
    await request(app.getHttpServer()).get(`/ideas/${id}/report`).set(...auth).expect(200);

    await request(app.getHttpServer()).put(`/ideas/${id}/capital`).set(...auth).send(CAPITAL).expect(200);
    const { body } = await request(app.getHttpServer()).get(`/ideas/${id}/report`).set(...auth).expect(200);

    expect(body.summary.text).toBe("Seconde synthese.");
    expect(ai.writeReportSummary).toHaveBeenCalledTimes(2);
  });
});
