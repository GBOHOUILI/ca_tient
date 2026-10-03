import { getI18n } from "@/i18n/server";
import { CtaLink } from "./CtaLink";

export async function FinalCta({ price }: { price: number }) {
  const { t } = await getI18n();
  return (
    <section className="border-t border-border px-4 py-24 text-center sm:px-6">
      <h2 className="text-h2-mobile font-semibold md:text-h2">{t.landing.finalTitle}</h2>
      <p className="mx-auto mt-4 max-w-md text-body text-text-secondary">{t.landing.finalText}</p>
      <div className="mt-8">
        <CtaLink price={price} />
      </div>
    </section>
  );
}
