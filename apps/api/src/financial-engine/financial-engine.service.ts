import { Injectable } from "@nestjs/common";
import { assertValidHypotheses } from "./financial-engine.validation.js";
import type { BreakEvenResult, FinancialResult, Hypotheses } from "./financial-engine.types.js";

type BreakEvenInput = Pick<Hypotheses, "currency" | "price" | "variableCostPerUnit" | "fixedCosts">;

@Injectable()
export class FinancialEngineService {
  computeResult(hypotheses: Hypotheses): FinancialResult {
    assertValidHypotheses(hypotheses);

    const revenue = hypotheses.price * hypotheses.volume;
    const variableCosts = hypotheses.variableCostPerUnit * hypotheses.volume;
    const grossMargin = revenue - variableCosts;
    const estimatedResult = grossMargin - hypotheses.fixedCosts;

    return { currency: hypotheses.currency, revenue, grossMargin, estimatedResult };
  }

  computeBreakEven(input: BreakEvenInput): BreakEvenResult {
    assertValidHypotheses({ ...input, volume: 0 });

    const unitMargin = input.price - input.variableCostPerUnit;
    if (unitMargin <= 0) {
      return { reachable: false, reason: "non_positive_unit_margin" };
    }

    return { reachable: true, volumeUnits: Math.ceil(input.fixedCosts / unitMargin) };
  }
}
