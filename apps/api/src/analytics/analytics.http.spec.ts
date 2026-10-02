import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PrismaService } from "../prisma/prisma.service.js";
import { AnalyticsModule } from "./analytics.module.js";

const ADMIN_KEY = "admin_test_key";
const DAY_MS = 24 * 60 * 60 * 1000;

describe("Analytics", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const previousKey = process.env.ADMIN_KEY;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AnalyticsModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
    prisma = moduleRef.get(PrismaService);
  });

  afterEach(async () => {
    await prisma.analyticsEvent.deleteMany();
    await prisma.idea.deleteMany();
    process.env.ADMIN_KEY = previousKey;
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer();

  it("records a valid event", async () => {
    await request(server()).post("/analytics/events").send({ type: "landing_view", sessionId: "session-1234" }).expect(204);
    await request(server())
      .post("/analytics/events")
      .send({ type: "offer_viewed", sessionId: "session-1234", ideaId: "cmabc123" })
      .expect(204);

    expect(await prisma.analyticsEvent.count()).toBe(2);
  });

  it("rejects unknown types and malformed ids", async () => {
    await request(server()).post("/analytics/events").send({ type: "payment_confirmed", sessionId: "session-1234" }).expect(400);
    await request(server()).post("/analytics/events").send({ type: "landing_view", sessionId: "x" }).expect(400);
    await request(server()).post("/analytics/events").send({ type: "landing_view", sessionId: "<script>alert</script>" }).expect(400);
    await request(server())
      .post("/analytics/events")
      .send({ type: "landing_view", sessionId: "session-1234", ideaId: "not an id!" })
      .expect(400);
  });

  it("hides the stats when ADMIN_KEY is not configured", async () => {
    delete process.env.ADMIN_KEY;
    await request(server()).get("/admin/stats").set("x-admin-key", "anything").expect(404);
  });

  it("refuses a wrong admin key", async () => {
    process.env.ADMIN_KEY = ADMIN_KEY;
    await request(server()).get("/admin/stats").expect(401);
    await request(server()).get("/admin/stats").set("x-admin-key", "wrong").expect(401);
  });

  it("accepts the key with stray whitespace from a copy-paste", async () => {
    process.env.ADMIN_KEY = `${ADMIN_KEY}\n`;
    await request(server()).get("/admin/stats").set("x-admin-key", ` ${ADMIN_KEY} `).expect(200);
  });

  it("returns zeros on an empty database", async () => {
    process.env.ADMIN_KEY = ADMIN_KEY;
    const { body } = await request(server()).get("/admin/stats?period=all").set("x-admin-key", ADMIN_KEY).expect(200);
    expect(body.steps.every((step: { count: number }) => step.count === 0)).toBe(true);
    expect(body.from).toBeNull();
  });

  it("counts distinct sessions and ideas, payments from the database, within the period", async () => {
    process.env.ADMIN_KEY = ADMIN_KEY;
    const old = new Date(Date.now() - 40 * DAY_MS);
    const idea = (createdAt?: Date) =>
      prisma.idea.create({ data: { businessModel: "SERVICE", rawDescription: "x", currency: "XOF", ...(createdAt ? { createdAt } : {}) } });
    const ideaA = await idea();
    await idea();
    await idea(old);

    const event = (type: string, sessionId: string, ideaId?: string, createdAt?: Date) =>
      prisma.analyticsEvent.create({
        data: { type: type as never, sessionId, ideaId, ...(createdAt ? { createdAt } : {}) },
      });
    await event("landing_view", "s1");
    await event("landing_view", "s1");
    await event("landing_view", "s2");
    await event("landing_view", "s3", undefined, old);
    await event("test_started", "s1");
    await event("offer_viewed", "s1", ideaA.id);
    await event("offer_viewed", "s1", ideaA.id);
    await event("what_if_used", "s1", ideaA.id);
    await event("report_viewed", "s1", ideaA.id);
    await event("report_printed", "s1", ideaA.id);

    const payment = { ideaId: ideaA.id, provider: "test" as const, amount: 1000, currency: "XOF" };
    await prisma.payment.create({ data: payment });
    await prisma.payment.create({ data: payment });
    await prisma.idea.update({ where: { id: ideaA.id }, data: { paidAt: new Date() } });
    await prisma.ideaAccessToken.create({ data: { ideaId: ideaA.id, tokenHash: "hash-for-test" } });

    const recent = await request(server()).get("/admin/stats?period=30d").set("x-admin-key", ADMIN_KEY).expect(200);
    expect(Object.fromEntries(recent.body.steps.map((s: { key: string; count: number }) => [s.key, s.count]))).toEqual({
      landing_view: 2,
      test_started: 1,
      preview: 2,
      offer_viewed: 1,
      payment_initiated: 1,
      payment_confirmed: 1,
      what_if_used: 1,
      report_viewed: 1,
    });
    expect(recent.body.steps.map((s: { key: string }) => s.key)).toEqual([
      "landing_view",
      "test_started",
      "preview",
      "offer_viewed",
      "payment_initiated",
      "payment_confirmed",
      "what_if_used",
      "report_viewed",
    ]);
    expect(recent.body.reportPrinted).toBe(1);
    expect(recent.body.recoveries).toBe(1);
    expect(recent.body.period).toBe("30d");

    const all = await request(server()).get("/admin/stats?period=all").set("x-admin-key", ADMIN_KEY).expect(200);
    const allCounts = Object.fromEntries(all.body.steps.map((s: { key: string; count: number }) => [s.key, s.count]));
    expect(allCounts.landing_view).toBe(3);
    expect(allCounts.preview).toBe(3);
  });

  it("supports a 90-day period", async () => {
    process.env.ADMIN_KEY = ADMIN_KEY;
    const { body } = await request(server()).get("/admin/stats?period=90d").set("x-admin-key", ADMIN_KEY).expect(200);
    const days = (Date.now() - new Date(body.from).getTime()) / DAY_MS;
    expect(Math.round(days)).toBe(90);
  });

  it("rejects an unknown period", async () => {
    process.env.ADMIN_KEY = ADMIN_KEY;
    await request(server()).get("/admin/stats?period=1y").set("x-admin-key", ADMIN_KEY).expect(400);
  });
});
