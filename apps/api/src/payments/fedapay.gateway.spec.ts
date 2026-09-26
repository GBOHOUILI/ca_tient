import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  extractFedaPayTransactionId,
  FedaPayGateway,
  mapFedaPayStatus,
  unwrapFedaPayTransaction,
} from "./fedapay.gateway.js";
import { PaymentGatewayError } from "./payment-gateway.port.js";

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function gateway(environment: "sandbox" | "live" = "sandbox") {
  return new FedaPayGateway({ secretKey: "sk_sandbox_test", environment });
}

const REQUEST = {
  ideaId: "idea1",
  paymentId: "pay1",
  amount: 1000,
  currency: "XOF",
  description: "Analyse complete Ca tient ?",
  returnUrl: "http://localhost:3000/analyse/idea1",
};

describe("FedaPayGateway", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates a transaction then a payment token and returns the hosted page url", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ "v1/transaction": { id: 987, status: "pending" } }))
      .mockResolvedValueOnce(jsonResponse({ token: "tok", url: "https://process.fedapay.com/tok" }));

    const session = await gateway().createCheckout(REQUEST);

    expect(session).toEqual({ providerTransactionId: "987", redirectUrl: "https://process.fedapay.com/tok", initialStatus: "pending" });
    const [createUrl, createInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(createUrl).toBe("https://sandbox-api.fedapay.com/v1/transactions");
    expect(createInit.method).toBe("POST");
    expect((createInit.headers as Record<string, string>).Authorization).toBe("Bearer sk_sandbox_test");
    expect(JSON.parse(createInit.body as string)).toEqual({
      description: "Analyse complete Ca tient ?",
      amount: 1000,
      currency: { iso: "XOF" },
      callback_url: "http://localhost:3000/analyse/idea1",
    });
    const [tokenUrl, tokenInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(tokenUrl).toBe("https://sandbox-api.fedapay.com/v1/transactions/987/token");
    expect(tokenInit.method).toBe("POST");
  });

  it("uses the live base url in live mode", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 1, status: "approved" }));

    await gateway("live").fetchStatus("1");

    expect(fetchMock.mock.calls[0][0]).toBe("https://api.fedapay.com/v1/transactions/1");
  });

  it("reads the status of a wrapped or unwrapped transaction", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ "v1/transaction": { id: 5, status: "approved" } }))
      .mockResolvedValueOnce(jsonResponse({ id: 5, status: "declined" }));

    expect(await gateway().fetchStatus("5")).toBe("approved");
    expect(await gateway().fetchStatus("5")).toBe("declined");
  });

  it("throws PaymentGatewayError on an HTTP error", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "Unauthorized" }, 401));

    await expect(gateway().fetchStatus("5")).rejects.toBeInstanceOf(PaymentGatewayError);
  });

  it("throws PaymentGatewayError when the token response has no url", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ id: 3, status: "pending" }))
      .mockResolvedValueOnce(jsonResponse({ token: "tok" }));

    await expect(gateway().createCheckout(REQUEST)).rejects.toBeInstanceOf(PaymentGatewayError);
  });
});

describe("FedaPay payload helpers", () => {
  it.each([
    ["approved", "approved"],
    ["transferred", "approved"],
    ["refunded", "approved"],
    ["declined", "declined"],
    ["canceled", "canceled"],
    ["cancelled", "canceled"],
    ["pending", "pending"],
    ["something-new", "pending"],
    [undefined, "pending"],
  ])("maps %s to %s", (input, expected) => {
    expect(mapFedaPayStatus(input)).toBe(expected);
  });

  it("unwraps a transaction whether or not it is enveloped", () => {
    expect(unwrapFedaPayTransaction({ "v1/transaction": { id: 1 } })).toEqual({ id: 1 });
    expect(unwrapFedaPayTransaction({ id: 2 })).toEqual({ id: 2 });
    expect(unwrapFedaPayTransaction(null)).toBeUndefined();
  });

  it("extracts the transaction id from a webhook event", () => {
    expect(extractFedaPayTransactionId({ name: "transaction.approved", entity: { id: 12345 } })).toBe("12345");
    expect(extractFedaPayTransactionId({ name: "transaction.approved", entity: { id: "abc" } })).toBe("abc");
    expect(extractFedaPayTransactionId({ name: "transaction.approved" })).toBeUndefined();
    expect(extractFedaPayTransactionId("pas un objet")).toBeUndefined();
  });
});
