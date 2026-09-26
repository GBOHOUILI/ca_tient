import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { IdeasModule } from "./ideas.module.js";
import { PrismaService } from "../prisma/prisma.service.js";

function validPayload() {
  return {
    businessModel: "ECOMMERCE",
    rawDescription: "Vente de vêtements en ligne pour jeunes actifs.",
    currency: "XOF",
    hypotheses: { price: 5000, volume: 50, variableCostPerUnit: 2000, fixedCosts: 100000 },
  };
}

async function createIdea(app: INestApplication): Promise<{ id: string; token: string }> {
  const response = await request(app.getHttpServer()).post("/ideas").send(validPayload()).expect(201);
  return { id: response.body.ideaId, token: response.body.accessToken };
}

function bearer(token: string): [string, string] {
  return ["Authorization", `Bearer ${token}`];
}

describe("IdeasController (HTTP)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [IdeasModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
    prisma = moduleRef.get(PrismaService);
  });

  afterEach(async () => {
    await prisma.idea.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /ideas creates an idea and returns the preview result", async () => {
    const response = await request(app.getHttpServer()).post("/ideas").send(validPayload()).expect(201);

    expect(response.body.ideaId).toEqual(expect.any(String));
    expect(response.body.result).toEqual({ currency: "XOF", revenue: 250000, grossMargin: 150000, estimatedResult: 50000 });
  });

  it("POST /ideas rejects an invalid payload", async () => {
    const payload = validPayload();
    payload.hypotheses.price = -1;

    await request(app.getHttpServer()).post("/ideas").send(payload).expect(400);
  });

  it("POST /ideas returns an access token", async () => {
    const { token } = await createIdea(app);

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("GET /ideas/:id returns the persisted idea", async () => {
    const { id, token } = await createIdea(app);

    const response = await request(app.getHttpServer()).get(`/ideas/${id}`).set(...bearer(token)).expect(200);

    expect(response.body.businessModel).toBe("ECOMMERCE");
    expect(response.body.hypotheses).toHaveLength(4);
  });

  it("GET /ideas/:id without Authorization returns 401", async () => {
    const { id } = await createIdea(app);

    await request(app.getHttpServer()).get(`/ideas/${id}`).expect(401);
  });

  it("GET /ideas/:id with the token of another idea returns 404", async () => {
    const first = await createIdea(app);
    const second = await createIdea(app);

    await request(app.getHttpServer()).get(`/ideas/${first.id}`).set(...bearer(second.token)).expect(404);
  });

  it("GET /ideas/:id returns 404 for an idea created without access token", async () => {
    const legacy = await prisma.idea.create({
      data: { businessModel: "SERVICE", rawDescription: "Idee d'avant la Phase 6b.", currency: "XOF" },
    });

    await request(app.getHttpServer()).get(`/ideas/${legacy.id}`).set(...bearer("jeton-quelconque")).expect(404);
  });

  it("GET /ideas/:id returns paid: false for a new idea", async () => {
    const { id, token } = await createIdea(app);

    const response = await request(app.getHttpServer()).get(`/ideas/${id}`).set(...bearer(token)).expect(200);

    expect(response.body.paid).toBe(false);
  });

  it("PUT /ideas/:id updates the same idea and returns the new preview result", async () => {
    const { id, token } = await createIdea(app);
    const payload = validPayload();
    payload.hypotheses.price = 6000;

    const response = await request(app.getHttpServer()).put(`/ideas/${id}`).set(...bearer(token)).send(payload).expect(200);

    expect(response.body.ideaId).toBe(id);
    expect(response.body.result.revenue).toBe(300000);
  });

  it("PUT /ideas/:id without Authorization returns 401", async () => {
    const { id } = await createIdea(app);

    await request(app.getHttpServer()).put(`/ideas/${id}`).send(validPayload()).expect(401);
  });

  it("PUT /ideas/:id returns 404 for an unknown id", async () => {
    await request(app.getHttpServer())
      .put("/ideas/does-not-exist")
      .set(...bearer("jeton-quelconque"))
      .send(validPayload())
      .expect(404);
  });

  it("PUT /ideas/:id rejects an invalid payload", async () => {
    const { id, token } = await createIdea(app);
    const payload = validPayload();
    payload.hypotheses.price = 0;

    await request(app.getHttpServer()).put(`/ideas/${id}`).set(...bearer(token)).send(payload).expect(400);
  });

  it("GET /ideas/:id returns 404 for an unknown id", async () => {
    await request(app.getHttpServer())
      .get("/ideas/does-not-exist")
      .set(...bearer("jeton-quelconque"))
      .expect(404);
  });

  it("PATCH /ideas/:id/canvas-blocks persists the blocks and returns ok", async () => {
    const { id, token } = await createIdea(app);

    const canvasPayload = {
      blocks: [
        { key: "valueProposition", content: "Des sacs faits main." },
        { key: "customerSegments", content: "Jeunes actifs urbains." },
        { key: "channels", content: "Instagram." },
        { key: "customerRelationships", content: "WhatsApp." },
        { key: "keyResources", content: "Machine a coudre." },
        { key: "keyActivities", content: "Production." },
        { key: "keyPartners", content: "Fournisseur de tissu." },
      ],
      source: "utilisateur_edite",
    };

    const response = await request(app.getHttpServer())
      .patch(`/ideas/${id}/canvas-blocks`)
      .set(...bearer(token))
      .send(canvasPayload)
      .expect(200);

    expect(response.body).toEqual({ ok: true });
  });

  it("PATCH /ideas/:id/canvas-blocks without Authorization returns 401", async () => {
    const { id } = await createIdea(app);

    await request(app.getHttpServer())
      .patch(`/ideas/${id}/canvas-blocks`)
      .send({ blocks: [], source: "utilisateur_edite" })
      .expect(401);
  });

  it("PATCH /ideas/:id/canvas-blocks returns 404 for an unknown idea", async () => {
    const canvasPayload = {
      blocks: [
        { key: "valueProposition", content: "x" },
        { key: "customerSegments", content: "x" },
        { key: "channels", content: "x" },
        { key: "customerRelationships", content: "x" },
        { key: "keyResources", content: "x" },
        { key: "keyActivities", content: "x" },
        { key: "keyPartners", content: "x" },
      ],
      source: "utilisateur_edite",
    };

    await request(app.getHttpServer())
      .patch("/ideas/does-not-exist/canvas-blocks")
      .set(...bearer("jeton-quelconque"))
      .send(canvasPayload)
      .expect(404);
  });

  it("PATCH /ideas/:id/canvas-blocks rejects an invalid payload", async () => {
    const { id, token } = await createIdea(app);

    await request(app.getHttpServer())
      .patch(`/ideas/${id}/canvas-blocks`)
      .set(...bearer(token))
      .send({ blocks: [], source: "utilisateur_edite" })
      .expect(400);
  });
});
