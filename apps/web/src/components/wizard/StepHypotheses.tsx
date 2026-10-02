import { SUPPORTED_CURRENCIES, type CurrencyCode } from "financial-engine";
import type { BusinessModel } from "@/lib/business-models";
import type { HypothesesInput } from "@/lib/api/ideas";

const HINTS: Record<BusinessModel, string> = {
  ECOMMERCE: "Inclut coût produit, livraison et commissions.",
  FORMATION: "Inclut coût de production et plateforme.",
  EBOOK: "Inclut commissions et coût de création.",
  SERVICE: "Inclut sous-traitance et outils.",
  PRODUIT_PHYSIQUE: "Inclut matières, production et logistique.",
  AUTRE: "Regroupe tous tes coûts qui varient avec le volume vendu.",
};

const FIELDS: { key: keyof HypothesesInput; label: string }[] = [
  { key: "price", label: "À combien tu vends une unité ?" },
  { key: "volume", label: "Combien tu penses en vendre par mois ?" },
  { key: "variableCostPerUnit", label: "Combien ça te coûte de produire ou fournir une unité ?" },
  { key: "fixedCosts", label: "Tes charges fixes chaque mois (loyer, salaires, abonnements...)" },
];

export function StepHypotheses({
  businessModel,
  hypotheses,
  currency,
  wasSuggested,
  onHypothesisChange,
  onCurrencyChange,
  onSubmit,
  onBack,
  submitting,
  error,
}: {
  businessModel: BusinessModel;
  hypotheses: HypothesesInput;
  currency: CurrencyCode;
  wasSuggested: boolean;
  onHypothesisChange: (key: keyof HypothesesInput, value: number) => void;
  onCurrencyChange: (currency: CurrencyCode) => void;
  onSubmit: () => void;
  onBack: () => void;
  submitting: boolean;
  error: string | null;
}) {
  // The API requires a price of at least 1 (all other values may be 0).
  const hasPrice = hypotheses.price >= 1;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <h1 className="text-center text-h2-mobile font-semibold md:text-h2">Tes hypothèses</h1>
      {wasSuggested ? (
        <p className="text-center text-small text-accent-emerald">
          Suggéré par l&apos;IA à partir de ta description : vérifie et corrige si besoin.
        </p>
      ) : null}
      <label className="flex flex-col gap-2 text-small text-text-secondary">
        Devise
        <select
          value={currency}
          onChange={(e) => onCurrencyChange(e.target.value as CurrencyCode)}
          className="rounded-lg border border-border bg-surface p-3 text-body text-text-primary"
        >
          {SUPPORTED_CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </label>
      {FIELDS.map((field) => (
        <label key={field.key} className="flex flex-col gap-2 text-small text-text-secondary">
          {field.label}
          {field.key === "variableCostPerUnit" && (
            <span className="text-micro">{HINTS[businessModel]}</span>
          )}
          <input
            type="number"
            min={0}
            value={hypotheses[field.key]}
            onChange={(e) => onHypothesisChange(field.key, Number(e.target.value))}
            className="rounded-lg border border-border bg-surface p-3 text-right text-body tabular-nums text-text-primary focus:border-accent-emerald focus:outline-none"
          />
        </label>
      ))}
      {error ? <p className="text-small text-error">{error}</p> : null}
      {!hasPrice ? (
        <p className="text-center text-small text-text-secondary">Indique ton prix de vente pour continuer.</p>
      ) : null}
      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="text-body font-medium text-text-secondary">
          Retour
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !hasPrice}
          className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-6 py-3 text-body font-semibold text-white disabled:opacity-40"
        >
          {submitting ? "Calcul en cours..." : "Voir mes résultats"}
        </button>
      </div>
    </div>
  );
}
