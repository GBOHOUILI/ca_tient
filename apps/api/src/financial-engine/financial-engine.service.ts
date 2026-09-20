import { Injectable } from "@nestjs/common";
import { computeResult, computeBreakEven } from "financial-engine";
import type { BreakEvenInput, BreakEvenResult, FinancialResult, Hypotheses } from "financial-engine";

@Injectable()
export class FinancialEngineService {
  computeResult(hypotheses: Hypotheses): FinancialResult {
    return computeResult(hypotheses);
  }

  computeBreakEven(input: BreakEvenInput): BreakEvenResult {
    return computeBreakEven(input);
  }
}
