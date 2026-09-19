export function StepDescription({
  value,
  onChange,
  onNext,
  onBack,
}: {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-center text-h2-mobile font-semibold md:text-h2">Decris ton idee</h1>
      <p className="text-center text-body text-text-secondary">
        Quelques phrases suffisent. Ca t&apos;aidera plus tard quand l&apos;IA proposera des hypotheses.
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        placeholder="Ex : je veux vendre des vetements en ligne pour jeunes actifs, livraison a domicile..."
        className="rounded-lg border border-border bg-surface p-4 text-body text-text-primary focus:border-accent-emerald focus:outline-none"
      />
      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="text-body font-medium text-text-secondary">
          Retour
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={value.trim().length === 0}
          className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-6 py-3 text-body font-semibold text-white disabled:opacity-40"
        >
          Continuer
        </button>
      </div>
    </div>
  );
}
