"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { fetchOwnReview, saveOwnReview, type OwnReview } from "@/lib/api/reviews";

const EMPTY: OwnReview = { rating: 0, comment: "", displayName: "", publishConsent: false };

export function ReviewBox({ ideaId }: { ideaId: string }) {
  const { t } = useI18n();
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
      setError(t.analysis.reviewFailed);
    } finally {
      setSaving(false);
    }
  }

  if (sent) {
    return (
      <aside className="no-print mx-auto w-full max-w-3xl rounded-2xl border border-border bg-surface p-6 text-center">
        <p className="text-body font-semibold">{t.analysis.reviewThanks}</p>
        <button type="button" onClick={() => setSent(false)} className="mt-2 text-small text-text-secondary underline underline-offset-4">
          {t.analysis.reviewEdit}
        </button>
      </aside>
    );
  }

  return (
    <aside className="no-print mx-auto flex w-full max-w-3xl flex-col gap-4 rounded-2xl border border-border bg-surface p-6">
      <h2 className="text-body font-semibold">{t.analysis.reviewTitle}</h2>
      <div className="flex gap-1" role="radiogroup" aria-label={t.analysis.reviewRating}>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={review.rating === value}
            aria-label={t.analysis.reviewStar(value)}
            onClick={() => setReview({ ...review, rating: value })}
            className={`text-h3 leading-none ${value <= review.rating ? "text-accent-emerald" : "text-border"}`}
          >
            ★
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-2 text-small text-text-secondary">
        {t.analysis.reviewComment}
        <textarea
          value={review.comment}
          maxLength={500}
          rows={3}
          onChange={(event) => setReview({ ...review, comment: event.target.value })}
          className="rounded-lg border border-border bg-bg p-3 text-body text-text-primary focus:border-accent-emerald focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-2 text-small text-text-secondary">
        {t.analysis.reviewName}
        <input
          value={review.displayName ?? ""}
          maxLength={40}
          placeholder={t.analysis.reviewNamePlaceholder}
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
        {t.analysis.reviewConsent}
      </label>
      {error ? <p className="text-small text-error">{error}</p> : null}
      <div>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={saving || review.rating === 0}
          className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-5 py-2 text-small font-semibold text-white disabled:opacity-40"
        >
          {saving ? t.analysis.sending : t.analysis.sendReview}
        </button>
      </div>
    </aside>
  );
}
