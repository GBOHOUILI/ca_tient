// Rating shown as text stars, with the exact value for screen readers.
export function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span aria-label={`${rating} sur 5`} className="text-accent-emerald" role="img">
      {"★".repeat(full)}
      <span className="text-border">{"★".repeat(5 - full)}</span>
    </span>
  );
}
