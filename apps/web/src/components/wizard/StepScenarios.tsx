"use client";

import { useMemo } from "react";
import { applyDelta, applyScenario, computeResult, type Hypotheses, type CurrencyCode } from "financial-engine";
import type { HypothesesInput } from "@/lib/api/ideas";
import { useI18n } from "@/i18n/I18nProvider";
import { formatAmount } from "@/lib/format";
import type { WhatIfDeltas } from "./wizard-reducer";
import { SCENARIO_KEYS } from "@/lib/scenarios";
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
  const { t, locale } = useI18n();
  const { bars, failed } = useMemo(() => {
    const base: Hypotheses = { currency, ...hypotheses };
    try {
      const fixedBars: ScenarioBar[] = SCENARIO_KEYS.map((key) => ({
        label: t.analysis.scenarios[key],
        estimatedResult: computeResult(applyScenario(base, key)).estimatedResult,
      }));
      const customBar: ScenarioBar = {
        label: t.analysis.custom,
        estimatedResult: computeResult(applyDelta(base, whatIfDeltas)).estimatedResult,
      };
      return { bars: [...fixedBars, customBar], failed: false };
    } catch {
      return { bars: null, failed: true };
    }
  }, [currency, hypotheses, whatIfDeltas, t]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <h1 className="text-center text-h2-mobile font-semibold md:text-h2">{t.analysis.scenariosTitle}</h1>
      <p className="text-center text-body text-text-secondary">
        {t.analysis.scenariosIntro}
      </p>
      {failed ? (
        <p className="text-small text-error">{t.analysis.scenariosFailed}</p>
      ) : (
        bars && (
          <div className="rounded-2xl border border-border bg-surface p-4">
            <ScenarioComparisonChart bars={bars} currency={currency} />
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-small text-text-secondary">
              {bars.map((bar) => (
                <span key={bar.label}>
                  {bar.label} :{" "}
                  <span className="tabular-nums text-text-primary">{formatAmount(bar.estimatedResult, currency, locale)}</span>
                </span>
              ))}
            </p>
          </div>
        )
      )}
      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="text-body font-medium text-text-secondary">
          {t.common.back}
        </button>
        {onNext ? (
          <button
            type="button"
            onClick={onNext}
            className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-6 py-3 text-body font-semibold text-white"
          >
            {t.common.continue}
          </button>
        ) : null}
      </div>
    </div>
  );
}
