import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { AdminModule } from "../admin/admin.module.js";
import { AI_PROVIDER, type AiProvider } from "../ai/ai-provider.port.js";
import { IdeasModule } from "../ideas/ideas.module.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { ReviewsModule } from "./reviews.module.js";

const ai = { suggestHypotheses: vi.fn(), suggestCanvasBlocks: vi.fn(), writeReportSummary: vi.fn() } satisfies AiProvider;
const KEY = "admin_test_key";
const REVIEW = { rating: 5, comment: "Ça m'a évité une erreur de prix.", displayName: "Awa, Cotonou", publishConsent: true };

describe("Reviews", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const previousKey = process.env.ADMIN_KEY;

  beforeAll(async () => {
    process.env.ADMIN_KEY = KEY;
    const moduleRef = await Test.createTestingModule({ imports: [IdeasModule, AdminModule, ReviewsModule] })
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
  });

  afterAll(async () => {
    process.env.ADMIN_KEY = previousKey;
    await app.close();
  });

  const server = () => app.getHttpServer();
  const admin = (method: "get" | "patch", path: string) => request(server())[method](path).set("x-admin-key", KEY);

  async function idea(paid = true): Promise<{ id: string; auth: [string, string] }> {
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
    if (paid) await prisma.idea.update({ where: { id }, data: { paidAt: new Date() } });
    return { id, auth: ["Authorization", `Bearer ${created.body.accessToken}`] };
  }

  it("lets a paying user leave a review, then edit it", async () => {
    const { id, auth } = await idea();
    await request(server()).get(`/ideas/${id}/review`).set(...auth).expect(200, {});

    await request(server()).put(`/ideas/${id}/review`).set(...auth).send(REVIEW).expect(200);
    await request(server()).put(`/ideas/${id}/review`).set(...auth).send({ ...REVIEW, rating: 4 }).expect(200);

    const { body } = await request(server()).get(`/ideas/${id}/review`).set(...auth).expect(200);
    expect(body).toMatchObject({ rating: 4, comment: REVIEW.comment, displayName: REVIEW.displayName, publishConsent: true });
    expect(await prisma.review.count({ where: { ideaId: id } })).toBe(1);
  });

  it("requires the access token and a paid idea", async () => {
    const unpaid = await idea(false);
    await request(server()).put(`/ideas/${unpaid.id}/review`).send(REVIEW).expect(401);
    await request(server()).put(`/ideas/${unpaid.id}/review`).set(...unpaid.auth).send(REVIEW).expect(403);
  });

  it("validates the review", async () => {
    const { id, auth } = await idea();
    const put = (body: object) => request(server()).put(`/ideas/${id}/review`).set(...auth).send(body);
    await put({ ...REVIEW, rating: 0 }).expect(400);
    await put({ ...REVIEW, rating: 6 }).expect(400);
    await put({ ...REVIEW, rating: 4.5 }).expect(400);
    await put({ ...REVIEW, comment: "x".repeat(501) }).expect(400);
    await put({ ...REVIEW, displayName: "x".repeat(41) }).expect(400);
  });

  it("shows nothing publicly until the admin publishes, and only reviews with consent", async () => {
    const withConsent = await idea();
    const withoutConsent = await idea();
    await request(server()).put(`/ideas/${withConsent.id}/review`).set(...withConsent.auth).send(REVIEW).expect(200);
    await request(server())
      .put(`/ideas/${withoutConsent.id}/review`)
      .set(...withoutConsent.auth)
      .send({ ...REVIEW, publishConsent: false, comment: "Privé." })
      .expect(200);

    expect((await request(server()).get("/reviews").expect(200)).body).toEqual({ count: 0, average: null, reviews: [] });

    const pending = await admin("get", "/admin/reviews").expect(200);
    expect(pending.body.map((r: { comment: string }) => r.comment).sort()).toEqual([REVIEW.comment, "Privé."].sort());
    const [consenting, refusing] = [
      pending.body.find((r: { comment: string }) => r.comment === REVIEW.comment),
      pending.body.find((r: { comment: string }) => r.comment === "Privé."),
    ];

    await admin("patch", `/admin/reviews/${refusing.id}`).send({ status: "published" }).expect(400);
    await admin("patch", `/admin/reviews/${consenting.id}`).send({ status: "published" }).expect(200);

    const shown = await request(server()).get("/reviews").expect(200);
    expect(shown.body).toEqual({
      count: 1,
      average: 5,
      reviews: [{ rating: 5, comment: REVIEW.comment, displayName: REVIEW.displayName, createdAt: expect.any(String) }],
    });
  });

  it("sends an edited review back to moderation", async () => {
    const { id, auth } = await idea();
    await request(server()).put(`/ideas/${id}/review`).set(...auth).send(REVIEW).expect(200);
    const [review] = (await admin("get", "/admin/reviews").expect(200)).body;
    await admin("patch", `/admin/reviews/${review.id}`).send({ status: "published" }).expect(200);

    await request(server()).put(`/ideas/${id}/review`).set(...auth).send({ ...REVIEW, comment: "Nouveau texte." }).expect(200);

    expect((await request(server()).get("/reviews").expect(200)).body.count).toBe(0);
  });

  it("protects moderation with the admin key", async () => {
    await request(server()).get("/admin/reviews").expect(401);
    await request(server()).patch("/admin/reviews/unknown").send({ status: "hidden" }).expect(401);
    await admin("patch", "/admin/reviews/unknown").send({ status: "hidden" }).expect(404);
    await admin("patch", "/admin/reviews/unknown").send({ status: "pending-ish" }).expect(400);
  });

  it("is deleted with the idea", async () => {
    const { id, auth } = await idea();
    await request(server()).put(`/ideas/${id}/review`).set(...auth).send(REVIEW).expect(200);
    await request(server()).delete(`/ideas/${id}`).set(...auth).expect(204);
    expect(await prisma.review.count()).toBe(0);
  });
});
