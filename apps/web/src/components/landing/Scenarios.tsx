const scenarios = [
  {
    label: "Prudent",
    accent: "border-l-warning",
    description: "Volume -20 %, coûts +10 %. Le cas où le démarrage est plus lent que prévu.",
  },
  {
    label: "Réaliste",
    accent: "border-l-accent-emerald",
    description: "Tes hypothèses de départ, sans ajustement.",
  },
  {
    label: "Ambitieux",
    accent: "border-l-success",
    description: "Volume +30 %. Si l'accueil dépasse tes attentes.",
  },
  {
    label: "Crise",
    accent: "border-l-error",
    description: "Volume -40 %, prix -10 %, coûts +15 %. Le scénario à ne pas ignorer avant de te lancer.",
  },
];

export function Scenarios() {
  return (
    <section className="border-t border-border px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-h2-mobile font-semibold md:text-h2">Tes hypothèses changent, tes chiffres suivent</h2>
          <p className="mt-4 text-body text-text-secondary">
            Le module « Et si… ? » recalcule instantanément quatre scénarios à partir de tes variables.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {scenarios.map((scenario) => (
            <div
              key={scenario.label}
              className={`rounded-2xl border border-border border-l-[3px] bg-surface p-6 ${scenario.accent}`}
            >
              <h3 className="text-h4 font-semibold">{scenario.label}</h3>
              <p className="mt-2 text-small text-text-secondary">{scenario.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
