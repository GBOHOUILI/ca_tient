import { getI18n } from "@/i18n/server";

export async function Benefits() {
  const { t } = await getI18n();
  return (
    <section className="mx-auto max-w-5xl px-4 py-24 sm:px-6">
      <h2 className="text-center text-h2-mobile font-semibold md:text-h2">{t.landing.benefitsTitle}</h2>
      <dl className="mt-12 grid gap-8 md:grid-cols-2">
        {t.landing.benefits.map((benefit) => (
          <div key={benefit.title}>
            <dt className="text-h4 font-semibold">{benefit.title}</dt>
            <dd className="mt-2 text-body text-text-secondary">{benefit.detail}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
