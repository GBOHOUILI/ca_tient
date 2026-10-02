import { CtaLink } from "./CtaLink";

export function FinalCta({ price }: { price: number }) {
  return (
    <section className="border-t border-border px-4 py-24 text-center sm:px-6">
      <h2 className="text-h2-mobile font-semibold md:text-h2">Avant d&apos;investir, vérifie que ça tient</h2>
      <p className="mx-auto mt-4 max-w-md text-body text-text-secondary">
        Quelques minutes pour décrire ton idée, et tu sais si tes chiffres tiennent la route.
      </p>
      <div className="mt-8">
        <CtaLink price={price} />
      </div>
    </section>
  );
}
