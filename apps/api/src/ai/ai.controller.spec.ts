import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { vi } from "vitest";
import { AiModule } from "./ai.module.js";
import { AI_PROVIDER, type AiProvider } from "./ai-provider.port.js";

function validPayload() {
  return {
    businessModel: "ECOMMERCE",
    rawDescription: "Vente de vêtements en ligne pour jeunes actifs.",
    currency: "XOF",
  };
}

describe("AiController (HTTP) — suggestion", () => {
  let app: INestApplication;
  const aiProvider: AiProvider = { suggestHypotheses: vi.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AiModule] })
      .overrideProvider(AI_PROVIDER)
      .useValue(aiProvider)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns available:true with the suggestion when the provider succeeds", async () => {
    vi.mocked(aiProvider.suggestHypotheses).mockResolvedValueOnce({
      price: 5000,
      volume: 50,
      variableCostPerUnit: 2000,
      fixedCosts: 100000,
    });

    const response = await request(app.getHttpServer())
      .post("/ideas/suggest-hypotheses")
      .send(validPayload())
      .expect(200);

    expect(response.body).toEqual({
      available: true,
      hypotheses: { price: 5000, volume: 50, variableCostPerUnit: 2000, fixedCosts: 100000 },
    });
  });

  it("returns available:false when the provider has no suggestion", async () => {
    vi.mocked(aiProvider.suggestHypotheses).mockResolvedValueOnce(null);

    const response = await request(app.getHttpServer())
      .post("/ideas/suggest-hypotheses")
      .send(validPayload())
      .expect(200);

    expect(response.body).toEqual({ available: false });
  });

  it("rejects an invalid payload", async () => {
    await request(app.getHttpServer())
      .post("/ideas/suggest-hypotheses")
      .send({ ...validPayload(), currency: "JPY" })
      .expect(400);
  });
});

describe("AiController (HTTP) — rate limiting", () => {
  let app: INestApplication;
  const aiProvider: AiProvider = { suggestHypotheses: vi.fn().mockResolvedValue(null) };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AiModule] })
      .overrideProvider(AI_PROVIDER)
      .useValue(aiProvider)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("allows 10 requests per minute then rejects the 11th with 429", async () => {
    for (let i = 0; i < 10; i++) {
      await request(app.getHttpServer()).post("/ideas/suggest-hypotheses").send(validPayload()).expect(200);
    }

    await request(app.getHttpServer()).post("/ideas/suggest-hypotheses").send(validPayload()).expect(429);
  });
});
