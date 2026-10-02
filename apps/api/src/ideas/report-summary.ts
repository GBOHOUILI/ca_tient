import { createHash } from "node:crypto";
import type { BusinessModel } from "@prisma/client";
import type { CapitalNeed, SensitivityEntry, WatchPointCode } from "financial-engine";
import type { ReportSummaryFacts } from "../ai/ai-provider.port.js";

const SENSITIVITY_LABELS: Record<string, string> = {
  price: "ton prix de vente",
  volume: "ton volume de ventes",
  variableCostPerUnit: "ce que te coute chaque unite",
  fixedCosts: "tes charges fixes",
};

export function buildReportFacts(input: {
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

export function templateSummary(facts: ReportSummaryFacts): string {
  const sentences = [
    facts.holds
      ? "Avec tes hypotheses, ton idee degage un resultat positif chaque mois : elle tient sur le papier."
      : "Avec tes hypotheses, ton idee ne couvre pas encore ses couts chaque mois : elle ne tient pas encore.",
  ];
  if (facts.mostSensitive.length > 0) {
    sentences.push(
      `Ce qui pese le plus sur ton resultat, c'est ${SENSITIVITY_LABELS[facts.mostSensitive[0]]} : c'est la premiere chose a verifier sur le terrain.`,
    );
  }
  if (facts.financing === "gap") {
    sentences.push("Ton capital actuel ne suffit pas encore pour te lancer avec une reserve de securite.");
  } else if (facts.financing === "covered") {
    sentences.push("Ton capital couvre le lancement et une reserve de securite.");
  }
  sentences.push("Ce rapport est une aide a la decision, pas une garantie de rentabilite.");
  return sentences.join(" ");
}
