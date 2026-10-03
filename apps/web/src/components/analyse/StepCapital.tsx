"use client";

import { useMemo, useState } from "react";
import { computeCapitalNeed, type CurrencyCode } from "financial-engine";
import type { CapitalPlanInput } from "@/lib/api/report";
import { formatAmount } from "@/lib/format";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { useI18n } from "@/i18n/I18nProvider";

const EMPTY_PLAN: CapitalPlanInput = { equipment: 0, initialStock: 0, openingCosts: 0, other: 0, availableCapital: 0 };

const FIELDS: (keyof CapitalPlanInput)[] = ["equipment", "initialStock", "openingCosts", "other", "availableCapital"];

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
  const { t, locale } = useI18n();
  const amount = (value: number) => formatAmount(value, currency, locale);
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
        <h1 className="text-h2-mobile font-semibold md:text-h2">{t.analysis.capitalTitle}</h1>
        <p className="mt-2 text-body text-text-secondary">
          {t.analysis.capitalIntro}
        </p>
      </div>
      {FIELDS.map((field) => (
        <label key={field} className="flex flex-col gap-2 text-small text-text-secondary">
          {t.analysis.capitalFields[field]}
          <MoneyInput
            value={plan[field]}
            currency={currency}
            onChange={(value) => setPlan((current) => ({ ...current, [field]: value }))}
          />
        </label>
      ))}
      {need ? (
        <dl className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-6 text-body">
          <div className="flex justify-between gap-4">
            <dt className="text-text-secondary">{t.analysis.startupCosts}</dt>
            <dd className="tabular-nums">{amount(need.startupCosts)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-text-secondary">{t.analysis.cashReserve}</dt>
            <dd className="tabular-nums">{amount(need.cashReserve)}</dd>
          </div>
          <div className="flex justify-between gap-4 font-semibold">
            <dt>{t.analysis.capitalNeeded}</dt>
            <dd className="tabular-nums">{amount(need.capitalNeeded)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-text-secondary">{t.analysis.availableCapital}</dt>
            <dd className="tabular-nums">{amount(need.availableCapital)}</dd>
          </div>
          {need.financingGap > 0 ? (
            <p className="mt-2 font-semibold text-error">{t.analysis.missing(amount(need.financingGap))}</p>
          ) : (
            <p className="mt-2 font-semibold text-accent-emerald">{t.analysis.surplus(amount(need.surplus))}</p>
          )}
        </dl>
      ) : (
        <p className="text-small text-error">{t.analysis.capitalInvalid}</p>
      )}
      {error ? <p className="text-small text-error">{error}</p> : null}
      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="text-body font-medium text-text-secondary">
          {t.common.back}
        </button>
        <button
          type="button"
          onClick={() => onSubmit(plan)}
          disabled={saving || need === null}
          className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-6 py-3 text-body font-semibold text-white disabled:opacity-40"
        >
          {saving ? t.common.saving : t.analysis.seeReport}
        </button>
      </div>
    </div>
  );
}
