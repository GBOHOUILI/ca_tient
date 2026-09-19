const types = ["E-commerce", "Formation", "E-book", "Service", "Produit physique", "Autre"];

export function BusinessTypes() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <p className="text-center text-small font-medium tracking-micro text-text-secondary">
        Quel que soit ton projet
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {types.map((type) => (
          <span key={type} className="rounded-lg border border-border bg-surface px-4 py-2 text-small text-text-primary">
            {type}
          </span>
        ))}
      </div>
    </section>
  );
}
