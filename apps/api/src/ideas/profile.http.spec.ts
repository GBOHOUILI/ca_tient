import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { AI_PROVIDER, type AiProvider } from "../ai/ai-provider.port.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { IdeasModule } from "./ideas.module.js";

const ai = { suggestHypotheses: vi.fn(), suggestCanvasBlocks: vi.fn(), writeReportSummary: vi.fn() } satisfies AiProvider;

const IDEA = {
  businessModel: "SERVICE",
  rawDescription: "Cours de soutien scolaire a domicile.",
  currency: "XOF",
  hypotheses: { price: 5000, volume: 50, variableCostPerUnit: 2000, fixedCosts: 100000 },
};

describe("Profile and acquisition", () => {
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
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer();

  async function createIdea(extra: object = {}): Promise<{ id: string; auth: [string, string] }> {
    const response = await request(server()).post("/ideas").send({ ...IDEA, ...extra }).expect(201);
    return { id: response.body.ideaId, auth: ["Authorization", `Bearer ${response.body.accessToken}`] };
  }

  const putProfile = (id: string, auth: [string, string], body: object) =>
    request(server()).put(`/ideas/${id}/profile`).set(...auth).send(body);

  it("requires the access token", async () => {
    const { id } = await createIdea();
    await request(server()).put(`/ideas/${id}/profile`).send({}).expect(401);
  });

  it("accepts an empty profile", async () => {
    const { id, auth } = await createIdea();
    await putProfile(id, auth, {}).expect(200);
    expect(await prisma.ideaProfile.findUnique({ where: { ideaId: id } })).toMatchObject({ country: null, contact: null });
  });

  it("stores a full profile with consent", async () => {
    const { id, auth } = await createIdea();
    await putProfile(id, auth, {
      country: "BJ",
      city: "Cotonou",
      profile: "salarie",
      stage: "idee",
      heardFrom: "whatsapp",
      contact: "awa@example.com",
      contactConsent: true,
    }).expect(200);

    const stored = await prisma.ideaProfile.findUniqueOrThrow({ where: { ideaId: id } });
    expect(stored).toMatchObject({
      country: "BJ",
      city: "Cotonou",
      profile: "salarie",
      stage: "idee",
      heardFrom: "whatsapp",
      contact: "awa@example.com",
      contactConsent: true,
    });
    expect(stored.consentAt).toBeInstanceOf(Date);
  });

  it("accepts a phone number as contact", async () => {
    const { id, auth } = await createIdea();
    await putProfile(id, auth, { contact: "+229 97 00 00 00", contactConsent: true }).expect(200);
  });

  it("refuses a contact without consent", async () => {
    const { id, auth } = await createIdea();
    await putProfile(id, auth, { contact: "awa@example.com" }).expect(400);
    await putProfile(id, auth, { contact: "awa@example.com", contactConsent: false }).expect(400);
    expect(await prisma.ideaProfile.count()).toBe(0);
  });

  it("rejects values outside the lists and malformed contacts", async () => {
    const { id, auth } = await createIdea();
    await putProfile(id, auth, { country: "US" }).expect(400);
    await putProfile(id, auth, { profile: "retraite" }).expect(400);
    await putProfile(id, auth, { stage: "fini" }).expect(400);
    await putProfile(id, auth, { heardFrom: "radio" }).expect(400);
    await putProfile(id, auth, { city: "x".repeat(81) }).expect(400);
    await putProfile(id, auth, { contact: "pas un contact", contactConsent: true }).expect(400);
  });

  it("upserts without duplicates, and withdrawing consent erases the contact", async () => {
    const { id, auth } = await createIdea();
    await putProfile(id, auth, { country: "BJ", contact: "awa@example.com", contactConsent: true }).expect(200);
    await putProfile(id, auth, { country: "TG", contactConsent: false }).expect(200);

    expect(await prisma.ideaProfile.count({ where: { ideaId: id } })).toBe(1);
    expect(await prisma.ideaProfile.findUniqueOrThrow({ where: { ideaId: id } })).toMatchObject({
      country: "TG",
      contact: null,
      contactConsent: false,
      consentAt: null,
    });
  });

  it("stores the acquisition source given at creation", async () => {
    const { id } = await createIdea({
      acquisition: { utmSource: "facebook", utmMedium: "cpc", utmCampaign: "lancement", referrerHost: "l.facebook.com" },
    });
    expect(await prisma.idea.findUniqueOrThrow({ where: { id } })).toMatchObject({
      utmSource: "facebook",
      utmMedium: "cpc",
      utmCampaign: "lancement",
      referrerHost: "l.facebook.com",
    });
  });

  it("rejects a malformed referrer host", async () => {
    await request(server())
      .post("/ideas")
      .send({ ...IDEA, acquisition: { referrerHost: "https://evil.com/path" } })
      .expect(400);
  });
});
