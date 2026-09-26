import type { KeyPool } from "./key-pool.js";
import { LlmError, type LlmBackend, type LlmRequest } from "./llm-backend.js";

export interface OpenAiCompatibleConfig {
  name: string;
  baseUrl: string;
  model: string;
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  // The HTTP-date form is ignored: the caller then falls back to its default pause.
  return Number.isFinite(seconds) && seconds >= 0 ? Math.ceil(seconds * 1000) : undefined;
}

export class OpenAiCompatibleBackend implements LlmBackend {
  readonly name: string;

  constructor(
    private readonly config: OpenAiCompatibleConfig,
    readonly pool: KeyPool,
  ) {
    this.name = config.name;
  }

  async generateJson({ prompt, apiKey, signal }: LlmRequest): Promise<string> {
    let response: Response;
    try {
      response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: this.config.model,
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.3,
        }),
        signal,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new LlmError("unavailable", `${this.name}: ${message}`);
    }

    if (response.status === 429) {
      throw new LlmError("rate_limited", `${this.name}: HTTP 429`, parseRetryAfter(response.headers.get("retry-after")));
    }
    if (response.status === 401 || response.status === 403) {
      throw new LlmError("unauthorized", `${this.name}: HTTP ${response.status}`);
    }
    if (!response.ok) {
      throw new LlmError("unavailable", `${this.name}: HTTP ${response.status}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new LlmError("unavailable", `${this.name}: corps de reponse illisible`);
    }

    const content = (data as { choices?: { message?: { content?: unknown } }[] }).choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.length === 0) {
      throw new LlmError("unavailable", `${this.name}: reponse vide`);
    }

    return content;
  }
}
