"use client";

import { useMemo } from "react";
import { applyDelta, computeAnnualProjection, computeBreakEven, type Hypotheses, type SeasonalityProfileKey } from "financial-engine";
import type { CurrencyCode, HypothesesInput } from "@/lib/ideas-api";
import type { WhatIfDeltas } from "./wizard-reducer";
import { BreakEvenChart } from "./charts/BreakEvenChart";
import { MonthlyRevenueChart } from "./charts/MonthlyRevenueChart";

const SEASONALITY_OPTIONS: { value: SeasonalityProfileKey; label: string }[] = [
  { value: "stable", label: "Stable toute l'annee" },
  { value: "fetes_fin_annee", label: "Pic en fin d'annee (fetes)" },
  { value: "ete", label: "Pic en ete" },
  { value: "rentree_scolaire", label: "Pic a la rentree scolaire" },
];

const SLIDER_CONFIG: { key: keyof WhatIfDeltas; label: string; min: number; max: number }[] = [
  { key: "price", label: "Prix de vente", min: -50, max: 100 },
  { key: "volume", label: "Volume de ventes", min: -100, max: 200 },
  { key: "variableCostPerUnit", label: "Cout variable par unite", min: -100, max: 200 },
  { key: "fixedCosts", label: "Couts fixes", min: -100, max: 200 },
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
  onBack: () => void;
}) {
  const { adjusted, breakEvenVolume, error } = useMemo(() => {
    const base: Hypotheses = { currency, ...hypotheses };
    try {
      const adjusted = applyDelta(base, whatIfDeltas);
      const breakEven = computeBreakEven(adjusted);
      return {
        adjusted,
        breakEvenVolume: breakEven.reachable ? breakEven.volumeUnits : null,
        error: null as string | null,
      };
    } catch {
      return {
        adjusted: null,
        breakEvenVolume: null,
        error: "Ces reglages donnent des valeurs impossibles (prix ou couts a zero). Ajuste un curseur.",
      };
    }
  }, [currency, hypotheses, whatIfDeltas]);

  const projection = useMemo(() => {
    if (!adjusted || seasonalityProfile === "stable") return null;
    return computeAnnualProjection(adjusted, seasonalityProfile);
  }, [adjusted, seasonalityProfile]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <h1 className="text-center text-h2-mobile font-semibold md:text-h2">Et si... ?</h1>
      <p className="text-center text-body text-text-secondary">
        Bouge les curseurs pour voir l&apos;impact sur ta rentabilite, en temps reel.
      </p>

      <div className="grid gap-4">
        {SLIDER_CONFIG.map((field) => (
          <label key={field.key} className="flex flex-col gap-2 text-small text-text-secondary">
            <span className="flex justify-between">
              <span>{field.label}</span>
              <span className="tabular-nums text-text-primary">
                {whatIfDeltas[field.key] > 0 ? "+" : ""}
                {whatIfDeltas[field.key]}%
              </span>
            </span>
            <input
              type="range"
              min={field.min}
              max={field.max}
              value={whatIfDeltas[field.key]}
              onChange={(e) => onDeltaChange(field.key, Number(e.target.value))}
            />
          </label>
        ))}
      </div>

      <label className="flex flex-col gap-2 text-small text-text-secondary">
        Saisonnalite
        <select
          value={seasonalityProfile}
          onChange={(e) => onSeasonalityChange(e.target.value as SeasonalityProfileKey)}
          className="rounded-lg border border-border bg-surface p-3 text-body text-text-primary"
        >
          {SEASONALITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {error ? (
        <p className="text-small text-error">{error}</p>
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
            </div>
            {projection && (
              <div className="rounded-2xl border border-border bg-surface p-4">
                <MonthlyRevenueChart projection={projection} currency={currency} />
              </div>
            )}
          </>
        )
      )}

      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="text-body font-medium text-text-secondary">
          Retour
        </button>
        <button
          type="button"
          onClick={onNext}
          className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-6 py-3 text-body font-semibold text-white"
        >
          Voir les scenarios
        </button>
      </div>
    </div>
  );
}
