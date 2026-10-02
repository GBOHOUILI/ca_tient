import { priceLabel } from "@/lib/price";
import { CtaLink } from "./CtaLink";

const free = [
  "Les hypothèses proposées par l'IA à partir de ta description",
  "Ton chiffre d'affaires, ta marge et ton résultat par mois",
  "Le nombre de ventes par mois pour couvrir tes charges",
  "Le verdict : ça tient, ou pas encore",
];

const paid = [
  "« Et si ? » : change ton prix, tes ventes ou tes coûts et vois l'effet en direct, mois par mois",
  "4 scénarios comparés : prudent, réaliste, ambitieux, crise",
  "Le capital qu'il te faut pour te lancer, et ce qu'il te manque",
  "Un rapport à imprimer : synthèse, chiffres qui comptent le plus, points à surveiller, business model",
  "Un code pour retrouver ton analyse depuis un autre téléphone",
];

function Column({ title, price, items, highlight }: { title: string; price: string; items: string[]; highlight?: boolean }) {
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

export function Offer({ price }: { price: number }) {
  const label = priceLabel(price);
  return (
    <section id="tarif" className="mx-auto max-w-5xl px-4 py-24 sm:px-6">
      <div className="text-center">
        <h2 className="text-h2-mobile font-semibold md:text-h2">Tu sais si ça tient avant de payer</h2>
        <p className="mx-auto mt-4 max-w-xl text-body text-text-secondary">
          {label
            ? `L'aperçu est gratuit. Tu ne paies que si tu veux l'analyse complète : ${label} par idée, une seule fois, sans abonnement.`
            : "L'aperçu et l'analyse complète sont gratuits en ce moment."}
        </p>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <Column title="Aperçu" price="Gratuit" items={free} />
        <Column title="Analyse complète" price={label ?? "Gratuit"} items={paid} highlight />
      </div>
      <div className="mt-10">
        <CtaLink price={price} />
      </div>
    </section>
  );
}
