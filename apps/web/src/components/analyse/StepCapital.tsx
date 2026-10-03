"use client";

import { useMemo, useState } from "react";
import { computeCapitalNeed, type CurrencyCode } from "financial-engine";
import type { CapitalPlanInput } from "@/lib/api/report";
import { formatAmount } from "@/lib/format";
import { MoneyInput } from "@/components/ui/MoneyInput";

const EMPTY_PLAN: CapitalPlanInput = { equipment: 0, initialStock: 0, openingCosts: 0, other: 0, availableCapital: 0 };

const FIELDS: { key: keyof CapitalPlanInput; label: string }[] = [
  { key: "equipment", label: "Combien pour le matériel ou l'équipement ?" },
  { key: "initialStock", label: "Combien pour ton stock de départ ?" },
  { key: "openingCosts", label: "Combien pour ouvrir (local, démarches, site) ?" },
  { key: "other", label: "Autres dépenses de départ ?" },
  { key: "availableCapital", label: "Combien as-tu déjà de côté pour ce projet ?" },
];

export function StepCapital({
  currency,
  fixedCosts,
  initialPlan,
  saving,
  error,
  onSubmit,
  onBack,
}: {
  currency: CurrencyCode;
  fixedCosts: number;
  initialPlan: CapitalPlanInput | null;
  saving: boolean;
  error: string | null;
  onSubmit: (plan: CapitalPlanInput) => void;
  onBack: () => void;
}) {
  const [plan, setPlan] = useState<CapitalPlanInput>(initialPlan ?? EMPTY_PLAN);

  // Same engine function as the server; price/volume do not take part in the capital need.
  const need = useMemo(() => {
    try {
      return computeCapitalNeed({ currency, price: 1, volume: 0, variableCostPerUnit: 0, fixedCosts }, plan);
    } catch {
      return null;
    }
  }, [currency, fixedCosts, plan]);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div className="text-center">
        <h1 className="text-h2-mobile font-semibold md:text-h2">Ton capital</h1>
        <p className="mt-2 text-body text-text-secondary">
          Ce qu&apos;il te faut pour te lancer, et ce que tu as déjà.
        </p>
      </div>
      {FIELDS.map((field) => (
        <label key={field.key} className="flex flex-col gap-2 text-small text-text-secondary">
          {field.label}
          <MoneyInput
            value={plan[field.key]}
            currency={currency}
            onChange={(value) => setPlan((current) => ({ ...current, [field.key]: value }))}
          />
        </label>
      ))}
      {need ? (
        <dl className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-6 text-body">
          <div className="flex justify-between gap-4">
            <dt className="text-text-secondary">Dépenses de départ</dt>
            <dd className="tabular-nums">{formatAmount(need.startupCosts, currency)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-text-secondary">Réserve (3 mois de charges)</dt>
            <dd className="tabular-nums">{formatAmount(need.cashReserve, currency)}</dd>
          </div>
          <div className="flex justify-between gap-4 font-semibold">
            <dt>Capital nécessaire</dt>
            <dd className="tabular-nums">{formatAmount(need.capitalNeeded, currency)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-text-secondary">Capital disponible</dt>
            <dd className="tabular-nums">{formatAmount(need.availableCapital, currency)}</dd>
          </div>
          {need.financingGap > 0 ? (
            <p className="mt-2 font-semibold text-error">Il te manque {formatAmount(need.financingGap, currency)}</p>
          ) : (
            <p className="mt-2 font-semibold text-accent-emerald">Tu as {formatAmount(need.surplus, currency)} de marge</p>
          )}
        </dl>
      ) : (
        <p className="text-small text-error">Indique des montants entiers et positifs.</p>
      )}
      {error ? <p className="text-small text-error">{error}</p> : null}
      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="text-body font-medium text-text-secondary">
          Retour
        </button>
        <button
          type="button"
          onClick={() => onSubmit(plan)}
          disabled={saving || need === null}
          className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-6 py-3 text-body font-semibold text-white disabled:opacity-40"
        >
          {saving ? "Enregistrement..." : "Voir mon rapport"}
        </button>
      </div>
    </div>
  );
}
