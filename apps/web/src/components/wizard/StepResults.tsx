import type { BreakEvenResult, FinancialResult } from "@/lib/ideas-api";

function formatAmount(value: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export function StepResults({ result, breakEven }: { result: FinancialResult; breakEven: BreakEvenResult }) {
  const positive = result.estimatedResult >= 0;

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-8 text-center">
      <div>
        <p className="text-micro font-medium tracking-micro text-text-secondary">Apercu</p>
        <h1 className={`text-h1-mobile font-bold md:text-h1 ${positive ? "text-success" : "text-error"}`}>
          {positive ? "Ca tient (pour l'instant)" : "Ca ne tient pas encore"}
        </h1>
      </div>
      <div className="grid w-full gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-small text-text-secondary">Chiffre d&apos;affaires</p>
          <p className="mt-2 text-h3 font-semibold tabular-nums">{formatAmount(result.revenue, result.currency)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-small text-text-secondary">Marge brute</p>
          <p className="mt-2 text-h3 font-semibold tabular-nums">{formatAmount(result.grossMargin, result.currency)}</p>
        </div>
        <div
          className={`rounded-2xl border-l-[3px] border-border bg-surface p-6 ${positive ? "border-l-success" : "border-l-error"}`}
        >
          <p className="text-small text-text-secondary">Resultat estime</p>
          <p className="mt-2 text-h3 font-semibold tabular-nums">
            {formatAmount(result.estimatedResult, result.currency)}
          </p>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-6 text-left">
        <p className="text-small text-text-secondary">Seuil de rentabilite</p>
        {breakEven.reachable ? (
          <p className="mt-2 text-body tabular-nums">
            Il te faut vendre <span className="font-semibold">{breakEven.volumeUnits}</span> unites par mois pour
            couvrir tes couts.
          </p>
        ) : (
          <p className="mt-2 text-body text-error">
            A prix et couts actuels, aucun volume ne permet d&apos;atteindre la rentabilite : ta marge par unite est
            nulle ou negative.
          </p>
        )}
      </div>
    </div>
  );
}
