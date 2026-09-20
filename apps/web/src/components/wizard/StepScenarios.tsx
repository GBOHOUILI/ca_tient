"use client";

import { useMemo } from "react";
import { applyDelta, applyScenario, computeResult, type Hypotheses, type ScenarioKey } from "financial-engine";
import type { CurrencyCode, HypothesesInput } from "@/lib/ideas-api";
import { formatAmount } from "@/lib/format";
import type { WhatIfDeltas } from "./wizard-reducer";
import { ScenarioComparisonChart, type ScenarioBar } from "./charts/ScenarioComparisonChart";

const SCENARIO_LABELS: { key: ScenarioKey; label: string }[] = [
  { key: "prudent", label: "Prudent" },
  { key: "realiste", label: "Realiste" },
  { key: "ambitieux", label: "Ambitieux" },
  { key: "crise", label: "Crise" },
];

export function StepScenarios({
  hypotheses,
  currency,
  whatIfDeltas,
  onBack,
}: {
  hypotheses: HypothesesInput;
  currency: CurrencyCode;
  whatIfDeltas: WhatIfDeltas;
  onBack: () => void;
}) {
  const { bars, error } = useMemo(() => {
    const base: Hypotheses = { currency, ...hypotheses };
    try {
      const fixedBars: ScenarioBar[] = SCENARIO_LABELS.map(({ key, label }) => ({
        label,
        estimatedResult: computeResult(applyScenario(base, key)).estimatedResult,
      }));
      const customBar: ScenarioBar = {
        label: "Personnalise",
        estimatedResult: computeResult(applyDelta(base, whatIfDeltas)).estimatedResult,
      };
      return { bars: [...fixedBars, customBar], error: null as string | null };
    } catch {
      return { bars: null, error: "Impossible de calculer les scenarios avec ces reglages." };
    }
  }, [currency, hypotheses, whatIfDeltas]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <h1 className="text-center text-h2-mobile font-semibold md:text-h2">Tes scenarios</h1>
      <p className="text-center text-body text-text-secondary">
        Comment ton idee tient dans differentes situations, y compris tes propres reglages.
      </p>
      {error ? (
        <p className="text-small text-error">{error}</p>
      ) : (
        bars && (
          <div className="rounded-2xl border border-border bg-surface p-4">
            <ScenarioComparisonChart bars={bars} currency={currency} />
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-small text-text-secondary">
              {bars.map((bar) => (
                <span key={bar.label}>
                  {bar.label} :{" "}
                  <span className="tabular-nums text-text-primary">{formatAmount(bar.estimatedResult, currency)}</span>
                </span>
              ))}
            </p>
          </div>
        )
      )}
      <div className="flex justify-start">
        <button type="button" onClick={onBack} className="text-body font-medium text-text-secondary">
          Retour
        </button>
      </div>
    </div>
  );
}
