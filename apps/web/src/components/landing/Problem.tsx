const situations = [
  "Ton prix de vente est fixé « au feeling », sans savoir ce qu'il te reste sur chaque vente.",
  "Tu as compté le stock, mais pas le loyer, le transport, les emballages ou les frais de paiement.",
  "Tu ne sais pas combien il faut vendre chaque mois pour simplement couvrir tes charges.",
  "Tu t'apprêtes à mettre tes économies, une tontine ou un prêt, sans savoir combien il te faut vraiment.",
];

export function Problem() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-24 sm:px-6">
      <h2 className="text-center text-h2-mobile font-semibold md:text-h2">Se lancer sans calculer, c&apos;est parier ton argent</h2>
      <ul className="mt-10 flex flex-col gap-4">
        {situations.map((situation) => (
          <li key={situation} className="border-l-[3px] border-l-warning pl-4 text-body text-text-primary">
            {situation}
          </li>
        ))}
      </ul>
      <p className="mt-8 text-center text-body text-text-secondary">
        Ça tient ? fait ces calculs avec toi, avant que tu dépenses quoi que ce soit.
      </p>
    </section>
  );
}
