import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateIdeaDto } from "./create-idea.dto.js";

function validPayload() {
  return {
    businessModel: "ECOMMERCE",
    rawDescription: "Vente de vêtements en ligne pour jeunes actifs.",
    currency: "XOF",
    hypotheses: { price: 5000, volume: 50, variableCostPerUnit: 2000, fixedCosts: 100000 },
  };
}

describe("CreateIdeaDto", () => {
  it("accepts a valid payload", async () => {
    const dto = plainToInstance(CreateIdeaDto, validPayload());
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it("rejects an unsupported currency", async () => {
    const dto = plainToInstance(CreateIdeaDto, { ...validPayload(), currency: "JPY" });
    const errors = await validate(dto);

    expect(errors.some((e) => e.property === "currency")).toBe(true);
  });

  it("rejects an unknown business model", async () => {
    const dto = plainToInstance(CreateIdeaDto, { ...validPayload(), businessModel: "SAAS" });
    const errors = await validate(dto);

    expect(errors.some((e) => e.property === "businessModel")).toBe(true);
  });

  it("rejects an empty description", async () => {
    const dto = plainToInstance(CreateIdeaDto, { ...validPayload(), rawDescription: "" });
    const errors = await validate(dto);

    expect(errors.some((e) => e.property === "rawDescription")).toBe(true);
  });

  it("rejects a negative price in the nested hypotheses", async () => {
    const payload = validPayload();
    payload.hypotheses.price = -1;
    const dto = plainToInstance(CreateIdeaDto, payload);
    const errors = await validate(dto);

    const hypothesesError = errors.find((e) => e.property === "hypotheses");
    expect(hypothesesError?.children?.some((c) => c.property === "price")).toBe(true);
  });
});
