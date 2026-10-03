"use client";

import { useState } from "react";
import { fromMinorUnits, minorUnitDigits, toMinorUnits, type CurrencyCode } from "financial-engine";
import { NUMBER_INPUT_CLASS } from "./NumberInput";

// The person types in units ("2,50" €); the value stays in the smallest unit (250 cents).
export function MoneyInput({
  value,
  currency,
  onChange,
}: {
  value: number;
  currency: CurrencyCode;
  onChange: (value: number) => void;
}) {
  const decimals = minorUnitDigits(currency) > 0;
  // Local text keeps an in-progress entry like "2," or "2.0" that a number would lose.
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? displayValue(value, currency);

  return (
    <input
      type="text"
      inputMode={decimals ? "decimal" : "numeric"}
      placeholder="0"
      value={shown}
      onChange={(e) => {
        const raw = e.target.value.replace(/\s/g, "");
        const pattern = decimals ? /^\d*([.,]\d{0,2})?$/ : /^\d*$/;
        if (!pattern.test(raw)) return;
        setText(raw);
        onChange(toMinorUnits(Number(raw.replace(",", ".") || 0), currency));
      }}
      onBlur={() => setText(null)}
      className={NUMBER_INPUT_CLASS}
    />
  );
}

// 250 EUR-cents -> "2,50"; 300 000 EUR-cents -> "3000"; 0 -> "" (placeholder).
function displayValue(value: number, currency: CurrencyCode): string {
  if (value === 0) return "";
  const units = fromMinorUnits(value, currency);
  return (Number.isInteger(units) ? String(units) : units.toFixed(minorUnitDigits(currency))).replace(".", ",");
}
