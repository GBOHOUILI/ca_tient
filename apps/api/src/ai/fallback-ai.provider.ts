import { Logger } from "@nestjs/common";
import type { AiProvider, AiSuggestionInput, SuggestedCanvasBlocks, SuggestedHypotheses } from "./ai-provider.port.js";
import {
  buildCanvasPrompt,
  buildHypothesesPrompt,
  CANVAS_JSON_SCHEMA,
  HYPOTHESES_JSON_SCHEMA,
  parseSuggestedCanvasBlocks,
  parseSuggestedHypotheses,
  type JsonSchema,
} from "./ai-prompts.js";
import type { Clock } from "./key-pool.js";
import { LlmError, type LlmBackend } from "./llm-backend.js";

export const TOTAL_BUDGET_MS = 15_000;
export const ATTEMPT_TIMEOUT_MS = 8_000;
export const DEFAULT_RATE_LIMIT_PAUSE_MS = 60_000;

interface SuggestionTask<T> {
  label: string;
  prompt: string;
  schema: JsonSchema;
  parse: (text: string) => T | null;
}

type AttemptOutcome<T> = { kind: "success"; value: T } | { kind: "next-key" } | { kind: "next-backend" };

export class FallbackAiProvider implements AiProvider {
  private readonly logger = new Logger(FallbackAiProvider.name);

  constructor(
    readonly backends: readonly LlmBackend[],
    private readonly now: Clock = Date.now,
  ) {}

  suggestHypotheses(input: AiSuggestionInput): Promise<SuggestedHypotheses | null> {
    return this.run({
      label: "hypotheses",
      prompt: buildHypothesesPrompt(input),
      schema: HYPOTHESES_JSON_SCHEMA,
      parse: parseSuggestedHypotheses,
    });
  }

  suggestCanvasBlocks(input: AiSuggestionInput): Promise<SuggestedCanvasBlocks | null> {
    return this.run({
      label: "canvas",
      prompt: buildCanvasPrompt(input),
      schema: CANVAS_JSON_SCHEMA,
      parse: parseSuggestedCanvasBlocks,
    });
  }

  private async run<T>(task: SuggestionTask<T>): Promise<T | null> {
    const deadline = this.now() + TOTAL_BUDGET_MS;

    for (const backend of this.backends) {
      for (const { index, key } of backend.pool.available()) {
        const remaining = deadline - this.now();
        if (remaining <= 0) {
          this.logger.warn(`Suggestion ${task.label} : budget de ${TOTAL_BUDGET_MS} ms epuise`);
          return null;
        }

        const outcome = await this.attempt(backend, index, key, task, Math.min(ATTEMPT_TIMEOUT_MS, remaining));
        if (outcome.kind === "success") return outcome.value;
        if (outcome.kind === "next-backend") break;
      }
    }

    this.logger.warn(`Suggestion ${task.label} : aucun provider IA n'a repondu`);
    return null;
  }

  private async attempt<T>(
    backend: LlmBackend,
    index: number,
    key: string,
    task: SuggestionTask<T>,
    timeoutMs: number,
  ): Promise<AttemptOutcome<T>> {
    const keyLabel = `${backend.name} cle #${index + 1}`;

    try {
      const text = await backend.generateJson({
        prompt: task.prompt,
        schema: task.schema,
        apiKey: key,
        signal: AbortSignal.timeout(timeoutMs),
      });

      const value = task.parse(text);
      if (value === null) {
        this.logger.warn(`Suggestion ${task.label} : reponse invalide de ${keyLabel}`);
        return { kind: "next-backend" };
      }
      return { kind: "success", value };
    } catch (error) {
      const llmError = error instanceof LlmError ? error : new LlmError("unavailable", String(error));

      if (llmError.kind === "rate_limited") {
        const pauseMs = llmError.retryAfterMs ?? DEFAULT_RATE_LIMIT_PAUSE_MS;
        backend.pool.pause(index, pauseMs);
        this.logger.warn(`Suggestion ${task.label} : ${keyLabel} en pause ${pauseMs} ms (quota)`);
        return { kind: "next-key" };
      }
      if (llmError.kind === "unauthorized") {
        backend.pool.disable(index);
        this.logger.warn(`Suggestion ${task.label} : ${keyLabel} desactivee (cle refusee)`);
        return { kind: "next-key" };
      }

      this.logger.warn(`Suggestion ${task.label} : ${keyLabel} indisponible (${llmError.message})`);
      return { kind: "next-backend" };
    }
  }
}
