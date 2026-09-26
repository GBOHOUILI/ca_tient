import { describe, expect, it } from "vitest";
import { createPaymentGateway } from "./payment-gateway.factory.js";

describe("createPaymentGateway", () => {
  it("uses the test gateway by default", () => {
    expect(createPaymentGateway({}).name).toBe("test");
  });

  it("refuses the test gateway in production", () => {
    expect(() => createPaymentGateway({ NODE_ENV: "production" })).toThrow(/production/);
    expect(() => createPaymentGateway({ NODE_ENV: "production", PAYMENT_PROVIDER: "test" })).toThrow(/production/);
  });

  it("builds the FedaPay gateway when its keys are present", () => {
    const gateway = createPaymentGateway({
      PAYMENT_PROVIDER: "fedapay",
      FEDAPAY_SECRET_KEY: "sk",
      FEDAPAY_WEBHOOK_SECRET: "wh",
    });

    expect(gateway.name).toBe("fedapay");
  });

  it("refuses FedaPay without its secret key or webhook secret", () => {
    expect(() => createPaymentGateway({ PAYMENT_PROVIDER: "fedapay", FEDAPAY_WEBHOOK_SECRET: "wh" })).toThrow(/FEDAPAY_SECRET_KEY/);
    expect(() => createPaymentGateway({ PAYMENT_PROVIDER: "fedapay", FEDAPAY_SECRET_KEY: "sk" })).toThrow(/FEDAPAY_WEBHOOK_SECRET/);
  });

  it("refuses an unknown provider", () => {
    expect(() => createPaymentGateway({ PAYMENT_PROVIDER: "paypal" })).toThrow(/paypal/);
  });
});
