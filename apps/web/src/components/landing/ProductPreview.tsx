import { applyDelta, computeBreakEven, computeResult } from "financial-engine";
import { StepResults } from "@/components/wizard/StepResults";
import { getI18n } from "@/i18n/server";
import { formatAmount, numberLocale } from "@/lib/format";
import { EXAMPLE_HYPOTHESES } from "./example";

// A real preview screen, computed by the engine on an example clearly labelled as such.
const EXAMPLE = EXAMPLE_HYPOTHESES;

export async function ProductPreview() {
  const { t, locale } = await getI18n();
  const result = computeResult(EXAMPLE);
  const breakEven = computeBreakEven(EXAMPLE);
  const amount = (value: number) => formatAmount(value, EXAMPLE.currency, locale);

  return (
    <section className="border-y border-border px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-h2-mobile font-semibold md:text-h2">{t.landing.previewTitle}</h2>
        <p className="mt-4 text-body text-text-secondary">
          {t.landing.previewExample(
            amount(EXAMPLE.price),
            EXAMPLE.volume.toLocaleString(numberLocale(locale)),
            amount(EXAMPLE.variableCostPerUnit),
            amount(EXAMPLE.fixedCosts),
          )}
        </p>
      </div>
      <div className="mt-12">
        <StepResults
          result={result}
          breakEven={breakEven}
          headingAs="h3"
          downside={computeResult(applyDelta(EXAMPLE, { volume: -20 }))}
        />
      </div>
      <p className="mt-6 text-center text-micro text-text-secondary">{t.landing.previewNote}</p>
    </section>
  );
}
