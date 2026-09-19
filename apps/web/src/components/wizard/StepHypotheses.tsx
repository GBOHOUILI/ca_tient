import { CURRENCIES, type BusinessModel, type CurrencyCode, type HypothesesInput } from "@/lib/ideas-api";

const HINTS: Record<BusinessModel, string> = {
  ECOMMERCE: "Inclut cout produit, livraison et commissions.",
  FORMATION: "Inclut cout de production et plateforme.",
  EBOOK: "Inclut commissions et cout de creation.",
  SERVICE: "Inclut sous-traitance et outils.",
  PRODUIT_PHYSIQUE: "Inclut matieres, production et logistique.",
  AUTRE: "Regroupe tous tes couts qui varient avec le volume vendu.",
};

const FIELDS: { key: keyof HypothesesInput; label: string }[] = [
  { key: "price", label: "Prix de vente unitaire" },
  { key: "volume", label: "Volume de ventes par mois" },
  { key: "variableCostPerUnit", label: "Cout variable par unite" },
  { key: "fixedCosts", label: "Couts fixes par mois" },
];

export function StepHypotheses({
  businessModel,
  hypotheses,
  currency,
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
  onHypothesisChange: (key: keyof HypothesesInput, value: number) => void;
  onCurrencyChange: (currency: CurrencyCode) => void;
  onSubmit: () => void;
  onBack: () => void;
  submitting: boolean;
  error: string | null;
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <h1 className="text-center text-h2-mobile font-semibold md:text-h2">Tes hypotheses</h1>
      <label className="flex flex-col gap-2 text-small text-text-secondary">
        Devise
        <select
          value={currency}
          onChange={(e) => onCurrencyChange(e.target.value as CurrencyCode)}
          className="rounded-lg border border-border bg-surface p-3 text-body text-text-primary"
        >
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </label>
      {FIELDS.map((field) => (
        <label key={field.key} className="flex flex-col gap-2 text-small text-text-secondary">
          {field.label}
          {(field.key === "variableCostPerUnit" || field.key === "fixedCosts") && (
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
      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="text-body font-medium text-text-secondary">
          Retour
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-6 py-3 text-body font-semibold text-white disabled:opacity-40"
        >
          {submitting ? "Calcul en cours..." : "Voir mes resultats"}
        </button>
      </div>
    </div>
  );
}
