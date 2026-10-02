import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaService } from "../prisma/prisma.service.js";
import { AdminModule } from "./admin.module.js";

const KEY = "admin_test_key";
const DAY_MS = 24 * 60 * 60 * 1000;
const ROUTES = ["overview", "market", "conversion", "revenue", "ideas", "contacts.csv"];

describe("Admin dashboard API", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const previousKey = process.env.ADMIN_KEY;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AdminModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
    prisma = moduleRef.get(PrismaService);
  });

  beforeEach(() => {
    process.env.ADMIN_KEY = KEY;
  });

  afterEach(async () => {
    await prisma.analyticsEvent.deleteMany();
    await prisma.idea.deleteMany();
    process.env.ADMIN_KEY = previousKey;
  });

  afterAll(async () => {
    await app.close();
  });

  const get = (path: string) => request(app.getHttpServer()).get(path).set("x-admin-key", KEY);

  async function seedIdea(options: {
    businessModel?: "SERVICE" | "ECOMMERCE";
    price?: number;
    volume?: number;
    paid?: boolean;
    country?: string;
    heardFrom?: "whatsapp" | "facebook";
    contact?: string;
    consent?: boolean;
    createdAt?: Date;
    description?: string;
    utmSource?: string;
  }) {
    const idea = await prisma.idea.create({
      data: {
        businessModel: options.businessModel ?? "SERVICE",
        rawDescription: options.description ?? "Cours de soutien scolaire.",
        currency: "XOF",
        createdAt: options.createdAt,
        paidAt: options.paid ? new Date() : null,
        utmSource: options.utmSource,
        hypotheses: {
          create: [
            { key: "price", label: "Prix", value: options.price ?? 5000, source: "utilisateur_saisi" },
            { key: "volume", label: "Volume", value: options.volume ?? 50, source: "utilisateur_saisi" },
            { key: "variableCostPerUnit", label: "Cout", value: 2000, source: "utilisateur_saisi" },
            { key: "fixedCosts", label: "Charges", value: 100000, source: "utilisateur_saisi" },
          ],
        },
        profile:
          options.country || options.heardFrom || options.contact
            ? {
                create: {
                  country: options.country,
                  heardFrom: options.heardFrom,
                  contact: options.contact,
                  contactConsent: options.consent ?? false,
                  consentAt: options.consent ? new Date() : null,
                },
              }
            : undefined,
      },
    });
    if (options.paid) {
      await prisma.payment.create({
        data: { ideaId: idea.id, provider: "test", amount: 1000, currency: "XOF", status: "approved", confirmedAt: new Date() },
      });
    }
    return idea;
  }

  it("hides every route without ADMIN_KEY and refuses a wrong key", async () => {
    for (const route of ROUTES) {
      await request(app.getHttpServer()).get(`/admin/${route}`).set("x-admin-key", "wrong").expect(401);
    }
    delete process.env.ADMIN_KEY;
    for (const route of ROUTES) {
      await request(app.getHttpServer()).get(`/admin/${route}`).set("x-admin-key", KEY).expect(404);
    }
  });

  it("returns zeros on an empty dataset", async () => {
    const overview = await get("/admin/overview?period=all").expect(200);
    expect(overview.body.kpis).toMatchObject({ ideas: 0, paidIdeas: 0, revenue: 0, previewToPaidRate: null, holdsShare: null });
    const market = await get("/admin/market").expect(200);
    expect(market.body.total).toBe(0);
    await get("/admin/conversion").expect(200);
    await get("/admin/revenue").expect(200);
    const ideas = await get("/admin/ideas").expect(200);
    expect(ideas.body).toMatchObject({ total: 0, items: [] });
  });

  it("computes the overview, market, conversion and revenue", async () => {
    await seedIdea({ paid: true, country: "BJ", heardFrom: "whatsapp", utmSource: "facebook" });
    await seedIdea({ volume: 10, country: "BJ", heardFrom: "whatsapp" });
    await seedIdea({ businessModel: "ECOMMERCE", country: "TG" });
    await seedIdea({ createdAt: new Date(Date.now() - 60 * DAY_MS) });
    await prisma.analyticsEvent.create({ data: { type: "landing_view", sessionId: "s-1" } });

    const overview = await get("/admin/overview?period=30d").expect(200);
    expect(overview.body.kpis).toMatchObject({ visits: 1, ideas: 3, paidIdeas: 1, revenue: 1000 });
    expect(overview.body.kpis.previewToPaidRate).toBeCloseTo(1 / 3);
    expect(overview.body.kpis.holdsShare).toBeCloseTo(2 / 3);
    expect(overview.body.daily.length).toBeGreaterThanOrEqual(30);

    const market = await get("/admin/market?period=30d").expect(200);
    expect(market.body.byBusinessModel).toEqual([
      { key: "SERVICE", count: 2 },
      { key: "ECOMMERCE", count: 1 },
    ]);
    expect(market.body.byCountry[0]).toEqual({ key: "BJ", count: 2 });

    const conversion = await get("/admin/conversion?period=30d").expect(200);
    expect(conversion.body.byHeardFrom[0]).toEqual({ key: "whatsapp", ideas: 2, paid: 1, rate: 0.5 });
    expect(conversion.body.byUtmSource.find((row: { key: string }) => row.key === "facebook")).toMatchObject({ paid: 1 });
    expect(conversion.body.funnel.steps).toHaveLength(8);

    const revenue = await get("/admin/revenue?period=30d").expect(200);
    expect(revenue.body).toMatchObject({ total: 1000, approved: 1 });

    const all = await get("/admin/overview?period=all").expect(200);
    expect(all.body.kpis.ideas).toBe(4);
  });

  it("filters by business model and country", async () => {
    await seedIdea({ country: "BJ" });
    await seedIdea({ businessModel: "ECOMMERCE", country: "TG" });

    const byModel = await get("/admin/overview?businessModel=ECOMMERCE").expect(200);
    expect(byModel.body.kpis.ideas).toBe(1);
    const byCountry = await get("/admin/overview?country=BJ").expect(200);
    expect(byCountry.body.kpis.ideas).toBe(1);
    await get("/admin/overview?country=XX").expect(400);
    await get("/admin/overview?period=1y").expect(400);
  });

  it("lists ideas with pagination, search and the paid filter", async () => {
    for (let i = 0; i < 22; i += 1) await seedIdea({ description: `Idee numero ${i}` });
    await seedIdea({ description: "Boutique de PAGNES 100%", paid: true });

    const first = await get("/admin/ideas").expect(200);
    expect(first.body).toMatchObject({ total: 23, page: 1, pageSize: 20 });
    expect(first.body.items).toHaveLength(20);
    const second = await get("/admin/ideas?page=2").expect(200);
    expect(second.body.items).toHaveLength(3);

    const search = await get("/admin/ideas?search=pagnes").expect(200);
    expect(search.body.total).toBe(1);
    const percent = await get(`/admin/ideas?search=${encodeURIComponent("100%")}`).expect(200);
    expect(percent.body.total).toBe(1);
    const paid = await get("/admin/ideas?paid=true").expect(200);
    expect(paid.body.items[0]).toMatchObject({ paid: true, holds: true });
  });

  it("shows an idea in detail with engine results, and hides a contact given without consent", async () => {
    const idea = await seedIdea({ paid: true, country: "BJ", contact: "awa@example.com", consent: true });
    const detail = await get(`/admin/ideas/${idea.id}`).expect(200);
    expect(detail.body.result).toEqual({ currency: "XOF", revenue: 250000, grossMargin: 150000, estimatedResult: 50000 });
    expect(detail.body.profile).toMatchObject({ country: "BJ", contact: "awa@example.com" });
    expect(detail.body.payments).toHaveLength(1);

    const legacy = await seedIdea({ contact: "secret@example.com", consent: false });
    const hidden = await get(`/admin/ideas/${legacy.id}`).expect(200);
    expect(hidden.body.profile.contact).toBeNull();

    await get("/admin/ideas/unknown-id").expect(404);
  });

  it("exports only consenting contacts as a safe CSV", async () => {
    await seedIdea({ country: "BJ", contact: "awa@example.com", consent: true });
    await seedIdea({ contact: "=HYPERLINK(\"x\")", consent: true });
    await seedIdea({ contact: "secret@example.com", consent: false });

    const response = await get("/admin/contacts.csv").expect(200);
    expect(response.headers["content-type"]).toContain("text/csv");
    expect(response.headers["content-disposition"]).toContain("attachment");
    expect(response.text.startsWith("﻿")).toBe(true);
    expect(response.text).toContain("awa@example.com");
    expect(response.text).not.toContain("secret@example.com");
    expect(response.text).toContain(`"'=HYPERLINK(""x"")"`);
    expect(response.text.trim().split("\n")).toHaveLength(3);
  });
});
