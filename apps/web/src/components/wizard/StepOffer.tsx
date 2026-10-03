"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { fetchAnalysisPrice } from "@/lib/api/pricing";
import { priceLabel } from "@/lib/price";

export function StepOffer({
  onPay,
  onBack,
  paying,
  error,
  persistenceWarning,
}: {
  onPay: () => void;
  // Absent when the offer is shown on its own (idea reopened later from /retrouver).
  onBack?: () => void;
  paying: boolean;
  error: string | null;
  persistenceWarning?: boolean;
}) {
  const { t, locale } = useI18n();
  // The price shown here is read from the server right before paying: it is the amount charged.
  const [price, setPrice] = useState<number | null>(null);
  const [priceError, setPriceError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchAnalysisPrice()
      .then((value) => {
        if (!cancelled) setPrice(value);
      })
      .catch(() => {
        if (!cancelled) setPriceError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const label = price === null ? null : priceLabel(price, locale);
  const free = price === 0;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 text-center">
      <div>
        <p className="text-micro font-medium tracking-micro text-text-secondary">{t.offer.eyebrow}</p>
        <h1 className="text-h2-mobile font-semibold md:text-h2">{t.offer.title}</h1>
      </div>
      <ul className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6 text-left text-body">
        {t.offer.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="text-h1-mobile font-bold tabular-nums md:text-h1">
        {price === null ? (priceError ? "—" : "…") : (label ?? t.offer.free)}
      </p>
      <p className="text-small text-text-secondary">
        {free
          ? t.offer.freeNow
          : t.offer.paidOnce}
      </p>
      {priceError ? (
        <p className="text-small text-error">{t.offer.priceFailed}</p>
      ) : null}
      <p className="text-small text-text-secondary">
        {t.offer.disclaimer}
      </p>
      {persistenceWarning ? (
        <p className="rounded-lg border border-warning p-4 text-left text-small text-warning">
          {t.offer.storageWarning}
        </p>
      ) : null}
      {error ? <p className="text-small text-error">{error}</p> : null}
      <div className="flex justify-between">
        {onBack ? (
          <button type="button" onClick={onBack} className="text-body font-medium text-text-secondary">
            {t.common.back}
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onPay}
          disabled={paying || price === null}
          className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-6 py-3 text-body font-semibold text-white disabled:opacity-40"
        >
          {paying ? t.offer.redirecting : free ? t.wizard.seeFullAnalysis : label ? t.offer.pay(label) : t.offer.payPlain}
        </button>
      </div>
    </div>
  );
}
