import { createHmac } from "node:crypto";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { PaymentStatus } from "@prisma/client";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { IdeasModule } from "../ideas/ideas.module.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { PAYMENT_GATEWAY, PaymentGatewayError, type PaymentGateway } from "./payment-gateway.port.js";
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
  failCheckout = false;
  readonly fetchStatus = vi.fn(async () => this.status);
  private counter = 0;

  async createCheckout() {
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

async function createIdea(app: INestApplication): Promise<{ id: string; auth: [string, string] }> {
  const response = await request(app.getHttpServer()).post("/ideas").send(ideaPayload()).expect(201);
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
    gateway.failCheckout = false;
    gateway.fetchStatus.mockClear();
  });

  afterEach(async () => {
    await prisma.idea.deleteMany();
  });

  afterAll(async () => {
    process.env.FEDAPAY_WEBHOOK_SECRET = previousSecret;
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

  it("cancels the payment and answers 503 when the checkout cannot be created", async () => {
    const { id, auth } = await createIdea(app);
    gateway.failCheckout = true;

    await request(app.getHttpServer()).post(`/ideas/${id}/payments`).set(...auth).expect(503);

    const status = await request(app.getHttpServer()).get(`/ideas/${id}/payment`).set(...auth).expect(200);
    expect(status.body).toEqual({ paid: false, status: "canceled" });
  });
});
