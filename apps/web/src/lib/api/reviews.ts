import { API_BASE_URL, authHeaders } from "./http";

export interface OwnReview {
  rating: number;
  comment: string;
  displayName: string | null;
  publishConsent: boolean;
}

export interface PublicReview {
  rating: number;
  comment: string;
  displayName: string | null;
  createdAt: string;
}

export interface PublishedReviews {
  count: number;
  average: number | null;
  reviews: PublicReview[];
}

const NO_REVIEWS: PublishedReviews = { count: 0, average: null, reviews: [] };

export async function fetchOwnReview(ideaId: string): Promise<OwnReview | null> {
  const response = await fetch(`${API_BASE_URL}/ideas/${ideaId}/review`, { headers: authHeaders(ideaId) });
  if (!response.ok) return null;
  const body = (await response.json()) as Partial<OwnReview>;
  return typeof body.rating === "number" ? (body as OwnReview) : null;
}

export async function saveOwnReview(ideaId: string, review: OwnReview): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/ideas/${ideaId}/review`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders(ideaId) },
    body: JSON.stringify({ ...review, displayName: review.displayName?.trim() || undefined }),
  });
  if (!response.ok) throw new Error(`L'envoi de l'avis a échoué (${response.status}).`);
}

// Landing page (server): cached, and never waits more than 3 s for a sleeping API.
export async function getPublishedReviews(): Promise<PublishedReviews> {
  try {
    const response = await fetch(`${API_BASE_URL}/reviews`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(3_000),
    });
    return response.ok ? ((await response.json()) as PublishedReviews) : NO_REVIEWS;
  } catch {
    return NO_REVIEWS;
  }
}
