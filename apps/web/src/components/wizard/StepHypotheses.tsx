import { SUPPORTED_CURRENCIES, type CurrencyCode } from "financial-engine";
import type { BusinessModel } from "@/lib/business-models";
import type { HypothesesInput } from "@/lib/api/ideas";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { NumberInput } from "@/components/ui/NumberInput";

const HINTS: Record<BusinessModel, string> = {
  ECOMMERCE: "Inclut coût produit, livraison et commissions.",
  FORMATION: "Inclut coût de production et plateforme.",
  EBOOK: "Inclut commissions et coût de création.",
  SERVICE: "Inclut sous-traitance et outils.",
  PRODUIT_PHYSIQUE: "Inclut matières, production et logistique.",
  RESTAURATION: "Inclut ingrédients, gaz ou charbon, emballages et livraison par plat.",
  AGRICULTURE: "Inclut semences, engrais, aliments du bétail, main-d'œuvre et transport par unité vendue.",
  TRANSFORMATION_ALIMENTAIRE: "Inclut matière première, énergie, emballages et transport par unité.",
  AUTRE: "Regroupe tous tes coûts qui varient avec le volume vendu.",
};

const LOSSES_HINT = "Pense aussi aux pertes, aux retours et à la publicité par vente.";

const FIELDS: { key: keyof HypothesesInput; label: string; hint?: string }[] = [
  { key: "price", label: "À combien tu vends une unité ?" },
  {
    key: "volume",
    label: "Combien tu penses en vendre par mois ?",
    // The verdict depends on this number above all, and the AI can only guess it.
    hint: "C'est le chiffre qui pèse le plus. Comment sais-tu que tu en vendras autant ? Vérifie-le en premier.",
  },
  { key: "variableCostPerUnit", label: "Combien ça te coûte de produire ou fournir une unité ?" },
  {
    key: "fixedCosts",
    label: "Tes charges fixes chaque mois (loyer, salaires, abonnements...)",
    hint: "Compte aussi ce que tu veux te verser chaque mois : sans ça, le résultat est trop flatteur.",
  },
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
            <span className="text-micro">
              {HINTS[businessModel]} {LOSSES_HINT}
            </span>
          )}
          {field.hint ? <span className="text-micro">{field.hint}</span> : null}
          {field.key === "volume" ? (
            <NumberInput value={hypotheses.volume} onChange={(value) => onHypothesisChange("volume", value)} />
          ) : (
            <MoneyInput
              key={currency}
              value={hypotheses[field.key]}
              currency={currency}
              onChange={(value) => onHypothesisChange(field.key, value)}
            />
          )}
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
