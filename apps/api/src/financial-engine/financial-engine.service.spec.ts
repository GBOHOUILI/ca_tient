import { Test } from "@nestjs/testing";
import { FinancialEngineService } from "./financial-engine.service.js";
import type { Hypotheses } from "financial-engine";

function hypotheses(overrides: Partial<Hypotheses> = {}): Hypotheses {
  return {
    currency: "XOF",
    price: 5000,
    variableCostPerUnit: 2000,
    fixedCosts: 100000,
    volume: 50,
    ...overrides,
  };
}

describe("FinancialEngineService", () => {
  let service: FinancialEngineService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [FinancialEngineService],
    }).compile();
    service = module.get(FinancialEngineService);
  });

  it("delegates computeResult to the financial-engine package", () => {
    expect(service.computeResult(hypotheses())).toEqual({
      currency: "XOF",
      revenue: 250000,
      grossMargin: 150000,
      estimatedResult: 50000,
    });
  });

  it("delegates computeBreakEven to the financial-engine package", () => {
    expect(service.computeBreakEven(hypotheses())).toEqual({ reachable: true, volumeUnits: 34 });
  });

  it("delegates computeAnnualProjection to the financial-engine package", () => {
    const projection = service.computeAnnualProjection(hypotheses(), "stable");

    expect(projection).toHaveLength(12);
    expect(projection[0]?.result).toEqual({
      currency: "XOF",
      revenue: 250000,
      grossMargin: 150000,
      estimatedResult: 50000,
    });
  });
});
