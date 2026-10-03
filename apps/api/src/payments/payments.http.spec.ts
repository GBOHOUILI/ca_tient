import { createHmac } from "node:crypto";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { PaymentStatus } from "@prisma/client";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { IdeasModule } from "../ideas/ideas.module.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { PAYMENT_GATEWAY, PaymentGatewayError, type CheckoutRequest, type PaymentGateway } from "./payment-gateway.port.js";
import { PaymentsModule } from "./payments.module.js";
import { TestPaymentGateway } from "./test-payment.gateway.js";

const WEBHOOK_SECRET = "wh_test_secret";

function ideaPayload() {
  return {
    businessModel: "ECOMMERCE",
    rawDescription: "Vente de sacs faits main en ligne.",
    currency: "XOF",
    hypotheses: { price: 5000, volume: 50, variableCostPerUnit: 2000, fixedCosts: 100000 },
  };
}

function signedHeader(body: string, secret = WEBHOOK_SECRET): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`, "utf8").digest("hex");
  return `t=${timestamp},s=${signature}`;
}

class FakeFedaPayGateway implements PaymentGateway {
  readonly name = "fedapay" as const;
  status: PaymentStatus = "pending";
  // Per-transaction override, for tests where different pending payments must resolve differently.
  statusByTransactionId: Record<string, PaymentStatus> = {};
  failCheckout = false;
  lastCheckout: CheckoutRequest | null = null;
  readonly fetchStatus = vi.fn(async (transactionId: string) => this.statusByTransactionId[transactionId] ?? this.status);
  private counter = 0;

  async createCheckout(request: CheckoutRequest) {
    this.lastCheckout = request;
    if (this.failCheckout) throw new PaymentGatewayError("fedapay: indisponible");
    this.counter += 1;
    return { providerTransactionId: `tx_${this.counter}`, redirectUrl: "https://process.fedapay.com/tok", initialStatus: "pending" as const };
  }
}

async function buildApp(gateway: PaymentGateway): Promise<{ app: INestApplication; prisma: PrismaService }> {
  const moduleRef = await Test.createTestingModule({ imports: [IdeasModule, PaymentsModule] })
    .overrideProvider(PAYMENT_GATEWAY)
    .useValue(gateway)
    .compile();
  const app = moduleRef.createNestApplication({ rawBody: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  await app.init();
  return { app, prisma: moduleRef.get(PrismaService) };
}

async function createIdea(app: INestApplication, extra: object = {}): Promise<{ id: string; auth: [string, string] }> {
  const response = await request(app.getHttpServer()).post("/ideas").send({ ...ideaPayload(), ...extra }).expect(201);
  return { id: response.body.ideaId, auth: ["Authorization", `Bearer ${response.body.accessToken}`] };
}

describe("Payments with the test gateway", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await buildApp(new TestPaymentGateway()));
  });

  afterEach(async () => {
    await prisma.idea.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it("requires the access token", async () => {
    const { id } = await createIdea(app);

    await request(app.getHttpServer()).post(`/ideas/${id}/payments`).expect(401);
    await request(app.getHttpServer()).get(`/ideas/${id}/payment`).expect(401);
  });

  it("approves at once, unlocks the idea and redirects to the analysis page", async () => {
    const { id, auth } = await createIdea(app);

    const started = await request(app.getHttpServer()).post(`/ideas/${id}/payments`).set(...auth).expect(201);

    const webAppUrl = (process.env.WEB_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
    expect(started.body.redirectUrl).toBe(`${webAppUrl}/analyse/${id}`);
    const status = await request(app.getHttpServer()).get(`/ideas/${id}/payment`).set(...auth).expect(200);
    expect(status.body).toEqual({ paid: true, status: "approved" });
    const idea = await request(app.getHttpServer()).get(`/ideas/${id}`).set(...auth).expect(200);
    expect(idea.body.paid).toBe(true);
  });

  it("refuses to charge an idea that is already paid", async () => {
    const { id, auth } = await createIdea(app);
    await request(app.getHttpServer()).post(`/ideas/${id}/payments`).set(...auth).expect(201);

    await request(app.getHttpServer()).post(`/ideas/${id}/payments`).set(...auth).expect(409);
  });

  it("reports no payment yet", async () => {
    const { id, auth } = await createIdea(app);

    const status = await request(app.getHttpServer()).get(`/ideas/${id}/payment`).set(...auth).expect(200);

    expect(status.body).toEqual({ paid: false, status: null });
  });
});

describe("Payments with FedaPay (fake gateway) and its webhook", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const gateway = new FakeFedaPayGateway();
  const previousSecret = process.env.FEDAPAY_WEBHOOK_SECRET;

  beforeAll(async () => {
    process.env.FEDAPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
    ({ app, prisma } = await buildApp(gateway));
  });

  beforeEach(() => {
    gateway.status = "pending";
    gateway.statusByTransactionId = {};
    gateway.failCheckout = false;
    gateway.lastCheckout = null;
    gateway.fetchStatus.mockClear();
  });

  afterEach(async () => {
    await prisma.idea.deleteMany();
  });

  afterAll(async () => {
    if (previousSecret === undefined) {
      delete process.env.FEDAPAY_WEBHOOK_SECRET;
    } else {
      process.env.FEDAPAY_WEBHOOK_SECRET = previousSecret;
    }
    await app.close();
  });

  async function startPending(): Promise<{ id: string; auth: [string, string]; transactionId: string }> {
    const { id, auth } = await createIdea(app);
    const started = await request(app.getHttpServer()).post(`/ideas/${id}/payments`).set(...auth).expect(201);
    expect(started.body.redirectUrl).toBe("https://process.fedapay.com/tok");
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: started.body.paymentId } });
    return { id, auth, transactionId: payment.providerTransactionId! };
  }

  function sendWebhook(transactionId: string, header?: string) {
    const body = JSON.stringify({ name: "transaction.approved", entity: { id: transactionId } });
    return request(app.getHttpServer())
      .post("/payments/webhook/fedapay")
      .set("Content-Type", "application/json")
      .set("X-FEDAPAY-SIGNATURE", header ?? signedHeader(body))
      .send(body);
  }

  describe("configurable price (ANALYSIS_PRICE_XOF)", () => {
    const previousPrice = process.env.ANALYSIS_PRICE_XOF;
    afterEach(() => {
      if (previousPrice === undefined) delete process.env.ANALYSIS_PRICE_XOF;
      else process.env.ANALYSIS_PRICE_XOF = previousPrice;
    });

    it("exposes the price publicly", async () => {
      process.env.ANALYSIS_PRICE_XOF = "2500";
      await request(app.getHttpServer()).get("/pricing").expect(200, { analysisPriceXof: 2500 });
    });

    it("charges the configured price at FedaPay and records it", async () => {
      process.env.ANALYSIS_PRICE_XOF = "2500";
      const { id, auth } = await createIdea(app);
      const started = await request(app.getHttpServer()).post(`/ideas/${id}/payments`).set(...auth).expect(201);

      expect(gateway.lastCheckout?.amount).toBe(2500);
      expect((await prisma.payment.findUniqueOrThrow({ where: { id: started.body.paymentId } })).amount).toBe(2500);
    });

    it("unlocks the analysis at once without FedaPay when the price is 0", async () => {
      process.env.ANALYSIS_PRICE_XOF = "0";
      const { id, auth } = await createIdea(app);

      const started = await request(app.getHttpServer()).post(`/ideas/${id}/payments`).set(...auth).expect(201);

      const webAppUrl = (process.env.WEB_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
      expect(started.body).toEqual({ paymentId: null, redirectUrl: `${webAppUrl}/analyse/${id}` });
      expect(gateway.lastCheckout).toBeNull();
      expect(await prisma.payment.count({ where: { ideaId: id } })).toBe(0);
      const status = await request(app.getHttpServer()).get(`/ideas/${id}/payment`).set(...auth).expect(200);
      expect(status.body).toEqual({ paid: true, status: "approved" });
    });
  });

  it("stays pending until FedaPay confirms, re-reading FedaPay on status polls", async () => {
    const { id, auth } = await startPending();

    const pending = await request(app.getHttpServer()).get(`/ideas/${id}/payment`).set(...auth).expect(200);
    expect(pending.body).toEqual({ paid: false, status: "pending" });

    gateway.status = "approved";
    const approved = await request(app.getHttpServer()).get(`/ideas/${id}/payment`).set(...auth).expect(200);
    expect(approved.body).toEqual({ paid: true, status: "approved" });
  });

  it("unlocks the idea on a signed webhook, after re-reading the transaction", async () => {
    const { id, transactionId } = await startPending();
    gateway.status = "approved";

    await sendWebhook(transactionId).expect(200);

    expect(gateway.fetchStatus).toHaveBeenCalledWith(transactionId);
    const idea = await prisma.idea.findUniqueOrThrow({ where: { id } });
    expect(idea.paidAt).not.toBeNull();
  });

  it("is idempotent when the same webhook arrives several times, even concurrently", async () => {
    const { id, transactionId } = await startPending();
    gateway.status = "approved";

    await sendWebhook(transactionId).expect(200);
    const first = await prisma.idea.findUniqueOrThrow({ where: { id }, include: { payments: true } });
    await Promise.all([sendWebhook(transactionId), sendWebhook(transactionId), sendWebhook(transactionId)]);
    const after = await prisma.idea.findUniqueOrThrow({ where: { id }, include: { payments: true } });

    expect(after.paidAt).toEqual(first.paidAt);
    expect(after.payments[0].confirmedAt).toEqual(first.payments[0].confirmedAt);
  });

  it("rejects a webhook with an invalid signature without touching anything", async () => {
    const { id, transactionId } = await startPending();
    gateway.status = "approved";

    await sendWebhook(transactionId, signedHeader("autre corps")).expect(400);

    expect(gateway.fetchStatus).not.toHaveBeenCalled();
    expect((await prisma.idea.findUniqueOrThrow({ where: { id } })).paidAt).toBeNull();
  });

  it("acknowledges a webhook for an unknown transaction without effect", async () => {
    await sendWebhook("tx_inconnue").expect(200);

    expect(gateway.fetchStatus).not.toHaveBeenCalled();
  });

  it("ignores a late decline after approval", async () => {
    const { id, transactionId } = await startPending();
    gateway.status = "approved";
    await sendWebhook(transactionId).expect(200);

    gateway.status = "declined";
    await sendWebhook(transactionId).expect(200);

    const idea = await prisma.idea.findUniqueOrThrow({ where: { id }, include: { payments: true } });
    expect(idea.paidAt).not.toBeNull();
    expect(idea.payments[0].status).toBe("approved");
  });

  it("unlocks the idea when a later webhook approves a payment declined earlier", async () => {
    const { id, transactionId } = await startPending();
    gateway.status = "declined";
    await sendWebhook(transactionId).expect(200);
    expect((await prisma.idea.findUniqueOrThrow({ where: { id } })).paidAt).toBeNull();

    gateway.status = "approved";
    await sendWebhook(transactionId).expect(200);

    const idea = await prisma.idea.findUniqueOrThrow({ where: { id }, include: { payments: true } });
    expect(idea.paidAt).not.toBeNull();
    expect(idea.payments[0].status).toBe("approved");
  });

  it("cancels the payment and answers 503 when the checkout cannot be created", async () => {
    const { id, auth } = await createIdea(app);
    gateway.failCheckout = true;

    await request(app.getHttpServer()).post(`/ideas/${id}/payments`).set(...auth).expect(503);

    const status = await request(app.getHttpServer()).get(`/ideas/${id}/payment`).set(...auth).expect(200);
    expect(status.body).toEqual({ paid: false, status: "canceled" });
  });

  it("rejects a webhook with no signature header at all", async () => {
    const body = JSON.stringify({ name: "transaction.approved", entity: { id: "tx_sans_signature" } });

    await request(app.getHttpServer())
      .post("/payments/webhook/fedapay")
      .set("Content-Type", "application/json")
      .send(body)
      .expect(400);
  });

  it("answers 404 when no webhook secret is configured", async () => {
    delete process.env.FEDAPAY_WEBHOOK_SECRET;
    try {
      await sendWebhook("tx_peu_importe").expect(404);
    } finally {
      process.env.FEDAPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
    }
  });
});

describe("Payments — re-reading pending payments before acting (double charge protection)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const gateway = new FakeFedaPayGateway();
  const previousSecret = process.env.FEDAPAY_WEBHOOK_SECRET;

  beforeAll(async () => {
    process.env.FEDAPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
    ({ app, prisma } = await buildApp(gateway));
  });

  beforeEach(() => {
    gateway.status = "pending";
    gateway.statusByTransactionId = {};
    gateway.failCheckout = false;
    gateway.fetchStatus.mockClear();
  });

  afterEach(async () => {
    await prisma.idea.deleteMany();
  });

  afterAll(async () => {
    if (previousSecret === undefined) {
      delete process.env.FEDAPAY_WEBHOOK_SECRET;
    } else {
      process.env.FEDAPAY_WEBHOOK_SECRET = previousSecret;
    }
    await app.close();
  });

  it("re-reads every pending payment (not just the latest) on a status poll", async () => {
    const { id, auth } = await createIdea(app);

    const first = await request(app.getHttpServer()).post(`/ideas/${id}/payments`).set(...auth).expect(201);
    const paymentA = await prisma.payment.findUniqueOrThrow({ where: { id: first.body.paymentId } });
    const txA = paymentA.providerTransactionId!;

    const second = await request(app.getHttpServer()).post(`/ideas/${id}/payments`).set(...auth).expect(201);
    const paymentB = await prisma.payment.findUniqueOrThrow({ where: { id: second.body.paymentId } });
    const txB = paymentB.providerTransactionId!;

    // Only the OLDER payment (A) is approved at FedaPay; the newer one (B) is still pending.
    // A getStatus that only re-read the latest payment would miss this and report unpaid.
    gateway.statusByTransactionId = { [txA]: "approved", [txB]: "pending" };

    const status = await request(app.getHttpServer()).get(`/ideas/${id}/payment`).set(...auth).expect(200);

    expect(status.body).toEqual({ paid: true, status: "approved" });
    expect((await prisma.idea.findUniqueOrThrow({ where: { id } })).paidAt).not.toBeNull();
  });

  it("refuses a second charge (409) and creates no new payment when a pending one is already approved at FedaPay", async () => {
    const { id, auth } = await createIdea(app);
    await request(app.getHttpServer()).post(`/ideas/${id}/payments`).set(...auth).expect(201);
    gateway.status = "approved";

    await request(app.getHttpServer()).post(`/ideas/${id}/payments`).set(...auth).expect(409);

    const payments = await prisma.payment.findMany({ where: { ideaId: id } });
    expect(payments).toHaveLength(1);
    expect(payments[0].status).toBe("approved");
  });

  it("answers 503 and creates no new payment when a pending payment cannot be re-read", async () => {
    const { id, auth } = await createIdea(app);
    await request(app.getHttpServer()).post(`/ideas/${id}/payments`).set(...auth).expect(201);
    gateway.fetchStatus.mockRejectedValueOnce(new PaymentGatewayError("fedapay: indisponible"));

    await request(app.getHttpServer()).post(`/ideas/${id}/payments`).set(...auth).expect(503);

    const payments = await prisma.payment.findMany({ where: { ideaId: id } });
    expect(payments).toHaveLength(1);
    expect(payments[0].status).toBe("pending");
  });
});

describe("POST /ideas/:id/payments — rate limiting", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await buildApp(new TestPaymentGateway()));
  });

  afterAll(async () => {
    await prisma.idea.deleteMany();
    await app.close();
  });

  it("allows 10 requests per minute then rejects the 11th with 429", async () => {
    // Each idea is its own throttle key candidate would be nice, but the guard keys on the
    // caller (IP) by default, same as AiController: create a fresh idea per attempt so the
    // 409 "already paid" rule never interferes with counting requests toward the limit.
    for (let i = 0; i < 10; i++) {
      const { id, auth } = await createIdea(app);
      await request(app.getHttpServer()).post(`/ideas/${id}/payments`).set(...auth).expect(201);
    }

    const { id, auth } = await createIdea(app);
    await request(app.getHttpServer()).post(`/ideas/${id}/payments`).set(...auth).expect(429);
  });
});

// Own app instance: the payment routes are rate limited per instance.
describe("Payment return page language", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const gateway = new FakeFedaPayGateway();
  const previousPrice = process.env.ANALYSIS_PRICE_XOF;

  beforeAll(async () => {
    ({ app, prisma } = await buildApp(gateway));
  });

  afterEach(async () => {
    await prisma.idea.deleteMany();
    if (previousPrice === undefined) delete process.env.ANALYSIS_PRICE_XOF;
    else process.env.ANALYSIS_PRICE_XOF = previousPrice;
  });

  afterAll(async () => {
    await app.close();
  });

  it("sends the person back to the analysis in the idea's language", async () => {
    process.env.ANALYSIS_PRICE_XOF = "1000";
    const { id, auth } = await createIdea(app, { locale: "en" });
    await request(app.getHttpServer()).post(`/ideas/${id}/payments`).set(...auth).expect(201);
    expect(gateway.lastCheckout?.returnUrl).toMatch(new RegExp(`/en/analyse/${id}$`));
  });

  it("does the same when the analysis is free", async () => {
    process.env.ANALYSIS_PRICE_XOF = "0";
    const { id, auth } = await createIdea(app, { locale: "en" });
    const started = await request(app.getHttpServer()).post(`/ideas/${id}/payments`).set(...auth).expect(201);
    expect(started.body.redirectUrl).toMatch(new RegExp(`/en/analyse/${id}$`));
  });
});
