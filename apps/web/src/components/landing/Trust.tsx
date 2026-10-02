const facts = [
  {
    title: "Les chiffres sont calculés, pas inventés",
    detail: "L'IA t'aide à formuler tes hypothèses. Tous les résultats viennent de formules fixes et testées, jamais de l'IA.",
  },
  {
    title: "Tu ne paies qu'une fois le verdict vu",
    detail: "L'aperçu est gratuit. L'analyse complète ne s'ouvre qu'après la confirmation de ton paiement par FedaPay.",
  },
  {
    title: "Pas de compte à créer",
    detail: "Ton analyse s'ouvre dans ton navigateur. Après paiement, un code te permet de la retrouver ailleurs.",
  },
  {
    title: "Une aide à la décision, pas une promesse",
    detail: "Les résultats dépendent des chiffres que tu donnes. Ça tient ? t'aide à décider, il ne garantit pas que ça marchera.",
  },
];

export function Trust() {
  return (
    <section className="border-t border-border px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-h2-mobile font-semibold md:text-h2">Pourquoi tu peux t&apos;y fier</h2>
        <dl className="mt-12 grid gap-8 md:grid-cols-2">
          {facts.map((fact) => (
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
