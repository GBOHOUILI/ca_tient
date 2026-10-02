import { formatAmount } from "./format";

// "1 000 F CFA", or null when the analysis is free (ANALYSIS_PRICE_XOF=0).
export function priceLabel(priceXof: number): string | null {
  return priceXof === 0 ? null : formatAmount(priceXof, "XOF");
}
