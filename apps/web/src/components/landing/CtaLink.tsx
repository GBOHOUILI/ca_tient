import Link from "next/link";
import { priceLabel } from "@/lib/price";

// The one call to action of the landing page, identical everywhere it appears.
export function CtaLink({ price }: { price: number }) {
  const label = priceLabel(price);
  return (
    <div className="flex flex-col items-center gap-2">
      <Link
        href="/commencer"
        className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-6 py-3 text-body font-semibold text-white shadow-[0_8px_32px_rgba(0,133,88,0.25)] transition-transform hover:scale-[1.02]"
      >
        Tester mon idée
      </Link>
      <span className="text-small tabular-nums text-text-secondary">
        {label ? `Aperçu gratuit · analyse complète ${label}` : "Aperçu et analyse complète gratuits"}
      </span>
    </div>
  );
}
