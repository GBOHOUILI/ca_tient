import { Injectable } from "@nestjs/common";
import { computeResult, computeBreakEven, computeAnnualProjection } from "financial-engine";
import type {
  BreakEvenInput,
  BreakEvenResult,
  FinancialResult,
  Hypotheses,
  MonthlyResult,
  SeasonalityProfileKey,
} from "financial-engine";

@Injectable()
export class FinancialEngineService {
  computeResult(hypotheses: Hypotheses): FinancialResult {
    return computeResult(hypotheses);
  }

  computeBreakEven(input: BreakEvenInput): BreakEvenResult {
    return computeBreakEven(input);
  }

  computeAnnualProjection(hypotheses: Hypotheses, profile: SeasonalityProfileKey): MonthlyResult[] {
    return computeAnnualProjection(hypotheses, profile);
  }
}
