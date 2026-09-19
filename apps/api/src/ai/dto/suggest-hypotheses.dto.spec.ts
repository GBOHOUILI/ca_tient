import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { SuggestHypothesesDto } from "./suggest-hypotheses.dto.js";

function validPayload() {
  return {
    businessModel: "ECOMMERCE",
    rawDescription: "Vente de vêtements en ligne pour jeunes actifs.",
    currency: "XOF",
  };
}

describe("SuggestHypothesesDto", () => {
  it("accepts a valid payload", async () => {
    const dto = plainToInstance(SuggestHypothesesDto, validPayload());
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it("rejects an unsupported currency", async () => {
    const dto = plainToInstance(SuggestHypothesesDto, { ...validPayload(), currency: "JPY" });
    const errors = await validate(dto);

    expect(errors.some((e) => e.property === "currency")).toBe(true);
  });

  it("rejects an unknown business model", async () => {
    const dto = plainToInstance(SuggestHypothesesDto, { ...validPayload(), businessModel: "SAAS" });
    const errors = await validate(dto);

    expect(errors.some((e) => e.property === "businessModel")).toBe(true);
  });

  it("rejects an empty description", async () => {
    const dto = plainToInstance(SuggestHypothesesDto, { ...validPayload(), rawDescription: "" });
    const errors = await validate(dto);

    expect(errors.some((e) => e.property === "rawDescription")).toBe(true);
  });
});
