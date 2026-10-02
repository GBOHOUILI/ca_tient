import type { BusinessModel } from "@prisma/client";
import type { CurrencyCode } from "financial-engine";
import {
  CANVAS_BLOCK_KEYS,
  type AiSuggestionInput,
  type ReportSummaryFacts,
  type SuggestedCanvasBlocks,
  type SuggestedHypotheses,
} from "./ai-provider.port.js";

export interface JsonSchema {
  properties: Record<string, "integer" | "string">;
  required: readonly string[];
}

export const HYPOTHESES_JSON_SCHEMA: JsonSchema = {
  properties: { price: "integer", volume: "integer", variableCostPerUnit: "integer", fixedCosts: "integer" },
  required: ["price", "volume", "variableCostPerUnit", "fixedCosts"],
};

export const CANVAS_JSON_SCHEMA: JsonSchema = {
  properties: Object.fromEntries(CANVAS_BLOCK_KEYS.map((key) => [key, "string" as const])),
  required: CANVAS_BLOCK_KEYS,
};

export const MAX_SUMMARY_LENGTH = 1200;

export const REPORT_SUMMARY_JSON_SCHEMA: JsonSchema = {
  properties: { summary: "string" },
  required: ["summary"],
};

const BUSINESS_MODEL_LABELS: Record<BusinessModel, string> = {
  ECOMMERCE: "e-commerce",
  FORMATION: "formation en ligne",
  EBOOK: "e-book",
  SERVICE: "service",
  PRODUIT_PHYSIQUE: "produit physique",
  AUTRE: "autre",
};

const CURRENCY_UNIT_HINTS: Record<CurrencyCode, string> = {
  XOF: "le XOF n'a pas de sous-unité : exprime les montants en unités entières de XOF",
  EUR: "exprime les montants en centimes d'EUR (1 EUR = 100 centimes)",
  USD: "exprime les montants en cents USD (1 USD = 100 cents)",
  GBP: "exprime les montants en pence GBP (1 GBP = 100 pence)",
  NGN: "exprime les montants en kobo NGN (1 NGN = 100 kobo)",
  GHS: "exprime les montants en pesewas GHS (1 GHS = 100 pesewas)",
};

// Groq and Mistral only guarantee syntactically valid JSON (json_object mode), not a schema:
// the prompt itself must spell out the expected shape.
function jsonShape(schema: JsonSchema): string {
  const fields = Object.entries(schema.properties).map(
    ([key, type]) => `"${key}": ${type === "integer" ? "<entier>" : '"<texte>"'}`,
  );
  return `{${fields.join(", ")}}`;
}

export function buildHypothesesPrompt(input: AiSuggestionInput): string {
  return [
    "Tu aides à estimer les hypothèses financières d'une idée de business, pour un outil qui teste sa viabilité avant de se lancer.",
    `Modèle de business : ${BUSINESS_MODEL_LABELS[input.businessModel]}.`,
    `Description de l'idée, en langage libre : "${input.rawDescription}"`,
    `Devise cible : ${input.currency}. ${CURRENCY_UNIT_HINTS[input.currency]}.`,
    "Propose une estimation raisonnable et réaliste des 4 variables suivantes, même si la description est vague (fais une hypothèse plausible plutôt que de répondre zéro) :",
    "- price : prix de vente unitaire",
    "- volume : nombre de ventes estimées par mois",
    "- variableCostPerUnit : coût qui varie avec chaque vente (matière, commission, livraison...)",
    "- fixedCosts : coûts fixes mensuels, indépendants du volume vendu",
    `Réponds uniquement avec un objet JSON de la forme ${jsonShape(HYPOTHESES_JSON_SCHEMA)}, tous des entiers positifs ou nuls dans l'unité demandée.`,
  ].join("\n");
}

export function buildCanvasPrompt(input: AiSuggestionInput): string {
  return [
    "Tu aides à remplir un business model canvas (méthode Osterwalder) pour une idée de business, en français.",
    `Modèle de business : ${BUSINESS_MODEL_LABELS[input.businessModel]}.`,
    `Description de l'idée, en langage libre : "${input.rawDescription}"`,
    "Propose un texte court (1 à 2 phrases maximum, style note plutôt que paragraphe) pour chacun des 7 blocs suivants, même si la description est vague (fais une hypothèse plausible plutôt que de répondre par une phrase vide) :",
    "- valueProposition : la proposition de valeur, ce qui rend cette offre désirable",
    "- customerSegments : à qui s'adresse cette offre",
    "- channels : comment les clients découvrent et achètent l'offre",
    "- customerRelationships : comment la relation avec les clients est entretenue dans la durée",
    "- keyResources : les ressources indispensables pour opérer (matériel, compétences, stock...)",
    "- keyActivities : les activités clés du quotidien pour faire tourner ce business",
    "- keyPartners : les partenaires ou fournisseurs clés nécessaires",
    `Réponds uniquement avec un objet JSON de la forme ${jsonShape(CANVAS_JSON_SCHEMA)} : chaque texte en français correct, avec les accents, sans jargon, 500 caractères maximum.`,
  ].join("\n");
}

function parseJsonObject(text: string | undefined): Record<string, unknown> | null {
  if (!text) return null;

  // Some OpenAI-compatible models still wrap the object in a markdown fence in json_object mode.
  const unfenced = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  let parsed: unknown;
  try {
    parsed = JSON.parse(unfenced);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
  return parsed as Record<string, unknown>;
}

function isValidAmount(value: unknown, min: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min;
}

export function parseSuggestedHypotheses(text: string | undefined): SuggestedHypotheses | null {
  const record = parseJsonObject(text);
  if (!record) return null;

  const { price, volume, variableCostPerUnit, fixedCosts } = record;

  if (
    !isValidAmount(price, 1) ||
    !isValidAmount(volume, 0) ||
    !isValidAmount(variableCostPerUnit, 0) ||
    !isValidAmount(fixedCosts, 0)
  ) {
    return null;
  }

  return { price, volume, variableCostPerUnit, fixedCosts };
}

export function parseSuggestedCanvasBlocks(text: string | undefined): SuggestedCanvasBlocks | null {
  const record = parseJsonObject(text);
  if (!record) return null;

  const result = {} as SuggestedCanvasBlocks;

  for (const key of CANVAS_BLOCK_KEYS) {
    const value = record[key];
    if (typeof value !== "string" || value.trim().length === 0 || value.length > 500) return null;
    result[key] = value.trim();
  }

  return result;
}

const WATCH_POINT_FACTS: Record<string, string> = {
  non_positive_unit_margin: "chaque vente coûte autant ou plus qu'elle ne rapporte",
  below_break_even: "le volume de ventes prévu est sous le seuil de rentabilité",
  thin_gross_margin: "la marge sur chaque vente est faible",
  prudent_scenario_loss: "dans un scénario prudent, l'idée perdrait de l'argent",
  financing_gap: "le capital disponible ne couvre pas le lancement et la réserve de sécurité",
  no_cash_reserve: "le capital disponible ne couvre même pas les dépenses de départ",
};

const SENSITIVITY_FACTS: Record<string, string> = {
  price: "le prix de vente",
  volume: "le volume de ventes",
  variableCostPerUnit: "le coût de chaque unité",
  fixedCosts: "les charges fixes",
};

const FINANCING_FACTS: Record<ReportSummaryFacts["financing"], string> = {
  gap: "il manque du capital pour se lancer",
  covered: "le capital disponible couvre le lancement et une réserve de sécurité",
  unknown: "le capital n'a pas encore été renseigné",
};

export function buildReportSummaryPrompt(facts: ReportSummaryFacts): string {
  const points = facts.watchPoints.map((code) => WATCH_POINT_FACTS[code]).filter(Boolean);
  return [
    "Tu rédiges la synthèse d'un rapport qui teste la viabilité d'une idée de business, pour un entrepreneur sans bagage financier.",
    `Modèle de business : ${BUSINESS_MODEL_LABELS[facts.businessModel]}.`,
    facts.valueProposition ? `Proposition de valeur : "${facts.valueProposition}"` : "",
    facts.customerSegments ? `Clients visés : "${facts.customerSegments}"` : "",
    `Verdict du calcul : ${facts.holds ? "l'idée dégage un résultat positif chaque mois" : "l'idée ne couvre pas encore ses coûts chaque mois"}.`,
    `Seuil de rentabilité : ${facts.breakEvenReachable ? "atteignable" : "inatteignable tant que le prix ne dépasse pas le coût de chaque unité"}.`,
    points.length > 0 ? `Points à surveiller : ${points.join(" ; ")}.` : "Aucun point d'alerte particulier.",
    `Variables qui pèsent le plus sur le résultat : ${facts.mostSensitive.map((key) => SENSITIVITY_FACTS[key]).join(", ")}.`,
    `Capital : ${FINANCING_FACTS[facts.financing]}.`,
    "Écris 3 à 5 phrases simples, en tutoyant, sans jargon, en français correct, avec les accents. N'écris aucun chiffre ni montant ni pourcentage. Ne promets jamais la rentabilité : c'est une aide à la décision.",
    `Réponds uniquement avec un objet JSON de la forme ${jsonShape(REPORT_SUMMARY_JSON_SCHEMA)}.`,
  ]
    .filter((line) => line.length > 0)
    .join("\n");
}

// Rule CLAUDE.md #3: no figure may come from the AI, so any digit rejects the answer.
export function parseReportSummary(text: string | undefined): string | null {
  const record = parseJsonObject(text);
  const summary = record?.summary;
  if (typeof summary !== "string") return null;
  const trimmed = summary.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_SUMMARY_LENGTH || /\d/.test(trimmed)) return null;
  return trimmed;
}
