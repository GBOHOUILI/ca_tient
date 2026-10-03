import type { CurrencyCode } from "./financial-engine.types.js";

// Amounts are stored as integers in the currency's smallest unit (DECISIONS 2026-09-19).
const MINOR_UNIT_DIGITS: Record<CurrencyCode, number> = { XOF: 0, EUR: 2, USD: 2, GBP: 2, NGN: 2, GHS: 2 };

export function minorUnitDigits(currency: CurrencyCode): number {
  return MINOR_UNIT_DIGITS[currency];
}

export function toMinorUnits(amount: number, currency: CurrencyCode): number {
  // toFixed absorbs binary float noise (1.005 * 100 = 100.4999...) before rounding.
  return Math.round(Number((amount * 10 ** minorUnitDigits(currency)).toFixed(6)));
}

export function fromMinorUnits(amount: number, currency: CurrencyCode): number {
  return amount / 10 ** minorUnitDigits(currency);
}

// Same number, new currency label: 3 000 XOF becomes 3 000 € (no exchange rate, ever).
export function relabelCurrency(amount: number, from: CurrencyCode, to: CurrencyCode): number {
  return toMinorUnits(fromMinorUnits(amount, from), to);
}

// Fixed official CFA franc / euro parity: a constant, not an exchange rate.
export const XOF_PER_EUR = 655.957;

export function approxEurFromXof(xof: number): number {
  return toMinorUnits(xof / XOF_PER_EUR, "EUR");
}
