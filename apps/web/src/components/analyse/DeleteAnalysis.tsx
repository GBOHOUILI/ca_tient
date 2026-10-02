"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteIdea } from "@/lib/api/ideas";

export function DeleteAnalysis({ ideaId }: { ideaId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteIdea(ideaId);
      router.push("/");
    } catch {
      setDeleting(false);
      setError("La suppression n'a pas abouti. Réessaie.");
    }
  }

  if (!confirming) {
    return (
      <div className="no-print text-center">
        <button type="button" onClick={() => setConfirming(true)} className="text-small text-text-secondary underline underline-offset-4">
          Supprimer mon analyse
        </button>
      </div>
    );
  }

  return (
    <div className="no-print mx-auto flex w-full max-w-xl flex-col gap-3 rounded-2xl border border-error p-6 text-center">
      <p className="text-body">
        Ton analyse, tes chiffres et tes réponses seront supprimés définitivement. Tu ne pourras plus la retrouver, même
        avec ton code.
      </p>
      {error ? <p className="text-small text-error">{error}</p> : null}
      <div className="flex justify-center gap-3">
        <button type="button" onClick={() => setConfirming(false)} disabled={deleting} className="rounded-lg border border-border px-4 py-2 text-small font-medium">
          Annuler
        </button>
        <button
          type="button"
          onClick={() => void confirmDelete()}
          disabled={deleting}
          className="rounded-lg bg-error px-4 py-2 text-small font-semibold text-white disabled:opacity-40"
        >
          {deleting ? "Suppression..." : "Supprimer définitivement"}
        </button>
      </div>
    </div>
  );
}
