import { getI18n } from "@/i18n/server";
import { BUSINESS_MODELS } from "@/lib/business-models";

export async function BusinessTypes() {
  const { t } = await getI18n();
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <p className="text-center text-small font-medium tracking-micro text-text-secondary">{t.landing.businessTypes}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {BUSINESS_MODELS.map((value) => (
          <span key={value} className="rounded-lg border border-border bg-surface px-4 py-2 text-small text-text-primary">
            {t.labels.businessModels[value]}
          </span>
        ))}
      </div>
    </section>
  );
}
