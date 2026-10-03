// Rating shown as text stars, with the exact value for screen readers.
export function Stars({ rating, label }: { rating: number; label?: string }) {
  const full = Math.round(rating);
  return (
    <span aria-label={label ?? `${rating} sur 5`} className="text-accent-emerald" role="img">
      {"★".repeat(full)}
      <span className="text-border">{"★".repeat(5 - full)}</span>
    </span>
  );
}
