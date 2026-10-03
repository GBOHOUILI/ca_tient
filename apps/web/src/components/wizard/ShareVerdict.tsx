"use client";

import type { BreakEvenResult, FinancialResult } from "financial-engine";
import { useI18n } from "@/i18n/I18nProvider";

// A ready-made WhatsApp message: the verdict is the product's best word of mouth. Only the
// verdict and the break-even point are shared, never the person's own figures. A plain link
// (not window.open) so mobile and in-app browsers never block it.
export function ShareVerdict({ result, breakEven }: { result: FinancialResult; breakEven: BreakEvenResult }) {
  const { t, href } = useI18n();
  const site = `${window.location.origin}${href("/")}`;
  const verdict =
    result.estimatedResult >= 0 && breakEven.reachable ? t.results.shareHolds(breakEven.volumeUnits) : t.results.shareTested;
  const text = `${verdict} ${t.results.shareInvite(site)}`;

  return (
    <a
      href={`https://wa.me/?text=${encodeURIComponent(text)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-lg border border-border px-5 py-3 text-body font-medium text-text-primary"
    >
      {t.results.share}
    </a>
  );
}
