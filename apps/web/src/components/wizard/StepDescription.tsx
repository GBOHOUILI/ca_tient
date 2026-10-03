"use client";

import { useI18n } from "@/i18n/I18nProvider";

// Mirrors the API limit (CreateIdeaDto.rawDescription @MaxLength(2000)).
const MAX_DESCRIPTION_LENGTH = 2000;

export function StepDescription({
  value,
  onChange,
  onNext,
  onBack,
  loading,
}: {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
  loading: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-center text-h2-mobile font-semibold md:text-h2">{t.wizard.descriptionTitle}</h1>
      <p className="text-center text-body text-text-secondary">
        {t.wizard.descriptionIntro}
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        maxLength={MAX_DESCRIPTION_LENGTH}
        placeholder={t.wizard.descriptionPlaceholder}
        className="rounded-lg border border-border bg-surface p-4 text-body text-text-primary focus:border-accent-emerald focus:outline-none"
      />
      <p className="-mt-4 flex justify-between gap-4 text-micro text-text-secondary">
        <span>{t.wizard.descriptionAi}</span>
        <span className="shrink-0 tabular-nums">
          {value.length} / {MAX_DESCRIPTION_LENGTH}
        </span>
      </p>
      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="text-body font-medium text-text-secondary">
          {t.common.back}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={value.trim().length === 0 || loading}
          className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-6 py-3 text-body font-semibold text-white disabled:opacity-40"
        >
          {loading ? t.wizard.analysing : t.common.continue}
        </button>
      </div>
    </div>
  );
}
