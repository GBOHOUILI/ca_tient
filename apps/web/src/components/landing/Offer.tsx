import { getI18n } from "@/i18n/server";
import { priceLabel } from "@/lib/price";
import { CtaLink } from "./CtaLink";

function Column({
  title,
  price,
  items,
  highlight,
}: {
  title: string;
  price: string;
  items: readonly string[];
  highlight?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-4 rounded-2xl border bg-surface p-6 text-left ${highlight ? "border-accent-emerald" : "border-border"}`}>
      <div>
        <h3 className="text-h4 font-semibold">{title}</h3>
        <p className="mt-1 text-h3-mobile font-bold tabular-nums md:text-h3">{price}</p>
      </div>
      <ul className="flex flex-col gap-2 text-body text-text-secondary">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden className="text-accent-emerald">✓</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function Offer({ price }: { price: number }) {
  const { t, locale } = await getI18n();
  const label = priceLabel(price, locale);
  return (
    <section id="tarif" className="mx-auto max-w-5xl px-4 py-24 sm:px-6">
      <div className="text-center">
        <h2 className="text-h2-mobile font-semibold md:text-h2">{t.landing.offerTitle}</h2>
        <p className="mx-auto mt-4 max-w-xl text-body text-text-secondary">{t.landing.offerText(label)}</p>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <Column title={t.landing.offerPreview} price={t.landing.offerFree} items={t.landing.offerFreeItems} />
        <Column title={t.landing.offerFull} price={label ?? t.landing.offerFree} items={t.landing.offerPaidItems} highlight />
      </div>
      <div className="mt-10">
        <CtaLink price={price} />
      </div>
    </section>
  );
}
