import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PrismaService } from "../prisma/prisma.service.js";
import { AnalyticsModule } from "./analytics.module.js";

const ADMIN_KEY = "admin_test_key";

function view(overrides: object = {}) {
  return {
    visitorId: "visitor-aaaa1111",
    sessionId: "session-aaaa1111",
    path: "/",
    locale: "fr",
    device: "mobile",
    timeZone: "Africa/Porto-Novo",
    ...overrides,
  };
}

describe("Traffic", () => {
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
    await prisma.pageView.deleteMany();
    process.env.ADMIN_KEY = previousKey;
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer();
  const send = (body: object) => request(server()).post("/analytics/pageviews").send(body);

  it("rejects malformed page views", async () => {
    await send(view({ path: "/Commencer" })).expect(400);
    await send(view({ path: "/../admin" })).expect(400);
    await send(view({ device: "watch" })).expect(400);
    await send(view({ locale: "de" })).expect(400);
    await send(view({ visitorId: "x" })).expect(400);
    expect(await prisma.pageView.count()).toBe(0);
  });

  it("stores only the normalized path, the estimated country and the source", async () => {
    await send(view({ path: "/en/analyse/cmus8gfhv00023x73r1rvhodo", referrerHost: "l.facebook.com" })).expect(204);
    await send(view({ timeZone: undefined, utmSource: "WhatsApp" })).expect(204);

    const rows = await prisma.pageView.findMany({ orderBy: { createdAt: "asc" } });
    expect(rows[0]).toMatchObject({ path: "/en/analyse/:id", country: "BJ", source: "facebook" });
    expect(rows[1]).toMatchObject({ path: "/", country: null, source: "whatsapp" });
  });

  it("aggregates traffic for the admin, behind the admin key", async () => {
    await send(view()).expect(204);
    await send(view({ path: "/commencer" })).expect(204);
    await send(view({ visitorId: "visitor-bbbb2222", sessionId: "session-bbbb2222", device: "desktop" })).expect(204);

    delete process.env.ADMIN_KEY;
    await request(server()).get("/admin/traffic").expect(404);

    process.env.ADMIN_KEY = ADMIN_KEY;
    await request(server()).get("/admin/traffic?period=1y").set("x-admin-key", ADMIN_KEY).expect(400);
    const response = await request(server()).get("/admin/traffic?period=7d").set("x-admin-key", ADMIN_KEY).expect(200);
    expect(response.body.kpis).toEqual({ visitors: 2, visits: 2, pageViews: 3, pagesPerVisit: 1.5, newVisitors: 2 });
    expect(response.body.pages[0]).toEqual({ key: "/", views: 2, visitors: 2 });
    expect(response.body.daily).toHaveLength(8);
    expect(response.body.countries).toEqual([{ key: "BJ", count: 2 }]);
  });

  it("applies the shared admin filters that make sense for traffic", async () => {
    process.env.ADMIN_KEY = ADMIN_KEY;
    await send(view()).expect(204);
    await send(view({ visitorId: "visitor-cccc3333", sessionId: "session-cccc3333", locale: "en", timeZone: "Europe/Paris" })).expect(204);

    const get = (query: string) => request(server()).get(`/admin/traffic?${query}`).set("x-admin-key", ADMIN_KEY).expect(200);
    expect((await get("locale=en")).body.kpis.visitors).toBe(1);
    expect((await get("country=FR")).body.kpis.visitors).toBe(1);
    expect((await get("businessModel=SERVICE")).body.kpis.visitors).toBe(2);
  });
});
