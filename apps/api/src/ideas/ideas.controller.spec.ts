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

  it("GET /ideas/:id returns the persisted idea", async () => {
    const created = await request(app.getHttpServer()).post("/ideas").send(validPayload()).expect(201);

    const response = await request(app.getHttpServer()).get(`/ideas/${created.body.ideaId}`).expect(200);

    expect(response.body.businessModel).toBe("ECOMMERCE");
    expect(response.body.hypotheses).toHaveLength(4);
  });

  it("GET /ideas/:id returns 404 for an unknown id", async () => {
    await request(app.getHttpServer()).get("/ideas/does-not-exist").expect(404);
  });
});
