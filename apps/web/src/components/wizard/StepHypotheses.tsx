"use client";

import { SUPPORTED_CURRENCIES, type CurrencyCode } from "financial-engine";
import type { BusinessModel } from "@/lib/business-models";
import type { HypothesesInput } from "@/lib/api/ideas";
import { useI18n } from "@/i18n/I18nProvider";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { NumberInput } from "@/components/ui/NumberInput";

const FIELDS: (keyof HypothesesInput)[] = ["price", "volume", "variableCostPerUnit", "fixedCosts"];

export function StepHypotheses({
  businessModel,
  hypotheses,
  currency,
  wasSuggested,
  onHypothesisChange,
  onCurrencyChange,
  onSubmit,
  onBack,
  submitting,
  error,
}: {
  businessModel: BusinessModel;
  hypotheses: HypothesesInput;
  currency: CurrencyCode;
  wasSuggested: boolean;
  onHypothesisChange: (key: keyof HypothesesInput, value: number) => void;
  onCurrencyChange: (currency: CurrencyCode) => void;
  onSubmit: () => void;
  onBack: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const { t } = useI18n();
  // The verdict depends on the volume above all, and the AI can only guess it.
  const hints: Partial<Record<keyof HypothesesInput, string>> = {
    volume: t.wizard.volumeHint,
    fixedCosts: t.wizard.fixedCostsHint,
  };
  // The API requires a price of at least 1 (all other values may be 0).
  const hasPrice = hypotheses.price >= 1;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <h1 className="text-center text-h2-mobile font-semibold md:text-h2">{t.wizard.hypothesesTitle}</h1>
      {wasSuggested ? (
        <p className="text-center text-small text-accent-emerald">
          {t.wizard.suggested}
        </p>
      ) : null}
      <label className="flex flex-col gap-2 text-small text-text-secondary">
        {t.wizard.currency}
        <select
          value={currency}
          onChange={(e) => onCurrencyChange(e.target.value as CurrencyCode)}
          className="rounded-lg border border-border bg-surface p-3 text-body text-text-primary"
        >
          {SUPPORTED_CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </label>
      {FIELDS.map((field) => (
        <label key={field} className="flex flex-col gap-2 text-small text-text-secondary">
          {t.wizard.fields[field]}
          {field === "variableCostPerUnit" && (
            <span className="text-micro">
              {t.wizard.costHints[businessModel]} {t.wizard.lossesHint}
            </span>
          )}
          {hints[field] ? <span className="text-micro">{hints[field]}</span> : null}
          {field === "volume" ? (
            <NumberInput value={hypotheses.volume} onChange={(value) => onHypothesisChange("volume", value)} />
          ) : (
            <MoneyInput
              key={currency}
              value={hypotheses[field]}
              currency={currency}
              onChange={(value) => onHypothesisChange(field, value)}
            />
          )}
        </label>
      ))}
      {error ? <p className="text-small text-error">{error}</p> : null}
      {!hasPrice ? (
        <p className="text-center text-small text-text-secondary">{t.wizard.needPrice}</p>
      ) : null}
      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="text-body font-medium text-text-secondary">
          {t.common.back}
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !hasPrice}
          className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-6 py-3 text-body font-semibold text-white disabled:opacity-40"
        >
          {submitting ? t.wizard.calculating : t.common.seeResults}
        </button>
      </div>
    </div>
  );
}
