import { computeBreakEven, computeResult, type Hypotheses } from "financial-engine";
import { StepResults } from "@/components/wizard/StepResults";
import { formatAmount } from "@/lib/format";

// A real preview screen, computed by the engine on an example clearly labelled as such.
const EXAMPLE: Hypotheses = { currency: "XOF", price: 15000, volume: 40, variableCostPerUnit: 9000, fixedCosts: 120000 };

export function ProductPreview() {
  const result = computeResult(EXAMPLE);
  const breakEven = computeBreakEven(EXAMPLE);
  const amount = (value: number) => formatAmount(value, EXAMPLE.currency);

  return (
    <section className="border-y border-border px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-h2-mobile font-semibold md:text-h2">Voilà ce que tu vois, gratuitement</h2>
        <p className="mt-4 text-body text-text-secondary">
          Exemple : vente de pagnes en ligne à {amount(EXAMPLE.price)} pièce, {EXAMPLE.volume} ventes par mois,{" "}
          {amount(EXAMPLE.variableCostPerUnit)} de coût par pièce et {amount(EXAMPLE.fixedCosts)} de charges fixes par mois.
        </p>
      </div>
      <div className="mt-12">
        <StepResults result={result} breakEven={breakEven} headingAs="h3" />
      </div>
      <p className="mt-6 text-center text-micro text-text-secondary">Écran réel de l&apos;aperçu, calculé sur cet exemple.</p>
    </section>
  );
}
