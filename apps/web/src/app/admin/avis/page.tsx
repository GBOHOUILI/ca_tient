"use client";

import Link from "next/link";
import { useState } from "react";
import { useAdmin, useAdminData } from "@/components/admin/AdminContext";
import { Card, DataState, PageTitle } from "@/components/admin/ui";
import { shortDate } from "@/components/admin/admin-labels";
import { Stars } from "@/components/Stars";
import { moderateReview, type AdminReview } from "@/lib/api/admin";

const STATUS_LABELS: Record<AdminReview["status"], string> = {
  pending: "À modérer",
  published: "Publié",
  hidden: "Masqué",
};

export default function AdminReviewsPage() {
  const { adminKey } = useAdmin();
  // Bumped after each moderation so the list reloads.
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const data = useAdminData<AdminReview[]>("/admin/reviews", { v: version });

  async function setStatus(review: AdminReview, status: AdminReview["status"]) {
    setError(null);
    try {
      await moderateReview(adminKey, review.id, status);
      setVersion((current) => current + 1);
    } catch {
      setError("La modération a échoué.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageTitle>Avis</PageTitle>
      <p className="text-small text-text-secondary">
        Un avis n&apos;apparaît sur le site que si tu le publies et que la personne a accepté sa publication. Toute
        modification par son auteur le renvoie en modération.
      </p>
      {error ? <p className="text-small text-error">{error}</p> : null}
      <DataState data={data}>
        {(reviews) =>
          reviews.length === 0 ? (
            <p className="text-body text-text-secondary">Aucun avis pour l&apos;instant.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {reviews.map((review) => (
                <Card
                  key={review.id}
                  title={`${STATUS_LABELS[review.status]} · ${shortDate(review.createdAt)}`}
                  action={<Stars rating={review.rating} />}
                >
                  <p className="text-body">{review.comment || <span className="text-text-secondary">(sans commentaire)</span>}</p>
                  <p className="text-small text-text-secondary">
                    {review.displayName || "Anonyme"} ·{" "}
                    {review.publishConsent ? "accepte la publication" : "refuse la publication"} ·{" "}
                    <Link href={`/admin/idees/${review.ideaId}`} className="underline underline-offset-4">
                      voir l&apos;idée
                    </Link>
                  </p>
                  <div className="flex gap-3">
                    {review.status !== "published" && review.publishConsent ? (
                      <button
                        type="button"
                        onClick={() => void setStatus(review, "published")}
                        className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-4 py-2 text-small font-semibold text-white"
                      >
                        Publier
                      </button>
                    ) : null}
                    {review.status !== "hidden" ? (
                      <button
                        type="button"
                        onClick={() => void setStatus(review, "hidden")}
                        className="rounded-lg border border-border px-4 py-2 text-small font-medium"
                      >
                        Masquer
                      </button>
                    ) : null}
                  </div>
                </Card>
              ))}
            </div>
          )
        }
      </DataState>
    </div>
  );
}
