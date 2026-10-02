import type { CurrencyCode, Hypotheses } from "financial-engine";

const KEYS = ["price", "volume", "variableCostPerUnit", "fixedCosts"] as const;

// Stored Hypothesis rows -> engine input. null when a row is missing (never guessed as 0).
export function hypothesesFromRows(currency: string, rows: { key: string; value: number }[]): Hypotheses | null {
  const values = new Map(rows.map((row) => [row.key, row.value]));
  if (!KEYS.every((key) => values.has(key))) return null;
  return {
    currency: currency as CurrencyCode,
    price: values.get("price")!,
    volume: values.get("volume")!,
    variableCostPerUnit: values.get("variableCostPerUnit")!,
    fixedCosts: values.get("fixedCosts")!,
  };
}
