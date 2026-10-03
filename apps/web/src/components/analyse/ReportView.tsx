"use client";

import type { ReactNode } from "react";
import type { IdeaReport, ReportSummary } from "@/lib/api/report";
import { useI18n } from "@/i18n/I18nProvider";
import { formatAmount, numberLocale } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";

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
  const { t, locale } = useI18n();
  const currency = report.idea.currency;
  const amount = (value: number) => formatAmount(value, currency, locale);
  const count = (value: number) => value.toLocaleString(numberLocale(locale));
  const { costStructure, revenueStreams, blocks } = report.canvas;

  const canvasCells: { key: keyof typeof t.report.canvas; text: string }[] = [
    ...(["keyPartners", "keyActivities", "keyResources", "valueProposition", "customerRelationships", "channels", "customerSegments"] as const).map(
      (key) => ({ key, text: blocks[key] ?? t.analysis.notFilled }),
    ),
    {
      key: "costStructure",
      text: [
        t.analysis.costPerUnit(amount(costStructure.variableCostPerUnit)),
        t.analysis.fixedPerMonth(amount(costStructure.fixedCosts)),
        ...(costStructure.startupCosts !== null ? [t.analysis.startupLine(amount(costStructure.startupCosts))] : []),
      ].join(" · "),
    },
    {
      key: "revenueStreams",
      text: t.analysis.revenueLine(count(revenueStreams.volume), amount(revenueStreams.price), amount(revenueStreams.revenue)),
    },
  ];

  const secondaryButton = "rounded-lg border border-border px-4 py-2 text-small font-medium text-text-primary";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="no-print flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onBackToAnalysis} className={secondaryButton}>
          {t.analysis.backToWhatIf}
        </button>
        <button type="button" onClick={onEditCapital} className={secondaryButton}>
          {t.analysis.editCapital}
        </button>
        <button
          type="button"
          onClick={() => {
            trackEvent("report_printed", report.idea.id);
            window.print();
          }}
          className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-4 py-2 text-small font-semibold text-white"
        >
          {t.analysis.print}
        </button>
      </div>

      <div className="text-center">
        <p className="text-micro font-medium tracking-micro text-text-secondary">{t.analysis.reportEyebrow}</p>
        <h1 className="text-h2-mobile font-semibold md:text-h2">{t.analysis.reportTitle}</h1>
        <p className="mt-2 text-body text-text-secondary">{report.idea.rawDescription}</p>
        {recoveryCode ? (
          <p className="mt-2 text-small text-text-secondary">
            {t.analysis.reportCode} <span className="font-semibold tabular-nums text-text-primary">{recoveryCode}</span>
          </p>
        ) : null}
      </div>

      <Section title={t.analysis.summaryTitle}>
        {summary ? (
          <p className="text-body">{summary.text}</p>
        ) : (
          <p className="text-body text-text-secondary" aria-live="polite">
            {t.analysis.writingSummary}
          </p>
        )}
        <p className="text-small text-text-secondary">
          {t.offer.disclaimer}
        </p>
      </Section>

      <Section title={t.analysis.keyFigures}>
        <dl className="flex flex-col gap-2 text-body">
          <Row label={t.results.revenue} value={amount(report.result.revenue)} />
          <Row label={t.results.grossMargin} value={amount(report.result.grossMargin)} />
          <Row label={t.results.estimatedResult} value={amount(report.result.estimatedResult)} strong />
          <Row
            label={t.results.breakEven}
            value={
              report.breakEven.reachable
                ? t.analysis.breakEvenSales(count(report.breakEven.volumeUnits))
                : t.analysis.breakEvenNever
            }
          />
        </dl>
      </Section>

      <Section title={t.analysis.capitalSection}>
        {report.capital ? (
          <dl className="flex flex-col gap-2 text-body">
            <Row label={t.analysis.startupCosts} value={amount(report.capital.need.startupCosts)} />
            <Row label={t.analysis.cashReserve} value={amount(report.capital.need.cashReserve)} />
            <Row label={t.analysis.capitalNeeded} value={amount(report.capital.need.capitalNeeded)} strong />
            <Row label={t.analysis.availableCapital} value={amount(report.capital.need.availableCapital)} />
            {report.capital.need.financingGap > 0 ? (
              <p className="mt-2 font-semibold text-error">{t.analysis.missing(amount(report.capital.need.financingGap))}</p>
            ) : (
              <p className="mt-2 font-semibold text-accent-emerald">{t.analysis.surplus(amount(report.capital.need.surplus))}</p>
            )}
            <p className="mt-2 text-small text-text-secondary">
              {t.analysis.workingCapital}
            </p>
          </dl>
        ) : (
          <div className="flex flex-col items-start gap-3">
            <p className="text-body text-text-secondary">
              {t.analysis.capitalMissingText}
            </p>
            <button type="button" onClick={onEditCapital} className={`no-print ${secondaryButton}`}>
              {t.analysis.completeCapital}
            </button>
          </div>
        )}
      </Section>

      <Section title={t.analysis.scenariosSection}>
        <table className="w-full text-body">
          <thead>
            <tr className="text-left text-small text-text-secondary">
              <th className="pb-2 font-medium">{t.analysis.scenarioColumn}</th>
              <th className="pb-2 text-right font-medium">{t.analysis.resultColumn}</th>
            </tr>
          </thead>
          <tbody>
            {report.scenarios.map((scenario) => (
              <tr key={scenario.key} className="border-t border-border">
                <td className="py-2">{t.analysis.scenarios[scenario.key]}</td>
                <td className="py-2 text-right tabular-nums">{amount(scenario.result.estimatedResult)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title={t.analysis.sensitivitySection}>
        <p className="text-small text-text-secondary">
          {t.analysis.sensitivityIntro}
        </p>
        <ul className="flex flex-col gap-3">
          {report.sensitivity.map((entry) => {
            const copy = t.report.sensitivity[entry.key];
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

      <Section title={t.analysis.watchSection}>
        {report.watchPoints.length > 0 ? (
          <ul className="flex list-disc flex-col gap-2 pl-5 text-body">
            {report.watchPoints.map((code) => (
              <li key={code}>{t.report.watchPoints[code]}</li>
            ))}
          </ul>
        ) : (
          <p className="text-body text-text-secondary">{t.analysis.noWatchPoints}</p>
        )}
      </Section>

      <Section title={t.analysis.canvasSection}>
        <div className="grid gap-3 md:grid-cols-3 print:grid-cols-1">
          {canvasCells.map((cell) => (
            <div key={cell.key} className="report-section rounded-lg border border-border bg-bg p-4">
              <h3 className="text-small font-semibold text-text-secondary">{t.report.canvas[cell.key]}</h3>
              <p className="mt-1 text-body">{cell.text}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
