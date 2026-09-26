export function StepOffer({
  onPay,
  onBack,
  paying,
  error,
  persistenceWarning,
}: {
  onPay: () => void;
  onBack: () => void;
  paying: boolean;
  error: string | null;
  persistenceWarning?: boolean;
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 text-center">
      <div>
        <p className="text-micro font-medium tracking-micro text-text-secondary">Analyse complete</p>
        <h1 className="text-h2-mobile font-semibold md:text-h2">Va plus loin que l&apos;apercu</h1>
      </div>
      <ul className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6 text-left text-body">
        <li>&quot;Et si ?&quot; : change ton prix, tes ventes ou tes couts et vois l&apos;effet en direct, mois par mois selon ta saisonnalite.</li>
        <li>Les scenarios prudent, realiste, ambitieux et crise, compares cote a cote.</li>
        <li>Bientot inclus : ton rapport complet, avec ton business model et le capital dont tu as besoin.</li>
      </ul>
      <p className="text-h1-mobile font-bold tabular-nums md:text-h1">1 000 FCFA</p>
      <p className="text-small text-text-secondary">
        Paiement unique, sans abonnement, sur la page securisee FedaPay (mobile money ou carte).
      </p>
      <p className="text-small text-text-secondary">
        Ca tient ? est une aide a la decision, pas une garantie de rentabilite : les resultats dependent des hypotheses que tu fournis.
      </p>
      {error ? <p className="text-small text-error">{error}</p> : null}
      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="text-body font-medium text-text-secondary">
          Retour
        </button>
        <button
          type="button"
          onClick={onPay}
          disabled={paying}
          className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-6 py-3 text-body font-semibold text-white disabled:opacity-40"
        >
          {paying ? "Redirection..." : "Payer 1 000 FCFA"}
        </button>
      </div>
    </div>
  );
}
