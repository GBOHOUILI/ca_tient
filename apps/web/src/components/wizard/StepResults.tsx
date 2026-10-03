"use client";

import type { BreakEvenResult, FinancialResult } from "financial-engine";
import { useI18n } from "@/i18n/I18nProvider";
import { formatAmount, numberLocale } from "@/lib/format";

export function StepResults({
  result,
  breakEven,
  headingAs: Heading = "h1",
  downside,
}: {
  result: FinancialResult;
  breakEven: BreakEvenResult;
  // The landing page embeds this screen as an example under its own h1.
  headingAs?: "h1" | "h3";
  // Result if sales are 20 % lower: keeps a free "it holds" verdict honest about its main assumption.
  downside?: FinancialResult;
}) {
  const { t, locale } = useI18n();
  const positive = result.estimatedResult >= 0;

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-8 text-center">
      <div>
        <p className="text-micro font-medium tracking-micro text-text-secondary">{t.results.preview}</p>
        <Heading className={`text-h1-mobile font-bold md:text-h1 ${positive ? "text-success" : "text-error"}`}>
          {positive ? t.results.holds : t.results.doesNotHold}
        </Heading>
      </div>
      <div className="grid w-full gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-small text-text-secondary">{t.results.revenue}</p>
          <p className="mt-2 text-h3 font-semibold tabular-nums">{formatAmount(result.revenue, result.currency, locale)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-small text-text-secondary">{t.results.grossMargin}</p>
          <p className="mt-2 text-h3 font-semibold tabular-nums">{formatAmount(result.grossMargin, result.currency, locale)}</p>
        </div>
        <div
          className={`rounded-2xl border-l-[3px] border-border bg-surface p-6 ${positive ? "border-l-success" : "border-l-error"}`}
        >
          <p className="text-small text-text-secondary">{t.results.estimatedResult}</p>
          <p className="mt-2 text-h3 font-semibold tabular-nums">
            {formatAmount(result.estimatedResult, result.currency, locale)}
          </p>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-6 text-left">
        <p className="text-small text-text-secondary">{t.results.breakEven}</p>
        {breakEven.reachable ? (
          <p className="mt-2 text-body tabular-nums">
            {t.results.breakEvenUnits(breakEven.volumeUnits.toLocaleString(numberLocale(locale)))}
          </p>
        ) : (
          <p className="mt-2 text-body text-error">
            {t.results.unreachable}
          </p>
        )}
      </div>
      {downside ? (
        <p className="text-body text-text-secondary">
          {t.results.downside}{" "}
          <span className={`font-semibold tabular-nums ${downside.estimatedResult >= 0 ? "text-text-primary" : "text-error"}`}>
            {formatAmount(downside.estimatedResult, downside.currency, locale)}
          </span>{" "}
          {t.results.perMonth}
        </p>
      ) : null}
    </div>
  );
}
