import { Logger } from "@nestjs/common";
import { FallbackAiProvider } from "./fallback-ai.provider.js";
import { GeminiBackend } from "./gemini.backend.js";
import { KeyPool } from "./key-pool.js";
import type { LlmBackend } from "./llm-backend.js";
import { OpenAiCompatibleBackend } from "./openai-compatible.backend.js";

// Defaults when no *_MODEL variable is set. Providers retire models (Groq dropped llama-3.3-70b
// for free tiers on 2026-08-16; Gemini 2.5 is closed to new accounts since 2026-09-18): override
// with GEMINI_MODEL / GROQ_MODEL / MISTRAL_MODEL without a code change.
export const DEFAULT_AI_MODELS = {
  gemini: "gemini-3.5-flash-lite",
  groq: "openai/gpt-oss-120b",
  mistral: "mistral-small-latest",
} as const;

export function createAiProvider(env: NodeJS.ProcessEnv = process.env): FallbackAiProvider {
  // `||` rather than `??`: an empty *_MODEL variable in .env must fall back to the default.
  const candidates: LlmBackend[] = [
    new GeminiBackend(KeyPool.fromEnv("GEMINI_API_KEY", env), env.GEMINI_MODEL || DEFAULT_AI_MODELS.gemini),
    new OpenAiCompatibleBackend(
      { name: "groq", baseUrl: "https://api.groq.com/openai/v1", model: env.GROQ_MODEL || DEFAULT_AI_MODELS.groq },
      KeyPool.fromEnv("GROQ_API_KEY", env),
    ),
    new OpenAiCompatibleBackend(
      { name: "mistral", baseUrl: "https://api.mistral.ai/v1", model: env.MISTRAL_MODEL || DEFAULT_AI_MODELS.mistral },
      KeyPool.fromEnv("MISTRAL_API_KEY", env),
    ),
  ];

  const backends = candidates.filter((backend) => backend.pool.size > 0);
  if (backends.length === 0) {
    new Logger("AiModule").warn("Aucune cle IA configuree : les suggestions IA sont desactivees");
  }

  return new FallbackAiProvider(backends);
}
