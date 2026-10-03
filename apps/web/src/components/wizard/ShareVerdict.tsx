"use client";

import type { BreakEvenResult, FinancialResult } from "financial-engine";

// A ready-made WhatsApp message: the verdict is the product's best word of mouth. Only the
// verdict and the break-even point are shared, never the person's own figures. A plain link
// (not window.open) so mobile and in-app browsers never block it.
export function ShareVerdict({ result, breakEven }: { result: FinancialResult; breakEven: BreakEvenResult }) {
  const site = window.location.origin;
  const verdict =
    result.estimatedResult >= 0 && breakEven.reachable
      ? `Mon idée de business tient : il me faut ${breakEven.volumeUnits} ventes par mois pour couvrir mes coûts.`
      : "J'ai testé les chiffres de mon idée de business avant de me lancer.";
  const text = `${verdict} Teste la tienne sur Ça tient ? : ${site}`;

  return (
    <a
      href={`https://wa.me/?text=${encodeURIComponent(text)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-lg border border-border px-5 py-3 text-body font-medium text-text-primary"
    >
      Partager mon verdict sur WhatsApp
    </a>
  );
}
