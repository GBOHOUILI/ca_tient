import { SUPPORTED_CURRENCIES, fromMinorUnits, minorUnitDigits, type CurrencyCode } from "financial-engine";

function isSupported(currency: string): currency is CurrencyCode {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(currency);
}

// `amount` is in the currency's smallest unit (cents for EUR): 250 EUR-cents -> "2,50 €".
// Decimals only appear when there are some: 30 000 000 EUR-cents -> "300 000 €".
export function formatAmount(amount: number, currency: string) {
  const digits = isSupported(currency) ? minorUnitDigits(currency) : 0;
  const value = isSupported(currency) ? fromMinorUnits(amount, currency) : amount;
  const fractionDigits = Number.isInteger(value) ? 0 : digits;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}
