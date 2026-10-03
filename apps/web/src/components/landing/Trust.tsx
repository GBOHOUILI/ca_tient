import { getI18n } from "@/i18n/server";

export async function Trust() {
  const { t } = await getI18n();
  return (
    <section className="border-t border-border px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-h2-mobile font-semibold md:text-h2">{t.landing.trustTitle}</h2>
        <dl className="mt-12 grid gap-8 md:grid-cols-2">
          {t.landing.trust.map((fact) => (
            <div key={fact.title} className="rounded-2xl border border-border bg-surface p-6">
              <dt className="text-h4 font-semibold">{fact.title}</dt>
              <dd className="mt-2 text-body text-text-secondary">{fact.detail}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
