import { getI18n } from "@/i18n/server";
import { priceLabel } from "@/lib/price";

export async function Faq({ price }: { price: number }) {
  const { t, locale } = await getI18n();
  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-24 sm:px-6">
      <h2 className="text-center text-h2-mobile font-semibold md:text-h2">{t.landing.faqTitle}</h2>
      <dl className="mt-12 flex flex-col gap-6">
        {t.faq(priceLabel(price, locale)).map((faq) => (
          <div key={faq.question} className="border-b border-border pb-6">
            <dt className="text-h4 font-semibold">{faq.question}</dt>
            <dd className="mt-2 text-body text-text-secondary">{faq.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
