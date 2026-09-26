import type { JsonSchema } from "./ai-prompts.js";
import type { KeyPool } from "./key-pool.js";

export interface LlmRequest {
  prompt: string;
  schema: JsonSchema;
  apiKey: string;
  signal: AbortSignal;
}

export interface LlmBackend {
  readonly name: string;
  readonly pool: KeyPool;
  /** Returns the raw JSON text produced by the model, or throws an LlmError. */
  generateJson(request: LlmRequest): Promise<string>;
}

export type LlmErrorKind = "rate_limited" | "unauthorized" | "unavailable";

export class LlmError extends Error {
  constructor(
    readonly kind: LlmErrorKind,
    message: string,
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = "LlmError";
  }
}
