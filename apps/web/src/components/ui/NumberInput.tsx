const CLASS_NAME =
  "rounded-lg border border-border bg-surface p-3 text-right text-body tabular-nums text-text-primary placeholder:text-text-secondary focus:border-accent-emerald focus:outline-none";

// 0 is shown as an empty field (placeholder "0"): otherwise typing "5" after the 0 gives "05".
export function NumberInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      placeholder="0"
      value={value === 0 ? "" : value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={CLASS_NAME}
    />
  );
}
