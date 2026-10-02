import type { BreakEvenResult, FinancialResult } from "financial-engine";
import { formatAmount } from "@/lib/format";

export function StepResults({
  result,
  breakEven,
  headingAs: Heading = "h1",
}: {
  result: FinancialResult;
  breakEven: BreakEvenResult;
  // The landing page embeds this screen as an example under its own h1.
  headingAs?: "h1" | "h3";
}) {
  const positive = result.estimatedResult >= 0;

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-8 text-center">
      <div>
        <p className="text-micro font-medium tracking-micro text-text-secondary">Aperçu</p>
        <Heading className={`text-h1-mobile font-bold md:text-h1 ${positive ? "text-success" : "text-error"}`}>
          {positive ? "Ça tient (pour l'instant)" : "Ça ne tient pas encore"}
        </Heading>
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
          <p className="text-small text-text-secondary">Résultat estimé</p>
          <p className="mt-2 text-h3 font-semibold tabular-nums">
            {formatAmount(result.estimatedResult, result.currency)}
          </p>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-6 text-left">
        <p className="text-small text-text-secondary">Seuil de rentabilité</p>
        {breakEven.reachable ? (
          <p className="mt-2 text-body tabular-nums">
            Il te faut vendre <span className="font-semibold">{breakEven.volumeUnits}</span> unités par mois pour
            couvrir tes coûts.
          </p>
        ) : (
          <p className="mt-2 text-body text-error">
            À prix et coûts actuels, aucun volume ne permet d&apos;atteindre la rentabilité : ta marge par unité est
            nulle ou négative.
          </p>
        )}
      </div>
    </div>
  );
}
