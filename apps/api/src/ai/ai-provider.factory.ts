import { Logger } from "@nestjs/common";
import { FallbackAiProvider } from "./fallback-ai.provider.js";
import { GeminiBackend } from "./gemini.backend.js";
import { KeyPool } from "./key-pool.js";
import type { LlmBackend } from "./llm-backend.js";
import { OpenAiCompatibleBackend } from "./openai-compatible.backend.js";

export function createAiProvider(env: NodeJS.ProcessEnv = process.env): FallbackAiProvider {
  // `||` rather than `??`: an empty *_MODEL variable in .env must fall back to the default.
  const candidates: LlmBackend[] = [
    new GeminiBackend(KeyPool.fromEnv("GEMINI_API_KEY", env), env.GEMINI_MODEL || "gemini-2.5-flash"),
    new OpenAiCompatibleBackend(
      { name: "groq", baseUrl: "https://api.groq.com/openai/v1", model: env.GROQ_MODEL || "llama-3.3-70b-versatile" },
      KeyPool.fromEnv("GROQ_API_KEY", env),
    ),
    new OpenAiCompatibleBackend(
      { name: "mistral", baseUrl: "https://api.mistral.ai/v1", model: env.MISTRAL_MODEL || "mistral-small-latest" },
      KeyPool.fromEnv("MISTRAL_API_KEY", env),
    ),
  ];

  const backends = candidates.filter((backend) => backend.pool.size > 0);
  if (backends.length === 0) {
    new Logger("AiModule").warn("Aucune cle IA configuree : les suggestions IA sont desactivees");
  }

  return new FallbackAiProvider(backends);
}
