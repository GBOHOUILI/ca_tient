// Liste volontairement restreinte pour le MVP (marché initial Bénin, ouverture
// régionale prévue par docs/PRODUCT.md). Rien à convertir entre devises : le champ
// n'est qu'une étiquette qui traverse le calcul, voir financial-engine.service.ts.
export const SUPPORTED_CURRENCIES = ["XOF", "EUR", "USD", "GBP", "NGN", "GHS"] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

// Tous les montants sont des entiers dans la plus petite unité de la devise
// (centimes pour EUR/USD/GBP/NGN/GHS, unité entière pour XOF qui n'a pas de
// sous-unité). Pas d'arithmétique flottante sur les montants, voir
// skills/financial-engine.md.
export interface Hypotheses {
  currency: CurrencyCode;
  price: number;
  variableCostPerUnit: number;
  fixedCosts: number;
  volume: number;
}

export interface FinancialResult {
  currency: CurrencyCode;
  revenue: number;
  grossMargin: number;
  estimatedResult: number;
}

export type BreakEvenResult =
  | { reachable: true; volumeUnits: number }
  | { reachable: false; reason: "non_positive_unit_margin" };
