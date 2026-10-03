import { approxEurFromXof } from "financial-engine";
import type { Locale } from "@/i18n/locales";
import { formatAmount } from "./format";

// "1 000 F CFA" / "1,000 CFA francs (about €1.52)", or null when the analysis is free (ANALYSIS_PRICE_XOF=0).
export function priceLabel(priceXof: number, locale: Locale = "fr"): string | null {
  if (priceXof === 0) return null;
  if (locale === "fr") return formatAmount(priceXof, "XOF");
  const xof = new Intl.NumberFormat("en-GB").format(priceXof);
  return `${xof} CFA francs (about ${formatAmount(approxEurFromXof(priceXof), "EUR", "en")})`;
}
