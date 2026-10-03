import { getI18n } from "@/i18n/server";
import { priceLabel } from "@/lib/price";

export async function HowItWorks({ price }: { price: number }) {
  const { t, locale } = await getI18n();
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <h2 className="text-center text-h2-mobile font-semibold md:text-h2">{t.landing.howTitle}</h2>
      <ol className="mt-12 grid gap-6 md:grid-cols-3">
        {t.landing.howSteps(priceLabel(price, locale)).map((step, index) => (
          <li key={step.title} className="rounded-2xl border border-border bg-surface p-6">
            <span className="text-small font-semibold tabular-nums text-accent-emerald">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-3 text-h4 font-semibold">{step.title}</h3>
            <p className="mt-2 text-body text-text-secondary">{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
