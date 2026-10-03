"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { deleteIdea } from "@/lib/api/ideas";

export function DeleteAnalysis({ ideaId }: { ideaId: string }) {
  const { t, href } = useI18n();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteIdea(ideaId);
      router.push(href("/"));
    } catch {
      setDeleting(false);
      setError(t.analysis.deleteFailed);
    }
  }

  if (!confirming) {
    return (
      <div className="no-print text-center">
        <button type="button" onClick={() => setConfirming(true)} className="text-small text-text-secondary underline underline-offset-4">
          {t.analysis.deleteLink}
        </button>
      </div>
    );
  }

  return (
    <div className="no-print mx-auto flex w-full max-w-xl flex-col gap-3 rounded-2xl border border-error p-6 text-center">
      <p className="text-body">
        {t.analysis.deleteWarning}
      </p>
      {error ? <p className="text-small text-error">{error}</p> : null}
      <div className="flex justify-center gap-3">
        <button type="button" onClick={() => setConfirming(false)} disabled={deleting} className="rounded-lg border border-border px-4 py-2 text-small font-medium">
          {t.analysis.cancel}
        </button>
        <button
          type="button"
          onClick={() => void confirmDelete()}
          disabled={deleting}
          className="rounded-lg bg-error px-4 py-2 text-small font-semibold text-white disabled:opacity-40"
        >
          {deleting ? t.analysis.deleting : t.analysis.deleteForever}
        </button>
      </div>
    </div>
  );
}
