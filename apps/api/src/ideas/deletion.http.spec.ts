import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { AdminModule } from "../admin/admin.module.js";
import { AI_PROVIDER, type AiProvider } from "../ai/ai-provider.port.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { IdeasModule } from "./ideas.module.js";

const ai = { suggestHypotheses: vi.fn(), suggestCanvasBlocks: vi.fn(), writeReportSummary: vi.fn() } satisfies AiProvider;
const KEY = "admin_test_key";

describe("Deleting an idea and all its data", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const previousKey = process.env.ADMIN_KEY;

  beforeAll(async () => {
    process.env.ADMIN_KEY = KEY;
    const moduleRef = await Test.createTestingModule({ imports: [IdeasModule, AdminModule] })
      .overrideProvider(AI_PROVIDER)
      .useValue(ai)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
    prisma = moduleRef.get(PrismaService);
  });

  afterEach(async () => {
    await prisma.analyticsEvent.deleteMany();
    await prisma.idea.deleteMany();
  });

  afterAll(async () => {
    process.env.ADMIN_KEY = previousKey;
    await app.close();
  });

  const server = () => app.getHttpServer();

  // An idea with every kind of related data, so the test proves nothing is left behind.
  async function fullIdea(contact = "awa@example.com"): Promise<{ id: string; auth: [string, string] }> {
    const created = await request(server())
      .post("/ideas")
      .send({
        businessModel: "SERVICE",
        rawDescription: "Cours de soutien scolaire.",
        currency: "XOF",
        hypotheses: { price: 5000, volume: 50, variableCostPerUnit: 2000, fixedCosts: 100000 },
      })
      .expect(201);
    const id = created.body.ideaId as string;
    const auth: [string, string] = ["Authorization", `Bearer ${created.body.accessToken}`];
    await request(server()).put(`/ideas/${id}/profile`).set(...auth).send({ country: "BJ", contact, contactConsent: true }).expect(200);
    await prisma.idea.update({ where: { id }, data: { paidAt: new Date(), recoveryCodeHash: `hash-${id}` } });
    await prisma.payment.create({ data: { ideaId: id, provider: "test", amount: 1000, currency: "XOF", status: "approved" } });
    await prisma.capitalPlan.create({ data: { ideaId: id, equipment: 1, initialStock: 0, openingCosts: 0, other: 0, availableCapital: 0 } });
    await prisma.reportSummary.create({ data: { ideaId: id, text: "Synthese.", factsHash: "h" } });
    await prisma.ideaAccessToken.create({ data: { ideaId: id, tokenHash: `token-${id}` } });
    await prisma.canvasBlock.create({ data: { ideaId: id, key: "valueProposition", content: "Valeur", source: "utilisateur_edite" } });
    await prisma.analyticsEvent.create({ data: { type: "report_viewed", sessionId: "session-1", ideaId: id } });
    return { id, auth };
  }

  async function leftovers(id: string) {
    const where = { ideaId: id };
    return {
      idea: await prisma.idea.count({ where: { id } }),
      related:
        (await prisma.hypothesis.count({ where })) +
        (await prisma.simulation.count({ where })) +
        (await prisma.canvasBlock.count({ where })) +
        (await prisma.payment.count({ where })) +
        (await prisma.capitalPlan.count({ where })) +
        (await prisma.reportSummary.count({ where })) +
        (await prisma.ideaAccessToken.count({ where })) +
        (await prisma.ideaProfile.count({ where })) +
        (await prisma.analyticsEvent.count({ where })),
    };
  }

  it("lets the user delete their own analysis, with every related record", async () => {
    const { id, auth } = await fullIdea();
    const other = await fullIdea("other@example.com");

    await request(server()).delete(`/ideas/${id}`).set(...auth).expect(204);

    expect(await leftovers(id)).toEqual({ idea: 0, related: 0 });
    expect((await leftovers(other.id)).idea).toBe(1);
  });

  it("requires the idea's own access token", async () => {
    const { id } = await fullIdea();
    const other = await fullIdea("other@example.com");
    await request(server()).delete(`/ideas/${id}`).expect(401);
    await request(server()).delete(`/ideas/${id}`).set(...other.auth).expect(404);
    expect((await leftovers(id)).idea).toBe(1);
  });

  it("lets the admin delete an idea on request", async () => {
    const { id } = await fullIdea();
    await request(server()).delete(`/admin/ideas/${id}`).expect(401);
    await request(server()).delete(`/admin/ideas/${id}`).set("x-admin-key", KEY).expect(204);
    expect(await leftovers(id)).toEqual({ idea: 0, related: 0 });
    await request(server()).delete(`/admin/ideas/${id}`).set("x-admin-key", KEY).expect(404);
  });

  it("finds a person's ideas by their contact in the admin search", async () => {
    const { id } = await fullIdea("awa.k@example.com");
    await fullIdea("someone@example.com");
    const { body } = await request(server()).get("/admin/ideas?search=awa.k").set("x-admin-key", KEY).expect(200);
    expect(body.items.map((item: { id: string }) => item.id)).toEqual([id]);
  });
});
