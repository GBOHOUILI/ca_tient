"use client";

import type { CanvasBlockKey, CanvasBlocks } from "@/lib/api/ideas";
import { AutoGrowTextarea } from "@/components/ui/AutoGrowTextarea";
import { useI18n } from "@/i18n/I18nProvider";

const FIELDS: CanvasBlockKey[] = [
  "valueProposition",
  "customerSegments",
  "channels",
  "customerRelationships",
  "keyResources",
  "keyActivities",
  "keyPartners",
];

export function StepCanvas({
  canvasBlocks,
  wasSuggested,
  onBlockChange,
  onNext,
  onBack,
  submitting,
  error,
}: {
  canvasBlocks: CanvasBlocks;
  wasSuggested: boolean;
  onBlockChange: (key: CanvasBlockKey, value: string) => void;
  onNext: () => void;
  onBack: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const { t } = useI18n();
  // The API rejects empty blocks: the paid report (Phase 6b) needs a complete canvas.
  const allFilled = FIELDS.every((field) => canvasBlocks[field].trim().length > 0);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <h1 className="text-center text-h2-mobile font-semibold md:text-h2">{t.wizard.canvasTitle}</h1>
      {wasSuggested ? (
        <p className="text-center text-small text-accent-emerald">
          {t.wizard.suggested}
        </p>
      ) : null}
      {FIELDS.map((field) => (
        <label key={field} className="flex flex-col gap-2 text-small text-text-secondary">
          {t.wizard.canvasFields[field].label}
          <AutoGrowTextarea
            value={canvasBlocks[field]}
            onChange={(e) => onBlockChange(field, e.target.value)}
            placeholder={t.wizard.canvasFields[field].placeholder}
            maxLength={500}
            rows={2}
            className="rounded-lg border border-border bg-surface p-3 text-body text-text-primary focus:border-accent-emerald focus:outline-none"
          />
        </label>
      ))}
      {error ? <p className="text-small text-error">{error}</p> : null}
      {!allFilled ? (
        <p className="text-center text-small text-text-secondary">{t.wizard.canvasIncomplete}</p>
      ) : null}
      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="text-body font-medium text-text-secondary">
          {t.common.back}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={submitting || !allFilled}
          className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-6 py-3 text-body font-semibold text-white disabled:opacity-40"
        >
          {submitting ? t.common.saving : t.common.continue}
        </button>
      </div>
    </div>
  );
}
