"use client";

import { useMemo } from "react";
import {
  applyDelta,
  computeAnnualProjection,
  computeBreakEven,
  computeResult,
  type Hypotheses,
  type SeasonalityProfileKey,
} from "financial-engine";
import type { CurrencyCode } from "financial-engine";
import type { HypothesesInput } from "@/lib/api/ideas";
import { useI18n } from "@/i18n/I18nProvider";
import { formatAmount, numberLocale } from "@/lib/format";
import type { WhatIfDeltas } from "./wizard-reducer";
import { BreakEvenChart } from "./charts/BreakEvenChart";
import { MonthlyRevenueChart } from "./charts/MonthlyRevenueChart";

const SEASONALITY_PROFILES: SeasonalityProfileKey[] = ["stable", "fetes_fin_annee", "ete", "rentree_scolaire"];

const SLIDER_CONFIG: { key: keyof WhatIfDeltas; min: number; max: number }[] = [
  { key: "price", min: -50, max: 100 },
  { key: "volume", min: -100, max: 200 },
  { key: "variableCostPerUnit", min: -100, max: 200 },
  { key: "fixedCosts", min: -100, max: 200 },
];

export function StepEtSi({
  hypotheses,
  currency,
  whatIfDeltas,
  seasonalityProfile,
  onDeltaChange,
  onSeasonalityChange,
  onNext,
  onBack,
}: {
  hypotheses: HypothesesInput;
  currency: CurrencyCode;
  whatIfDeltas: WhatIfDeltas;
  seasonalityProfile: SeasonalityProfileKey;
  onDeltaChange: (key: keyof WhatIfDeltas, value: number) => void;
  onSeasonalityChange: (profile: SeasonalityProfileKey) => void;
  onNext: () => void;
  onBack?: () => void;
}) {
  const { t, locale } = useI18n();
  const amount = (value: number) => formatAmount(value, currency, locale);
  const { adjusted, breakEvenVolume, result, invalid } = useMemo(() => {
    const base: Hypotheses = { currency, ...hypotheses };
    try {
      const adjusted = applyDelta(base, whatIfDeltas);
      const breakEven = computeBreakEven(adjusted);
      return {
        adjusted,
        breakEvenVolume: breakEven.reachable ? breakEven.volumeUnits : null,
        result: computeResult(adjusted),
        invalid: false,
      };
    } catch {
      return {
        adjusted: null,
        breakEvenVolume: null,
        result: null,
        invalid: true,
      };
    }
  }, [currency, hypotheses, whatIfDeltas]);

  const projection = useMemo(() => {
    if (!adjusted || seasonalityProfile === "stable") return null;
    return computeAnnualProjection(adjusted, seasonalityProfile);
  }, [adjusted, seasonalityProfile]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <h1 className="text-center text-h2-mobile font-semibold md:text-h2">{t.analysis.whatIfTitle}</h1>
      <p className="text-center text-body text-text-secondary">
        {t.analysis.whatIfIntro}
      </p>

      <div className="grid gap-4">
        {SLIDER_CONFIG.map((field) => (
          <label key={field.key} className="flex flex-col gap-2 text-small text-text-secondary">
            <span className="flex justify-between">
              <span>{t.analysis.sliders[field.key]}</span>
              <span className="tabular-nums text-text-primary">
                {whatIfDeltas[field.key] > 0 ? "+" : ""}
                {whatIfDeltas[field.key]}%
              </span>
            </span>
            <input
              type="range"
              className="accent-accent-emerald"
              min={field.min}
              max={field.max}
              value={whatIfDeltas[field.key]}
              onChange={(e) => onDeltaChange(field.key, Number(e.target.value))}
            />
          </label>
        ))}
      </div>

      <label className="flex flex-col gap-2 text-small text-text-secondary">
        {t.analysis.seasonality}
        <select
          value={seasonalityProfile}
          onChange={(e) => onSeasonalityChange(e.target.value as SeasonalityProfileKey)}
          className="rounded-lg border border-border bg-surface p-3 text-body text-text-primary"
        >
          {SEASONALITY_PROFILES.map((value) => (
            <option key={value} value={value}>
              {t.analysis.seasonalityProfiles[value]}
            </option>
          ))}
        </select>
      </label>

      {invalid ? (
        <p className="text-small text-error">{t.analysis.impossibleSettings}</p>
      ) : (
        adjusted && (
          <>
            <div className="rounded-2xl border border-border bg-surface p-4">
              <BreakEvenChart
                price={adjusted.price}
                variableCostPerUnit={adjusted.variableCostPerUnit}
                fixedCosts={adjusted.fixedCosts}
                currentVolume={adjusted.volume}
                breakEvenVolume={breakEvenVolume}
                currency={currency}
              />
              <p className="mt-2 text-small text-text-secondary">
                {t.analysis.resultAtVolume}{" "}
                <span className="tabular-nums text-text-primary">{amount(result!.estimatedResult)}</span>.{" "}
                {breakEvenVolume !== null ? (
                  <>
                    {t.analysis.breakEvenAt}{" "}
                    <span className="tabular-nums text-text-primary">
                      {breakEvenVolume.toLocaleString(numberLocale(locale))}
                    </span>{" "}
                    {t.analysis.unitsPerMonth}
                  </>
                ) : (
                  t.analysis.breakEvenUnreachable
                )}
              </p>
            </div>
            {projection && (
              <div className="rounded-2xl border border-border bg-surface p-4">
                <MonthlyRevenueChart projection={projection} currency={currency} />
                <p className="mt-2 text-small text-text-secondary">
                  {t.analysis.revenueRange(
                    amount(Math.min(...projection.map((m) => m.result.revenue))),
                    amount(Math.max(...projection.map((m) => m.result.revenue))),
                  )}
                </p>
              </div>
            )}
          </>
        )
      )}

      <div className="flex justify-between">
        {onBack ? (
          <button type="button" onClick={onBack} className="text-body font-medium text-text-secondary">
            {t.common.back}
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onNext}
          className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-6 py-3 text-body font-semibold text-white"
        >
          {t.analysis.seeScenarios}
        </button>
      </div>
    </div>
  );
}
