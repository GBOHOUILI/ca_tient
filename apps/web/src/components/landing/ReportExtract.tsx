import { computeCapitalNeed, computeSensitivity, computeWatchPoints } from "financial-engine";
import { SENSITIVITY_COPY, WATCH_POINT_COPY } from "@/components/analyse/report-copy";
import { formatAmount } from "@/lib/format";
import { EXAMPLE_CAPITAL, EXAMPLE_HYPOTHESES } from "./example";

const amount = (value: number) => formatAmount(value, EXAMPLE_HYPOTHESES.currency);

// Real parts of the paid report, computed by the engine on the landing page example.
export function ReportExtract() {
  const need = computeCapitalNeed(EXAMPLE_HYPOTHESES, EXAMPLE_CAPITAL);
  const sensitivity = computeSensitivity(EXAMPLE_HYPOTHESES).slice(0, 2);
  const watchPoints = computeWatchPoints(EXAMPLE_HYPOTHESES, need);

  return (
    <section className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-h2-mobile font-semibold md:text-h2">Et dans l&apos;analyse complète</h2>
        <p className="mt-4 text-body text-text-secondary">
          Extrait réel du rapport, sur le même exemple, avec {amount(EXAMPLE_CAPITAL.equipment + EXAMPLE_CAPITAL.initialStock)} de
          dépenses de départ et {amount(EXAMPLE_CAPITAL.availableCapital)} de côté.
        </p>
      </div>
      <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6">
          <h3 className="text-h4 font-semibold">Capital pour te lancer</h3>
          <dl className="flex flex-col gap-1 text-small">
            <div className="flex justify-between gap-3">
              <dt className="text-text-secondary">Capital nécessaire</dt>
              <dd className="tabular-nums">{amount(need.capitalNeeded)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-text-secondary">Déjà de côté</dt>
              <dd className="tabular-nums">{amount(need.availableCapital)}</dd>
            </div>
          </dl>
          <p className="text-body font-semibold text-error">Il manque {amount(need.financingGap)}</p>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6">
          <h3 className="text-h4 font-semibold">Ce qui pèse le plus</h3>
          <ul className="flex flex-col gap-3 text-small">
            {sensitivity.map((entry) => {
              // Show the unfavourable direction: lower price or sales, higher costs.
              const costs = entry.key === "variableCostPerUnit" || entry.key === "fixedCosts";
              const copy = SENSITIVITY_COPY[entry.key];
              return (
                <li key={entry.key}>
                  <span className="font-semibold">{copy.label}</span>
                  <span className="block text-text-secondary">
                    {costs ? copy.up : copy.down} :{" "}
                    <span className="tabular-nums text-text-primary">{amount(costs ? entry.resultIfUp : entry.resultIfDown)}</span> par mois
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6">
          <h3 className="text-h4 font-semibold">Points à surveiller</h3>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-small text-text-secondary">
            {watchPoints.map((code) => (
              <li key={code}>{WATCH_POINT_COPY[code]}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
