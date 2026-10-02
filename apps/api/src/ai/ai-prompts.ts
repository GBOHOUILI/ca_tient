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
  XOF: "le XOF n'a pas de sous-unite : exprime les montants en unites entieres de XOF",
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
    "Tu aides a estimer les hypotheses financieres d'une idee de business, pour un outil qui teste sa viabilite avant de se lancer.",
    `Modele de business : ${BUSINESS_MODEL_LABELS[input.businessModel]}.`,
    `Description de l'idee, en langage libre : "${input.rawDescription}"`,
    `Devise cible : ${input.currency}. ${CURRENCY_UNIT_HINTS[input.currency]}.`,
    "Propose une estimation raisonnable et realiste des 4 variables suivantes, meme si la description est vague (fais une hypothese plausible plutot que de repondre zero) :",
    "- price : prix de vente unitaire",
    "- volume : nombre de ventes estimees par mois",
    "- variableCostPerUnit : cout qui varie avec chaque vente (matiere, commission, livraison...)",
    "- fixedCosts : couts fixes mensuels, independants du volume vendu",
    `Reponds uniquement avec un objet JSON de la forme ${jsonShape(HYPOTHESES_JSON_SCHEMA)}, tous des entiers positifs ou nuls dans l'unite demandee.`,
  ].join("\n");
}

export function buildCanvasPrompt(input: AiSuggestionInput): string {
  return [
    "Tu aides a remplir un business model canvas (methode Osterwalder) pour une idee de business, en francais.",
    `Modele de business : ${BUSINESS_MODEL_LABELS[input.businessModel]}.`,
    `Description de l'idee, en langage libre : "${input.rawDescription}"`,
    "Propose un texte court (1 a 2 phrases maximum, style note plutot que paragraphe) pour chacun des 7 blocs suivants, meme si la description est vague (fais une hypothese plausible plutot que de repondre par une phrase vide) :",
    "- valueProposition : la proposition de valeur, ce qui rend cette offre desirable",
    "- customerSegments : a qui s'adresse cette offre",
    "- channels : comment les clients decouvrent et achetent l'offre",
    "- customerRelationships : comment la relation avec les clients est entretenue dans la duree",
    "- keyResources : les ressources indispensables pour operer (materiel, competences, stock...)",
    "- keyActivities : les activites cles du quotidien pour faire tourner ce business",
    "- keyPartners : les partenaires ou fournisseurs cles necessaires",
    `Reponds uniquement avec un objet JSON de la forme ${jsonShape(CANVAS_JSON_SCHEMA)} : chaque texte en francais, sans jargon, 500 caracteres maximum.`,
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
  non_positive_unit_margin: "chaque vente coute autant ou plus qu'elle ne rapporte",
  below_break_even: "le volume de ventes prevu est sous le seuil de rentabilite",
  thin_gross_margin: "la marge sur chaque vente est faible",
  prudent_scenario_loss: "dans un scenario prudent, l'idee perdrait de l'argent",
  financing_gap: "le capital disponible ne couvre pas le lancement et la reserve de securite",
  no_cash_reserve: "le capital disponible ne couvre meme pas les depenses de depart",
};

const SENSITIVITY_FACTS: Record<string, string> = {
  price: "le prix de vente",
  volume: "le volume de ventes",
  variableCostPerUnit: "le cout de chaque unite",
  fixedCosts: "les charges fixes",
};

const FINANCING_FACTS: Record<ReportSummaryFacts["financing"], string> = {
  gap: "il manque du capital pour se lancer",
  covered: "le capital disponible couvre le lancement et une reserve de securite",
  unknown: "le capital n'a pas encore ete renseigne",
};

export function buildReportSummaryPrompt(facts: ReportSummaryFacts): string {
  const points = facts.watchPoints.map((code) => WATCH_POINT_FACTS[code]).filter(Boolean);
  return [
    "Tu rediges la synthese d'un rapport qui teste la viabilite d'une idee de business, pour un entrepreneur sans bagage financier.",
    `Modele de business : ${BUSINESS_MODEL_LABELS[facts.businessModel]}.`,
    facts.valueProposition ? `Proposition de valeur : "${facts.valueProposition}"` : "",
    facts.customerSegments ? `Clients vises : "${facts.customerSegments}"` : "",
    `Verdict du calcul : ${facts.holds ? "l'idee degage un resultat positif chaque mois" : "l'idee ne couvre pas encore ses couts chaque mois"}.`,
    `Seuil de rentabilite : ${facts.breakEvenReachable ? "atteignable" : "inatteignable tant que le prix ne depasse pas le cout de chaque unite"}.`,
    points.length > 0 ? `Points a surveiller : ${points.join(" ; ")}.` : "Aucun point d'alerte particulier.",
    `Variables qui pesent le plus sur le resultat : ${facts.mostSensitive.map((key) => SENSITIVITY_FACTS[key]).join(", ")}.`,
    `Capital : ${FINANCING_FACTS[facts.financing]}.`,
    "Ecris 3 a 5 phrases simples, en tutoyant, sans jargon. N'ecris aucun chiffre ni montant ni pourcentage. Ne promets jamais la rentabilite : c'est une aide a la decision.",
    `Reponds uniquement avec un objet JSON de la forme ${jsonShape(REPORT_SUMMARY_JSON_SCHEMA)}.`,
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
