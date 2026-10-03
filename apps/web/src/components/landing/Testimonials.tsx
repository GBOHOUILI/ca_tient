import { Stars } from "@/components/Stars";
import type { PublishedReviews } from "@/lib/api/reviews";

// Only real reviews, published by the admin with the author's consent. Hidden until there is one.
export function Testimonials({ data }: { data: PublishedReviews }) {
  if (data.count === 0 || data.average === null) return null;

  return (
    <section className="mx-auto max-w-5xl px-4 py-24 sm:px-6">
      <div className="text-center">
        <h2 className="text-h2-mobile font-semibold md:text-h2">Ce qu&apos;en disent les utilisateurs</h2>
        <p className="mt-3 text-body text-text-secondary">
          <Stars rating={data.average} /> {data.average.toLocaleString("fr-FR")} / 5 · {data.count} avis
        </p>
      </div>
      <ul className="mt-12 grid gap-6 md:grid-cols-2">
        {data.reviews.map((review) => (
          <li key={review.createdAt + review.comment} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6">
            <Stars rating={review.rating} />
            {review.comment ? <p className="text-body text-text-primary">« {review.comment} »</p> : null}
            {review.displayName ? <p className="text-small text-text-secondary">— {review.displayName}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
