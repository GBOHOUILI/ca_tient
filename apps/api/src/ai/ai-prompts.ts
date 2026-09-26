import type { BusinessModel } from "@prisma/client";
import type { CurrencyCode } from "financial-engine";
import {
  CANVAS_BLOCK_KEYS,
  type AiSuggestionInput,
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
