import { createHash } from "node:crypto";
import type { BusinessModel } from "@prisma/client";
import type { CapitalNeed, SensitivityEntry, WatchPointCode } from "financial-engine";
import type { ReportSummaryFacts } from "../ai/ai-provider.port.js";
import type { Locale } from "../i18n/locale.js";

export function buildReportFacts(input: {
  locale: Locale;
  businessModel: BusinessModel;
  estimatedResult: number;
  breakEvenReachable: boolean;
  watchPoints: WatchPointCode[];
  sensitivity: SensitivityEntry[];
  capitalNeed: CapitalNeed | null;
  valueProposition: string | null;
  customerSegments: string | null;
}): ReportSummaryFacts {
  // Built in a fixed key order: factsHash relies on JSON.stringify being stable.
  return {
    locale: input.locale,
    businessModel: input.businessModel,
    holds: input.estimatedResult >= 0,
    breakEvenReachable: input.breakEvenReachable,
    watchPoints: [...input.watchPoints],
    mostSensitive: input.sensitivity.slice(0, 2).map((entry) => entry.key),
    financing: input.capitalNeed === null ? "unknown" : input.capitalNeed.financingGap > 0 ? "gap" : "covered",
    valueProposition: input.valueProposition,
    customerSegments: input.customerSegments,
  };
}

export function factsHash(facts: ReportSummaryFacts): string {
  return createHash("sha256").update(JSON.stringify(facts)).digest("hex");
}

// Fallback when the AI is unavailable: same facts, fixed sentences, no figures.
const TEMPLATE: Record<
  Locale,
  {
    holds: string;
    doesNotHold: string;
    weighs: (label: string) => string;
    gap: string;
    covered: string;
    disclaimer: string;
    sensitivity: Record<string, string>;
  }
> = {
  fr: {
    holds: "Avec tes hypothèses, ton idée dégage un résultat positif chaque mois : elle tient sur le papier.",
    doesNotHold: "Avec tes hypothèses, ton idée ne couvre pas encore ses coûts chaque mois : elle ne tient pas encore.",
    weighs: (label) => `Ce qui pèse le plus sur ton résultat, c'est ${label} : c'est la première chose à vérifier sur le terrain.`,
    gap: "Ton capital actuel ne suffit pas encore pour te lancer avec une réserve de sécurité.",
    covered: "Ton capital couvre le lancement et une réserve de sécurité.",
    disclaimer: "Ce rapport est une aide à la décision, pas une garantie de rentabilité.",
    sensitivity: {
      price: "ton prix de vente",
      volume: "ton volume de ventes",
      variableCostPerUnit: "ce que te coûte chaque unité",
      fixedCosts: "tes charges fixes",
    },
  },
  en: {
    holds: "With your assumptions, your idea makes a positive result every month: it holds up on paper.",
    doesNotHold: "With your assumptions, your idea doesn't cover its costs every month yet: it doesn't hold up yet.",
    weighs: (label) => `What weighs most on your result is ${label}: it's the first thing to check in the field.`,
    gap: "Your current capital isn't enough yet to launch with a safety reserve.",
    covered: "Your capital covers the launch and a safety reserve.",
    disclaimer: "This report is a decision aid, not a guarantee of profitability.",
    sensitivity: {
      price: "your selling price",
      volume: "your sales volume",
      variableCostPerUnit: "what each unit costs you",
      fixedCosts: "your fixed costs",
    },
  },
};

export function templateSummary(facts: ReportSummaryFacts): string {
  const copy = TEMPLATE[facts.locale];
  const sentences = [facts.holds ? copy.holds : copy.doesNotHold];
  if (facts.mostSensitive.length > 0) {
    sentences.push(copy.weighs(copy.sensitivity[facts.mostSensitive[0]]));
  }
  if (facts.financing === "gap") {
    sentences.push(copy.gap);
  } else if (facts.financing === "covered") {
    sentences.push(copy.covered);
  }
  sentences.push(copy.disclaimer);
  return sentences.join(" ");
}
