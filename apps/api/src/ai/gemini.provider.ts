import { Injectable, Logger } from "@nestjs/common";
import { GoogleGenAI, Type } from "@google/genai";
import type { AiProvider, AiSuggestionInput, SuggestedHypotheses, SuggestedCanvasBlocks } from "./ai-provider.port.js";
import { CANVAS_BLOCK_KEYS } from "./ai-provider.port.js";
import { buildCanvasPrompt, buildHypothesesPrompt, parseSuggestedCanvasBlocks, parseSuggestedHypotheses } from "./ai-prompts.js";

const REQUEST_TIMEOUT_MS = 8_000;

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
        contents: buildHypothesesPrompt(input),
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

  async suggestCanvasBlocks(input: AiSuggestionInput): Promise<SuggestedCanvasBlocks | null> {
    try {
      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents: buildCanvasPrompt(input),
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: Object.fromEntries(CANVAS_BLOCK_KEYS.map((key) => [key, { type: Type.STRING }])),
            required: [...CANVAS_BLOCK_KEYS],
          },
          abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        },
      });

      return parseSuggestedCanvasBlocks(response.text);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Suggestion canvas Gemini indisponible : ${message}`);
      return null;
    }
  }
}
