import Link from "next/link";

export function Pricing() {
  return (
    <section className="border-t border-border px-4 py-24 text-center sm:px-6">
      <h2 className="text-h2-mobile font-semibold md:text-h2">Un prix, pas de surprise</h2>
      <p className="mx-auto mt-4 max-w-md text-body text-text-secondary">
        Une analyse complète pour{" "}
        <span className="font-semibold tabular-nums text-text-primary">1 000 FCFA</span>. Pas d&apos;abonnement,
        pas de frais caché.
      </p>
      <Link
        href="/commencer"
        className="mt-8 inline-block rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-6 py-3 text-body font-semibold text-white shadow-[0_8px_32px_rgba(5,150,105,0.18)] transition-transform hover:scale-[1.02]"
      >
        Tester mon idée
      </Link>
    </section>
  );
}
