import { BUSINESS_MODEL_OPTIONS, type BusinessModel } from "@/lib/business-models";

export function StepBusinessType({ onSelect }: { onSelect: (model: BusinessModel) => void }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
      <h1 className="text-h2-mobile font-semibold md:text-h2">Quel type de business ?</h1>
      <div className="grid w-full gap-3 sm:grid-cols-2">
        {BUSINESS_MODEL_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className="rounded-2xl border border-border bg-surface p-6 text-left text-h4 font-semibold transition-colors hover:border-accent-emerald"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
