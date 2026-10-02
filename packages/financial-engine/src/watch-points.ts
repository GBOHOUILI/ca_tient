import { computeBreakEven, computeResult } from "./financial-engine.calculations.js";
import { applyScenario } from "./scenarios.js";
import type { CapitalNeed } from "./capital.js";
import type { Hypotheses } from "./financial-engine.types.js";

export const THIN_MARGIN_PERCENT = 20;

export type WatchPointCode =
  | "non_positive_unit_margin"
  | "below_break_even"
  | "thin_gross_margin"
  | "prudent_scenario_loss"
  | "financing_gap"
  | "no_cash_reserve";

export function computeWatchPoints(hypotheses: Hypotheses, capitalNeed: CapitalNeed | null): WatchPointCode[] {
  const codes: WatchPointCode[] = [];
  const result = computeResult(hypotheses);
  const breakEven = computeBreakEven(hypotheses);

  if (!breakEven.reachable) {
    codes.push("non_positive_unit_margin");
  } else {
    if (hypotheses.volume < breakEven.volumeUnits) codes.push("below_break_even");
    // Integer comparison (no float): grossMargin / revenue < THIN_MARGIN_PERCENT %.
    if (result.revenue > 0 && result.grossMargin * 100 < result.revenue * THIN_MARGIN_PERCENT) {
      codes.push("thin_gross_margin");
    }
  }

  if (result.estimatedResult >= 0 && computeResult(applyScenario(hypotheses, "prudent")).estimatedResult < 0) {
    codes.push("prudent_scenario_loss");
  }

  if (capitalNeed) {
    if (capitalNeed.financingGap > 0) codes.push("financing_gap");
    if (capitalNeed.availableCapital < capitalNeed.startupCosts) codes.push("no_cash_reserve");
  }

  return codes;
}
