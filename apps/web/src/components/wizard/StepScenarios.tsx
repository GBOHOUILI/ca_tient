"use client";

import { useMemo } from "react";
import { applyDelta, applyScenario, computeResult, type Hypotheses, type CurrencyCode } from "financial-engine";
import type { HypothesesInput } from "@/lib/api/ideas";
import { formatAmount } from "@/lib/format";
import type { WhatIfDeltas } from "./wizard-reducer";
import { SCENARIO_OPTIONS } from "@/lib/scenarios";
import { ScenarioComparisonChart, type ScenarioBar } from "./charts/ScenarioComparisonChart";


export function StepScenarios({
  hypotheses,
  currency,
  whatIfDeltas,
  onBack,
  onNext,
}: {
  hypotheses: HypothesesInput;
  currency: CurrencyCode;
  whatIfDeltas: WhatIfDeltas;
  onBack: () => void;
  onNext?: () => void;
}) {
  const { bars, error } = useMemo(() => {
    const base: Hypotheses = { currency, ...hypotheses };
    try {
      const fixedBars: ScenarioBar[] = SCENARIO_OPTIONS.map(({ key, label }) => ({
        label,
        estimatedResult: computeResult(applyScenario(base, key)).estimatedResult,
      }));
      const customBar: ScenarioBar = {
        label: "Personnalisé",
        estimatedResult: computeResult(applyDelta(base, whatIfDeltas)).estimatedResult,
      };
      return { bars: [...fixedBars, customBar], error: null as string | null };
    } catch {
      return { bars: null, error: "Impossible de calculer les scénarios avec ces réglages." };
    }
  }, [currency, hypotheses, whatIfDeltas]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <h1 className="text-center text-h2-mobile font-semibold md:text-h2">Tes scénarios</h1>
      <p className="text-center text-body text-text-secondary">
        Comment ton idée tient dans différentes situations, y compris tes propres réglages.
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
      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="text-body font-medium text-text-secondary">
          Retour
        </button>
        {onNext ? (
          <button
            type="button"
            onClick={onNext}
            className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-6 py-3 text-body font-semibold text-white"
          >
            Continuer
          </button>
        ) : null}
      </div>
    </div>
  );
}
