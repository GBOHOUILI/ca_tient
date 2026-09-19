const steps = [
  {
    title: "Décris ton idée",
    description: "Business model, contexte, quelques phrases libres sur ce que tu veux lancer.",
  },
  {
    title: "Valide les hypothèses",
    description:
      "L'IA propose les variables clés (prix, volumes, coûts) à partir de ta description, tu les corriges si besoin.",
  },
  {
    title: "Teste tes scénarios",
    description:
      "Simulation immédiate : chiffre d'affaires, marge, seuil de rentabilité. Ajuste en direct avec « Et si… ? ».",
  },
  {
    title: "Paie et reçois ton rapport",
    description: "1 000 FCFA, paiement vérifié côté serveur, puis l'analyse complète et le rapport détaillé.",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <h2 className="text-center text-h2-mobile font-semibold md:text-h2">Comment ça marche</h2>
      <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <li key={step.title} className="rounded-2xl border border-border bg-surface p-6">
            <span className="text-small font-semibold tabular-nums text-accent-emerald">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-3 text-h4 font-semibold">{step.title}</h3>
            <p className="mt-2 text-small text-text-secondary">{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
