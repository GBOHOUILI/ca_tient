"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { BUSINESS_MODELS, type BusinessModel } from "@/lib/business-models";

export function StepBusinessType({ onSelect }: { onSelect: (model: BusinessModel) => void }) {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
      <h1 className="text-h2-mobile font-semibold md:text-h2">{t.wizard.businessTypeTitle}</h1>
      <div className="grid w-full gap-3 sm:grid-cols-3">
        {BUSINESS_MODELS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            className="rounded-2xl border border-border bg-surface p-6 text-left text-h4 font-semibold transition-colors hover:border-accent-emerald"
          >
            {t.labels.businessModels[value]}
          </button>
        ))}
      </div>
    </div>
  );
}
