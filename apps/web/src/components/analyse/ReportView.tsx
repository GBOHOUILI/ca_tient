"use client";

import type { ReactNode } from "react";
import type { IdeaReport, ReportSummary } from "@/lib/api/report";
import { formatAmount } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";
import { scenarioLabel } from "@/lib/scenarios";
import { CANVAS_LABELS, SENSITIVITY_COPY, WATCH_POINT_COPY } from "./report-copy";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="report-section flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6">
      <h2 className="text-h3-mobile font-semibold md:text-h3">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "font-semibold" : ""}`}>
      <dt className={strong ? "" : "text-text-secondary"}>{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </div>
  );
}

export function ReportView({
  report,
  summary,
  recoveryCode,
  onEditCapital,
  onBackToAnalysis,
}: {
  report: IdeaReport;
  // null while the summary is being written (it never blocks the rest of the report).
  summary: ReportSummary | null;
  recoveryCode: string | null;
  onEditCapital: () => void;
  onBackToAnalysis: () => void;
}) {
  const currency = report.idea.currency;
  const amount = (value: number) => formatAmount(value, currency);
  const { costStructure, revenueStreams, blocks } = report.canvas;

  const canvasCells: { key: keyof typeof CANVAS_LABELS; text: string }[] = [
    ...(["keyPartners", "keyActivities", "keyResources", "valueProposition", "customerRelationships", "channels", "customerSegments"] as const).map(
      (key) => ({ key, text: blocks[key] ?? "Non renseigné" }),
    ),
    {
      key: "costStructure",
      text: [
        `Coût par unité : ${amount(costStructure.variableCostPerUnit)}`,
        `Charges fixes : ${amount(costStructure.fixedCosts)} par mois`,
        ...(costStructure.startupCosts !== null ? [`Dépenses de départ : ${amount(costStructure.startupCosts)}`] : []),
      ].join(" · "),
    },
    {
      key: "revenueStreams",
      text: `${revenueStreams.volume} ventes par mois à ${amount(revenueStreams.price)}, soit ${amount(revenueStreams.revenue)} de chiffre d'affaires mensuel.`,
    },
  ];

  const secondaryButton = "rounded-lg border border-border px-4 py-2 text-small font-medium text-text-primary";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="no-print flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onBackToAnalysis} className={secondaryButton}>
          Revenir à Et si ?
        </button>
        <button type="button" onClick={onEditCapital} className={secondaryButton}>
          Modifier mon capital
        </button>
        <button
          type="button"
          onClick={() => {
            trackEvent("report_printed", report.idea.id);
            window.print();
          }}
          className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-4 py-2 text-small font-semibold text-white"
        >
          Imprimer / Enregistrer en PDF
        </button>
      </div>

      <div className="text-center">
        <p className="text-micro font-medium tracking-micro text-text-secondary">Ça tient ? · Rapport complet</p>
        <h1 className="text-h2-mobile font-semibold md:text-h2">Ton rapport</h1>
        <p className="mt-2 text-body text-text-secondary">{report.idea.rawDescription}</p>
        {recoveryCode ? (
          <p className="mt-2 text-small text-text-secondary">
            Code pour revoir cette analyse : <span className="font-semibold tabular-nums text-text-primary">{recoveryCode}</span>
          </p>
        ) : null}
      </div>

      <Section title="Synthèse">
        {summary ? (
          <p className="text-body">{summary.text}</p>
        ) : (
          <p className="text-body text-text-secondary" aria-live="polite">
            Rédaction de ta synthèse...
          </p>
        )}
        <p className="text-small text-text-secondary">
          Ça tient ? est une aide à la décision, pas une garantie de rentabilité : les résultats dépendent des hypothèses
          que tu fournis.
        </p>
      </Section>

      <Section title="Chiffres clés (par mois)">
        <dl className="flex flex-col gap-2 text-body">
          <Row label="Chiffre d'affaires" value={amount(report.result.revenue)} />
          <Row label="Marge brute" value={amount(report.result.grossMargin)} />
          <Row label="Résultat estimé" value={amount(report.result.estimatedResult)} strong />
          <Row
            label="Seuil de rentabilité"
            value={
              report.breakEven.reachable
                ? `${report.breakEven.volumeUnits} ventes par mois`
                : "Inatteignable tant que ton prix ne dépasse pas ton coût par unité"
            }
          />
        </dl>
      </Section>

      <Section title="Capital et besoin financier">
        {report.capital ? (
          <dl className="flex flex-col gap-2 text-body">
            <Row label="Dépenses de départ" value={amount(report.capital.need.startupCosts)} />
            <Row label="Réserve (3 mois de charges)" value={amount(report.capital.need.cashReserve)} />
            <Row label="Capital nécessaire" value={amount(report.capital.need.capitalNeeded)} strong />
            <Row label="Capital disponible" value={amount(report.capital.need.availableCapital)} />
            {report.capital.need.financingGap > 0 ? (
              <p className="mt-2 font-semibold text-error">Il te manque {amount(report.capital.need.financingGap)}</p>
            ) : (
              <p className="mt-2 font-semibold text-accent-emerald">Tu as {amount(report.capital.need.surplus)} de marge</p>
            )}
          </dl>
        ) : (
          <div className="flex flex-col items-start gap-3">
            <p className="text-body text-text-secondary">
              Indique tes dépenses de départ et ton capital pour savoir combien il te faut pour te lancer.
            </p>
            <button type="button" onClick={onEditCapital} className={`no-print ${secondaryButton}`}>
              Compléter mon capital
            </button>
          </div>
        )}
      </Section>

      <Section title="Scénarios">
        <table className="w-full text-body">
          <thead>
            <tr className="text-left text-small text-text-secondary">
              <th className="pb-2 font-medium">Scénario</th>
              <th className="pb-2 text-right font-medium">Résultat estimé par mois</th>
            </tr>
          </thead>
          <tbody>
            {report.scenarios.map((scenario) => (
              <tr key={scenario.key} className="border-t border-border">
                <td className="py-2">{scenarioLabel(scenario.key)}</td>
                <td className="py-2 text-right tabular-nums">{amount(scenario.result.estimatedResult)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Variables sensibles">
        <p className="text-small text-text-secondary">
          De la plus sensible à la moins sensible : l&apos;effet d&apos;une variation de 10 % sur ton résultat mensuel.
        </p>
        <ul className="flex flex-col gap-3">
          {report.sensitivity.map((entry) => {
            const copy = SENSITIVITY_COPY[entry.key];
            return (
              <li key={entry.key} className="flex flex-col gap-1 border-t border-border pt-3 text-body">
                <span className="font-semibold">{copy.label}</span>
                <span className="text-text-secondary">
                  {copy.up} : <span className="tabular-nums text-text-primary">{amount(entry.resultIfUp)}</span> · {copy.down}{" "}
                  : <span className="tabular-nums text-text-primary">{amount(entry.resultIfDown)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Points à surveiller">
        {report.watchPoints.length > 0 ? (
          <ul className="flex list-disc flex-col gap-2 pl-5 text-body">
            {report.watchPoints.map((code) => (
              <li key={code}>{WATCH_POINT_COPY[code]}</li>
            ))}
          </ul>
        ) : (
          <p className="text-body text-text-secondary">Aucun point d&apos;alerte avec tes hypothèses actuelles.</p>
        )}
      </Section>

      <Section title="Ton business model">
        <div className="grid gap-3 md:grid-cols-3 print:grid-cols-1">
          {canvasCells.map((cell) => (
            <div key={cell.key} className="report-section rounded-lg border border-border bg-bg p-4">
              <h3 className="text-small font-semibold text-text-secondary">{CANVAS_LABELS[cell.key]}</h3>
              <p className="mt-1 text-body">{cell.text}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
