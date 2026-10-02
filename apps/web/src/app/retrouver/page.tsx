"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { RecoveryCodeNotFoundError, TooManyAttemptsError, redeemRecoveryCode } from "@/lib/api/recovery";

export default function RetrouverPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { ideaId } = await redeemRecoveryCode(code);
      router.push(`/analyse/${ideaId}`);
    } catch (caught) {
      setSubmitting(false);
      if (caught instanceof RecoveryCodeNotFoundError) {
        setError("Ce code ne correspond a aucune analyse. Verifie-le et reessaie.");
      } else if (caught instanceof TooManyAttemptsError) {
        setError("Trop d'essais, attends une minute avant de reessayer.");
      } else {
        setError("Service momentanement indisponible, reessaie dans un instant.");
      }
    }
  }

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-16 sm:px-6">
      <div className="text-center">
        <h1 className="text-h2-mobile font-semibold md:text-h2">Retrouver mon analyse</h1>
        <p className="mt-2 text-body text-text-secondary">
          Saisis le code obtenu apres ton paiement (il commence par CT-).
        </p>
      </div>
      <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-small text-text-secondary">
          Ton code
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="CT-XXXXX-XXXXX"
            autoComplete="off"
            autoCapitalize="characters"
            maxLength={40}
            className="rounded-lg border border-border bg-surface p-3 text-center text-body uppercase tabular-nums tracking-wide text-text-primary focus:border-accent-emerald focus:outline-none"
          />
        </label>
        {error ? <p className="text-small text-error">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting || code.trim().length === 0}
          className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-6 py-3 text-body font-semibold text-white disabled:opacity-40"
        >
          {submitting ? "Recherche..." : "Retrouver mon analyse"}
        </button>
      </form>
    </main>
  );
}
