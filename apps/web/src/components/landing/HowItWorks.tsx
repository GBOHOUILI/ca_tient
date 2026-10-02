const steps = [
  {
    title: "Décris ton idée",
    description: "Le type de business et quelques phrases sur ce que tu veux lancer. Pas besoin de vocabulaire financier.",
  },
  {
    title: "Vérifie tes chiffres",
    description: "L'IA propose ton prix, tes ventes par mois et tes coûts à partir de ta description. Tu corriges ce qui ne colle pas.",
  },
  {
    title: "Vois si ça tient",
    description: "Ton aperçu gratuit s'affiche aussitôt. Si tu veux aller plus loin, l'analyse complète coûte 1 000 FCFA.",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <h2 className="text-center text-h2-mobile font-semibold md:text-h2">Trois étapes, quelques minutes</h2>
      <ol className="mt-12 grid gap-6 md:grid-cols-3">
        {steps.map((step, index) => (
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
