import { computeCapitalNeed, computeSensitivity, computeWatchPoints } from "financial-engine";
import { getI18n } from "@/i18n/server";
import { formatAmount } from "@/lib/format";
import { EXAMPLE_CAPITAL, EXAMPLE_HYPOTHESES } from "./example";

// Real parts of the paid report, computed by the engine on the landing page example.
export async function ReportExtract() {
  const { t, locale } = await getI18n();
  const amount = (value: number) => formatAmount(value, EXAMPLE_HYPOTHESES.currency, locale);
  const need = computeCapitalNeed(EXAMPLE_HYPOTHESES, EXAMPLE_CAPITAL);
  const sensitivity = computeSensitivity(EXAMPLE_HYPOTHESES).slice(0, 2);
  const watchPoints = computeWatchPoints(EXAMPLE_HYPOTHESES, need);

  return (
    <section className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-h2-mobile font-semibold md:text-h2">{t.landing.extractTitle}</h2>
        <p className="mt-4 text-body text-text-secondary">
          {t.landing.extractIntro(
            amount(EXAMPLE_CAPITAL.equipment + EXAMPLE_CAPITAL.initialStock),
            amount(EXAMPLE_CAPITAL.availableCapital),
          )}
        </p>
      </div>
      <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6">
          <h3 className="text-h4 font-semibold">{t.landing.extractCapital}</h3>
          <dl className="flex flex-col gap-1 text-small">
            <div className="flex justify-between gap-3">
              <dt className="text-text-secondary">{t.landing.extractNeeded}</dt>
              <dd className="tabular-nums">{amount(need.capitalNeeded)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-text-secondary">{t.landing.extractSaved}</dt>
              <dd className="tabular-nums">{amount(need.availableCapital)}</dd>
            </div>
          </dl>
          <p className="text-body font-semibold text-error">{t.landing.extractMissing(amount(need.financingGap))}</p>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6">
          <h3 className="text-h4 font-semibold">{t.landing.extractWeighs}</h3>
          <ul className="flex flex-col gap-3 text-small">
            {sensitivity.map((entry) => {
              // Show the unfavourable direction: lower price or sales, higher costs.
              const costs = entry.key === "variableCostPerUnit" || entry.key === "fixedCosts";
              const copy = t.report.sensitivity[entry.key];
              return (
                <li key={entry.key}>
                  <span className="font-semibold">{copy.label}</span>
                  <span className="block text-text-secondary">
                    {costs ? copy.up : copy.down} :{" "}
                    <span className="tabular-nums text-text-primary">{amount(costs ? entry.resultIfUp : entry.resultIfDown)}</span> {t.landing.perMonth}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6">
          <h3 className="text-h4 font-semibold">{t.landing.extractWatch}</h3>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-small text-text-secondary">
            {watchPoints.map((code) => (
              <li key={code}>{t.report.watchPoints[code]}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
