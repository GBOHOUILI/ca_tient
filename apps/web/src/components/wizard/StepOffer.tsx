"use client";

import { useEffect, useState } from "react";
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
  onBack: () => void;
  paying: boolean;
  error: string | null;
  persistenceWarning?: boolean;
}) {
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

  const label = price === null ? null : priceLabel(price);
  const free = price === 0;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 text-center">
      <div>
        <p className="text-micro font-medium tracking-micro text-text-secondary">Analyse complète</p>
        <h1 className="text-h2-mobile font-semibold md:text-h2">Va plus loin que l&apos;aperçu</h1>
      </div>
      <ul className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6 text-left text-body">
        <li>&quot;Et si ?&quot; : change ton prix, tes ventes ou tes coûts et vois l&apos;effet en direct, mois par mois selon ta saisonnalité.</li>
        <li>Les scénarios prudent, réaliste, ambitieux et crise, comparés côte à côte.</li>
        <li>Ton rapport complet à imprimer : synthèse, capital et besoin financier, variables sensibles, points à surveiller et business model.</li>
      </ul>
      <p className="text-h1-mobile font-bold tabular-nums md:text-h1">
        {price === null ? (priceError ? "—" : "…") : (label ?? "Gratuit")}
      </p>
      <p className="text-small text-text-secondary">
        {free
          ? "En ce moment, l'analyse complète est gratuite : rien à payer."
          : "Paiement unique, sans abonnement, sur la page sécurisée FedaPay (mobile money ou carte)."}
      </p>
      {priceError ? (
        <p className="text-small text-error">Le prix n&apos;a pas pu être chargé. Recharge la page pour réessayer.</p>
      ) : null}
      <p className="text-small text-text-secondary">
        Ça tient ? est une aide à la décision, pas une garantie de rentabilité : les résultats dépendent des hypothèses que tu fournis.
      </p>
      {persistenceWarning ? (
        <p className="rounded-lg border border-warning p-4 text-left text-small text-warning">
          Ton navigateur bloque l&apos;enregistrement local (navigation privée ?). Après le paiement, tu risques de ne
          pas pouvoir revenir à ton analyse. Ouvre Ça tient ? dans une fenêtre normale avant de payer.
        </p>
      ) : null}
      {error ? <p className="text-small text-error">{error}</p> : null}
      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="text-body font-medium text-text-secondary">
          Retour
        </button>
        <button
          type="button"
          onClick={onPay}
          disabled={paying || price === null}
          className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-6 py-3 text-body font-semibold text-white disabled:opacity-40"
        >
          {paying ? "Redirection..." : free ? "Voir l'analyse complète" : label ? `Payer ${label}` : "Payer"}
        </button>
      </div>
    </div>
  );
}
