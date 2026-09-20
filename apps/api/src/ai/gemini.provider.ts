import { Injectable, Logger } from "@nestjs/common";
import { GoogleGenAI, Type } from "@google/genai";
import type { BusinessModel } from "@prisma/client";
import type { CurrencyCode } from "financial-engine";
import type { AiProvider, AiSuggestionInput, SuggestedHypotheses } from "./ai-provider.port.js";

const REQUEST_TIMEOUT_MS = 8_000;

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

function buildPrompt(input: AiSuggestionInput): string {
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
    "Reponds uniquement avec les 4 nombres, tous des entiers positifs ou nuls dans l'unite demandee.",
  ].join("\n");
}

function isValidAmount(value: unknown, min: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min;
}

function parseSuggestedHypotheses(text: string | undefined): SuggestedHypotheses | null {
  if (!text) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;

  const { price, volume, variableCostPerUnit, fixedCosts } = parsed as Record<string, unknown>;

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

@Injectable()
export class GeminiProvider implements AiProvider {
  private readonly logger = new Logger(GeminiProvider.name);
  private readonly client: GoogleGenAI;
  private readonly modelName = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

  constructor() {
    this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  async suggestHypotheses(input: AiSuggestionInput): Promise<SuggestedHypotheses | null> {
    try {
      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents: buildPrompt(input),
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              price: { type: Type.INTEGER },
              volume: { type: Type.INTEGER },
              variableCostPerUnit: { type: Type.INTEGER },
              fixedCosts: { type: Type.INTEGER },
            },
            required: ["price", "volume", "variableCostPerUnit", "fixedCosts"],
          },
          abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        },
      });

      return parseSuggestedHypotheses(response.text);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Suggestion Gemini indisponible : ${message}`);
      return null;
    }
  }
}
