import { GoogleGenAI, Type } from "@google/genai";
import type { KeyPool } from "./key-pool.js";
import { LlmError, type LlmBackend, type LlmRequest } from "./llm-backend.js";

const SCHEMA_TYPES = { integer: Type.INTEGER, string: Type.STRING } as const;

function toLlmError(error: unknown): LlmError {
  if (error instanceof LlmError) return error;

  const message = error instanceof Error ? error.message : String(error);
  const status =
    typeof error === "object" && error !== null && "status" in error ? (error as { status: unknown }).status : undefined;

  if (status === 429) {
    const match = /retry in (\d+(?:\.\d+)?)s/i.exec(message);
    return new LlmError("rate_limited", `gemini: ${message}`, match ? Math.ceil(parseFloat(match[1]) * 1000) : undefined);
  }
  // Gemini answers an invalid or expired key with 400 INVALID_ARGUMENT/API_KEY_INVALID rather than 401.
  if (status === 401 || status === 403 || (status === 400 && /API_KEY_INVALID|api key (not valid|expired)/i.test(message))) {
    return new LlmError("unauthorized", `gemini: ${message}`);
  }
  return new LlmError("unavailable", `gemini: ${message}`);
}

export class GeminiBackend implements LlmBackend {
  readonly name = "gemini";
  private readonly clients = new Map<string, GoogleGenAI>();

  constructor(
    readonly pool: KeyPool,
    private readonly model: string,
  ) {}

  async generateJson({ prompt, schema, apiKey, signal }: LlmRequest): Promise<string> {
    try {
      const response = await this.client(apiKey).models.generateContent({
        model: this.model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: Object.fromEntries(
              Object.entries(schema.properties).map(([key, type]) => [key, { type: SCHEMA_TYPES[type] }]),
            ),
            required: [...schema.required],
          },
          abortSignal: signal,
        },
      });

      if (!response.text) {
        throw new LlmError("unavailable", "gemini: reponse vide");
      }
      return response.text;
    } catch (error) {
      throw toLlmError(error);
    }
  }

  private client(apiKey: string): GoogleGenAI {
    let client = this.clients.get(apiKey);
    if (!client) {
      client = new GoogleGenAI({ apiKey });
      this.clients.set(apiKey, client);
    }
    return client;
  }
}
