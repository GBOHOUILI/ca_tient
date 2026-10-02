const benefits = [
  {
    title: "Sache combien tu dois vendre chaque mois",
    detail: "Ton seuil de rentabilité : le nombre de ventes à partir duquel tu ne perds plus d'argent.",
  },
  {
    title: "Vois ce qui se passe si ça va moins bien",
    detail: "Ventes plus faibles, coûts plus élevés : les scénarios prudent et crise te montrent si tu tiens quand même.",
  },
  {
    title: "Sache combien d'argent il te faut pour démarrer",
    detail: "Tes dépenses de départ plus trois mois de charges, comparées à ce que tu as déjà de côté.",
  },
  {
    title: "Repère le chiffre qui peut tout faire basculer",
    detail: "Prix, ventes, coût par unité, charges : le rapport classe ce qui pèse le plus sur ton résultat.",
  },
];

export function Benefits() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-24 sm:px-6">
      <h2 className="text-center text-h2-mobile font-semibold md:text-h2">Ce que ça change avant de te lancer</h2>
      <dl className="mt-12 grid gap-8 md:grid-cols-2">
        {benefits.map((benefit) => (
          <div key={benefit.title}>
            <dt className="text-h4 font-semibold">{benefit.title}</dt>
            <dd className="mt-2 text-body text-text-secondary">{benefit.detail}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
