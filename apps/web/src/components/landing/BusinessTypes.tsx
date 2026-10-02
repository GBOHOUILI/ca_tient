import { BUSINESS_MODEL_OPTIONS } from "@/lib/business-models";

export function BusinessTypes() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <p className="text-center text-small font-medium tracking-micro text-text-secondary">
        Quel que soit ton projet
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {BUSINESS_MODEL_OPTIONS.map((option) => (
          <span key={option.value} className="rounded-lg border border-border bg-surface px-4 py-2 text-small text-text-primary">
            {option.label}
          </span>
        ))}
      </div>
    </section>
  );
}
