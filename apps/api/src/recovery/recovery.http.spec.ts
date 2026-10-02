import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AI_PROVIDER, type AiProvider } from "../ai/ai-provider.port.js";
import { IdeasModule } from "../ideas/ideas.module.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { RecoveryModule } from "./recovery.module.js";

const ai = { suggestHypotheses: vi.fn(), suggestCanvasBlocks: vi.fn(), writeReportSummary: vi.fn() } satisfies AiProvider;

describe("Recovery code", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // A fresh app per test: the throttler counts every POST /recovery, and the tests together
  // exceed the 5-per-minute limit that only the last test is about.
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [IdeasModule, RecoveryModule] })
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
    await app.close();
  });

  const server = () => app.getHttpServer();
  const bearer = (token: string): [string, string] => ["Authorization", `Bearer ${token}`];

  async function createIdea(paid: boolean): Promise<{ id: string; token: string }> {
    const response = await request(server())
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
    return { id, token: response.body.accessToken as string };
  }

  async function issue(id: string, token: string): Promise<string> {
    const response = await request(server()).post(`/ideas/${id}/recovery-code`).set(...bearer(token)).expect(201);
    return response.body.code as string;
  }

  it("requires the access token and a paid idea to issue a code", async () => {
    const unpaid = await createIdea(false);
    await request(server()).post(`/ideas/${unpaid.id}/recovery-code`).expect(401);
    await request(server()).post(`/ideas/${unpaid.id}/recovery-code`).set(...bearer(unpaid.token)).expect(403);
  });

  it("issues a readable code that opens the idea with a new token, keeping the original one valid", async () => {
    const { id, token } = await createIdea(true);
    const code = await issue(id, token);
    expect(code).toMatch(/^CT-[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}$/);

    const redeemed = await request(server()).post("/recovery").send({ code }).expect(200);
    expect(redeemed.body.ideaId).toBe(id);
    expect(redeemed.body.accessToken).not.toBe(token);

    await request(server()).get(`/ideas/${id}`).set(...bearer(redeemed.body.accessToken)).expect(200);
    await request(server()).get(`/ideas/${id}`).set(...bearer(token)).expect(200);
    expect(await prisma.idea.findUnique({ where: { id }, select: { recoveryCodeHash: true } })).not.toMatchObject({
      recoveryCodeHash: code,
    });
  });

  it("accepts a code typed in lower case with spaces", async () => {
    const { id, token } = await createIdea(true);
    const code = await issue(id, token);
    const typed = code.toLowerCase().replace(/-/g, " ");

    const redeemed = await request(server()).post("/recovery").send({ code: typed }).expect(200);
    expect(redeemed.body.ideaId).toBe(id);
  });

  it("invalidates the previous code when a new one is issued", async () => {
    const { id, token } = await createIdea(true);
    const first = await issue(id, token);
    const second = await issue(id, token);

    await request(server()).post("/recovery").send({ code: first }).expect(404);
    await request(server()).post("/recovery").send({ code: second }).expect(200);
  });

  it("answers 404 for an unknown code or an idea that is no longer paid", async () => {
    const { id, token } = await createIdea(true);
    const code = await issue(id, token);
    await request(server()).post("/recovery").send({ code: "CT-00000-00000" }).expect(404);

    await prisma.idea.update({ where: { id }, data: { paidAt: null } });
    await request(server()).post("/recovery").send({ code }).expect(404);
  });

  it("rejects a malformed body", async () => {
    await request(server()).post("/recovery").send({}).expect(400);
  });

  it("limits redemption attempts to 5 per minute", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      statuses.push((await request(server()).post("/recovery").send({ code: "CT-00000-00001" })).status);
    }
    expect(statuses.slice(0, 5).every((status) => status !== 429)).toBe(true);
    expect(statuses[5]).toBe(429);
  });
});
