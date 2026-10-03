"use client";

import { useEffect, useState } from "react";
import { fetchOwnReview, saveOwnReview, type OwnReview } from "@/lib/api/reviews";

const EMPTY: OwnReview = { rating: 0, comment: "", displayName: "", publishConsent: false };

export function ReviewBox({ ideaId }: { ideaId: string }) {
  const [review, setReview] = useState<OwnReview>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchOwnReview(ideaId)
      .then((existing) => {
        if (!cancelled && existing) setReview({ ...existing, displayName: existing.displayName ?? "" });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ideaId]);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await saveOwnReview(ideaId, review);
      setSent(true);
    } catch {
      setError("L'envoi n'a pas abouti. Réessaie.");
    } finally {
      setSaving(false);
    }
  }

  if (sent) {
    return (
      <aside className="no-print mx-auto w-full max-w-3xl rounded-2xl border border-border bg-surface p-6 text-center">
        <p className="text-body font-semibold">Merci pour ton avis !</p>
        <button type="button" onClick={() => setSent(false)} className="mt-2 text-small text-text-secondary underline underline-offset-4">
          Le modifier
        </button>
      </aside>
    );
  }

  return (
    <aside className="no-print mx-auto flex w-full max-w-3xl flex-col gap-4 rounded-2xl border border-border bg-surface p-6">
      <h2 className="text-body font-semibold">Ton avis sur Ça tient ?</h2>
      <div className="flex gap-1" role="radiogroup" aria-label="Note sur 5">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={review.rating === value}
            aria-label={`${value} sur 5`}
            onClick={() => setReview({ ...review, rating: value })}
            className={`text-h3 leading-none ${value <= review.rating ? "text-accent-emerald" : "text-border"}`}
          >
            ★
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-2 text-small text-text-secondary">
        Qu&apos;est-ce que ça t&apos;a apporté ?
        <textarea
          value={review.comment}
          maxLength={500}
          rows={3}
          onChange={(event) => setReview({ ...review, comment: event.target.value })}
          className="rounded-lg border border-border bg-bg p-3 text-body text-text-primary focus:border-accent-emerald focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-2 text-small text-text-secondary">
        Ton prénom et ta ville (facultatif, affichés avec ton avis)
        <input
          value={review.displayName ?? ""}
          maxLength={40}
          placeholder="Ex : Awa, Cotonou"
          onChange={(event) => setReview({ ...review, displayName: event.target.value })}
          className="rounded-lg border border-border bg-bg p-3 text-body text-text-primary focus:border-accent-emerald focus:outline-none"
        />
      </label>
      <label className="flex items-start gap-2 text-small text-text-primary">
        <input
          type="checkbox"
          checked={review.publishConsent}
          onChange={(event) => setReview({ ...review, publishConsent: event.target.checked })}
          className="mt-1"
        />
        J&apos;accepte que mon avis soit publié sur le site.
      </label>
      {error ? <p className="text-small text-error">{error}</p> : null}
      <div>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={saving || review.rating === 0}
          className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-5 py-2 text-small font-semibold text-white disabled:opacity-40"
        >
          {saving ? "Envoi..." : "Envoyer mon avis"}
        </button>
      </div>
    </aside>
  );
}
