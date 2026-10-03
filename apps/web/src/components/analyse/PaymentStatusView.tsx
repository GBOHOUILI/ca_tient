"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import type { PaymentGateView } from "./use-payment-gate";

const primaryButton =
  "rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-6 py-3 text-body font-semibold text-white disabled:opacity-40";

// Every state of the analysis page before the paid content: loading, no access, pending, failed, error.
export function PaymentStatusView({
  view,
  retrying,
  onCheckAgain,
  onRetryPayment,
}: {
  view: Exclude<PaymentGateView, { kind: "paid" }>;
  retrying: boolean;
  onCheckAgain: () => void;
  onRetryPayment: () => void;
}) {
  const { t, href } = useI18n();
  if (view.kind === "loading") {
    return <p className="text-center text-body text-text-secondary">{t.analysis.loading}</p>;
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
      {view.kind === "no-access" && (
        <>
          <h1 className="text-h2-mobile font-semibold md:text-h2">{t.analysis.notFoundTitle}</h1>
          <p className="text-body text-text-secondary">
            {t.analysis.notFoundText}
          </p>
          <Link href={href("/retrouver")} className={primaryButton}>
            {t.header.recover}
          </Link>
          <Link href={href("/commencer")} className="text-body font-medium text-text-secondary">
            {t.analysis.testAnIdea}
          </Link>
        </>
      )}

      {view.kind === "pending" && (
        <>
          <h1 className="text-h2-mobile font-semibold md:text-h2">{t.analysis.pendingTitle}</h1>
          <p className="text-body text-text-secondary">
            {view.timedOut
              ? t.analysis.pendingTimedOut
              : t.analysis.pendingWaiting}
          </p>
          {view.timedOut ? (
            <button type="button" onClick={onCheckAgain} className={primaryButton}>
              {t.analysis.checkAgain}
            </button>
          ) : null}
        </>
      )}

      {view.kind === "failed" && (
        <>
          <h1 className="text-h2-mobile font-semibold md:text-h2">{t.analysis.failedTitle}</h1>
          <p className="text-body text-text-secondary">{t.analysis.failedText}</p>
          <button type="button" onClick={onRetryPayment} disabled={retrying} className={primaryButton}>
            {retrying ? t.offer.redirecting : t.analysis.retryPayment}
          </button>
        </>
      )}

      {view.kind === "error" && (
        <>
          <h1 className="text-h2-mobile font-semibold md:text-h2">{t.analysis.unavailableTitle}</h1>
          <button type="button" onClick={onCheckAgain} className={primaryButton}>
            {t.analysis.retry}
          </button>
        </>
      )}
    </div>
  );
}
