# Rotation de clés et de providers IA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le provider Gemini mono-clé par une chaîne Gemini → Groq → Mistral, chacun avec un pool de clés en rotation, sous un budget de 15 s par suggestion.

**Architecture:** Le contrat `AiProvider` (`suggestHypotheses`, `suggestCanvasBlocks`) et `AiController` ne changent pas. `AI_PROVIDER` devient un `FallbackAiProvider` qui construit prompt + parseur par tâche (`ai-prompts.ts`) et parcourt des `LlmBackend` (Gemini via `@google/genai`, Groq/Mistral via un adaptateur `fetch` OpenAI-compatible), chacun avec son `KeyPool` en mémoire.

**Tech Stack:** NestJS 11, TypeScript ESM (imports relatifs en `.js`), vitest 4, `@google/genai` 2.23, `fetch` natif (Node 24).

**Spec:** `docs/superpowers/specs/2026-09-26-ia-rotation-providers-design.md`

## Global Constraints

- Chaîne fixe **Gemini → Groq → Mistral** ; un provider sans aucune clé est ignoré.
- Budget : **15 000 ms au total** par suggestion, **6 000 ms max par tentative** (`min(6000, temps restant)`).
- 429 → clé en pause (`Retry-After` / « retry in Xs », sinon **60 000 ms**), clé suivante. 401/403 (et 400 « API key not valid » chez Gemini) → clé désactivée jusqu'au redémarrage, clé suivante. Timeout / 5xx / réseau / JSON invalide → provider suivant. Pas de retry avec backoff.
- Variables d'env : `<PREFIX>`, puis `<PREFIX>_2` … `<PREFIX>_10` pour `GEMINI_API_KEY`, `GROQ_API_KEY`, `MISTRAL_API_KEY`. Modèles : `GEMINI_MODEL` (défaut `gemini-2.5-flash`), `GROQ_MODEL` (défaut `llama-3.3-70b-versatile`), `MISTRAL_MODEL` (défaut `mistral-small-latest`).
- URLs : Groq `https://api.groq.com/openai/v1`, Mistral `https://api.mistral.ai/v1`, endpoint `POST /chat/completions`, `response_format: { type: "json_object" }`, `temperature: 0.3`.
- **Aucune nouvelle dépendance.**
- Ne jamais logger une clé API ni la description utilisateur ; les logs désignent une clé par `#<index+1>`.
- Messages de log en français sans accents (style du code existant) ; commentaires de code en anglais, uniquement sur les décisions non évidentes.
- `AiController`, `ai-provider.port.ts` et `ai.controller.spec.ts` ne sont pas modifiés.
- Commits : conventional commits en français, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Tous les chemins et commandes sont relatifs à la racine du worktree `.worktrees/feature-ia-rotation-providers`. Tests API : `pnpm --filter api exec vitest run <fichier>`.

## Review Focus

- Un modèle OpenAI-compatible renvoie le JSON dans un bloc markdown (` ```json … ``` `) : la suggestion doit quand même être acceptée → test dans Task 1 (`parseSuggestedHypotheses` / `parseSuggestedCanvasBlocks` avec bloc délimité).
- La même clé est copiée deux fois dans l'env (`GEMINI_API_KEY` = `GEMINI_API_KEY_2`) : elle ne doit pas être réessayée juste après un 429 → test de dédoublonnage dans Task 2.
- `Retry-After` fourni sous forme de date HTTP (pas en secondes) : pas de crash, pause par défaut de 60 s → test dans Task 3.
- Le timeout de tentative déclenche l'abort de `fetch` (`DOMException` `TimeoutError`) : doit être classé `unavailable` (provider suivant), pas remonter en 500 → test dans Task 3.
- Une clé mise en pause par une requête doit être sautée par la requête **suivante** (état partagé entre appels) sans être appelée → test dans Task 5.

---

### Task 1: Prompts et parseurs partagés (`ai-prompts.ts`)

Extrait de `gemini.provider.ts` tout ce qui ne dépend pas du réseau, ajoute la forme JSON explicite en fin de prompt (nécessaire à Groq/Mistral) et la tolérance aux blocs markdown.

**Files:**
- Create: `apps/api/src/ai/ai-prompts.ts`
- Create: `apps/api/src/ai/ai-prompts.spec.ts`
- Modify: `apps/api/src/ai/gemini.provider.ts` (supprime les fonctions dupliquées, importe depuis `ai-prompts.ts` ; le fichier sera supprimé en Task 6)

**Interfaces:**
- Consumes: `AiSuggestionInput`, `SuggestedHypotheses`, `SuggestedCanvasBlocks`, `CANVAS_BLOCK_KEYS` de `./ai-provider.port.js`.
- Produces:
  - `interface JsonSchema { properties: Record<string, "integer" | "string">; required: readonly string[] }`
  - `const HYPOTHESES_JSON_SCHEMA: JsonSchema`, `const CANVAS_JSON_SCHEMA: JsonSchema`
  - `buildHypothesesPrompt(input: AiSuggestionInput): string`
  - `buildCanvasPrompt(input: AiSuggestionInput): string`
  - `parseSuggestedHypotheses(text: string | undefined): SuggestedHypotheses | null`
  - `parseSuggestedCanvasBlocks(text: string | undefined): SuggestedCanvasBlocks | null`

- [ ] **Step 1: Écrire les tests qui échouent**

`apps/api/src/ai/ai-prompts.spec.ts` :

```ts
import { describe, expect, it } from "vitest";
import { CANVAS_BLOCK_KEYS } from "./ai-provider.port.js";
import {
  buildCanvasPrompt,
  buildHypothesesPrompt,
  parseSuggestedCanvasBlocks,
  parseSuggestedHypotheses,
} from "./ai-prompts.js";

function input() {
  return {
    businessModel: "ECOMMERCE" as const,
    rawDescription: "Vente de vetements en ligne pour jeunes actifs.",
    currency: "XOF" as const,
  };
}

function validCanvasBlocks() {
  return {
    valueProposition: "Des vetements tendance livres en 24h.",
    customerSegments: "Jeunes actifs urbains.",
    channels: "Instagram et WhatsApp.",
    customerRelationships: "Suivi WhatsApp apres achat.",
    keyResources: "Stock et telephone.",
    keyActivities: "Sourcing et livraison.",
    keyPartners: "Grossistes et livreurs moto.",
  };
}

describe("buildHypothesesPrompt", () => {
  it("includes the description and the expected JSON shape", () => {
    const prompt = buildHypothesesPrompt(input());

    expect(prompt).toContain("Vente de vetements en ligne pour jeunes actifs.");
    expect(prompt).toContain('{"price": <entier>, "volume": <entier>, "variableCostPerUnit": <entier>, "fixedCosts": <entier>}');
  });
});

describe("buildCanvasPrompt", () => {
  it("lists every canvas block key in the expected JSON shape", () => {
    const prompt = buildCanvasPrompt(input());

    for (const key of CANVAS_BLOCK_KEYS) {
      expect(prompt).toContain(`"${key}": "<texte>"`);
    }
  });
});

describe("parseSuggestedHypotheses", () => {
  const valid = { price: 5000, volume: 50, variableCostPerUnit: 2000, fixedCosts: 100000 };

  it("parses a valid JSON object", () => {
    expect(parseSuggestedHypotheses(JSON.stringify(valid))).toEqual(valid);
  });

  it("parses JSON wrapped in a markdown fence", () => {
    expect(parseSuggestedHypotheses("```json\n" + JSON.stringify(valid) + "\n```")).toEqual(valid);
  });

  it("returns null for invalid JSON", () => {
    expect(parseSuggestedHypotheses("ceci n'est pas du JSON")).toBeNull();
  });

  it("returns null for an empty response", () => {
    expect(parseSuggestedHypotheses(undefined)).toBeNull();
  });

  it("returns null when price is below 1", () => {
    expect(parseSuggestedHypotheses(JSON.stringify({ ...valid, price: 0 }))).toBeNull();
  });

  it("returns null when a value is not an integer", () => {
    expect(parseSuggestedHypotheses(JSON.stringify({ ...valid, volume: 12.5 }))).toBeNull();
  });

  it("returns null when a value is missing", () => {
    const { fixedCosts: _fixedCosts, ...incomplete } = valid;
    expect(parseSuggestedHypotheses(JSON.stringify(incomplete))).toBeNull();
  });

  it("returns null for a JSON array", () => {
    expect(parseSuggestedHypotheses(JSON.stringify([valid]))).toBeNull();
  });
});

describe("parseSuggestedCanvasBlocks", () => {
  it("parses and trims a valid JSON object", () => {
    const blocks = { ...validCanvasBlocks(), channels: "  Instagram et WhatsApp.  " };

    expect(parseSuggestedCanvasBlocks(JSON.stringify(blocks))).toEqual(validCanvasBlocks());
  });

  it("parses JSON wrapped in a markdown fence", () => {
    expect(parseSuggestedCanvasBlocks("```\n" + JSON.stringify(validCanvasBlocks()) + "\n```")).toEqual(
      validCanvasBlocks(),
    );
  });

  it("returns null when a block is missing", () => {
    const { keyPartners: _keyPartners, ...incomplete } = validCanvasBlocks();
    expect(parseSuggestedCanvasBlocks(JSON.stringify(incomplete))).toBeNull();
  });

  it("returns null when a block is blank", () => {
    expect(parseSuggestedCanvasBlocks(JSON.stringify({ ...validCanvasBlocks(), channels: "   " }))).toBeNull();
  });

  it("returns null when a block exceeds 500 characters", () => {
    expect(parseSuggestedCanvasBlocks(JSON.stringify({ ...validCanvasBlocks(), channels: "a".repeat(501) }))).toBeNull();
  });
});
```

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `pnpm --filter api exec vitest run src/ai/ai-prompts.spec.ts`
Expected: FAIL — `Failed to resolve import "./ai-prompts.js"`.

- [ ] **Step 3: Créer `ai-prompts.ts`**

`apps/api/src/ai/ai-prompts.ts` :

```ts
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
```

- [ ] **Step 4: Brancher `gemini.provider.ts` sur `ai-prompts.ts`**

Dans `apps/api/src/ai/gemini.provider.ts` :
1. Supprimer `BUSINESS_MODEL_LABELS`, `CURRENCY_UNIT_HINTS`, `buildPrompt`, `isValidAmount`, `parseSuggestedHypotheses`, `buildCanvasPrompt`, `parseSuggestedCanvasBlocks` et les imports devenus inutiles (`BusinessModel`, `CurrencyCode`).
2. Ajouter : `import { buildCanvasPrompt, buildHypothesesPrompt, parseSuggestedCanvasBlocks, parseSuggestedHypotheses } from "./ai-prompts.js";`
3. Dans `suggestHypotheses`, remplacer `contents: buildPrompt(input)` par `contents: buildHypothesesPrompt(input)`.

Le reste de la classe `GeminiProvider` est inchangé.

- [ ] **Step 5: Lancer les tests IA et vérifier qu'ils passent**

Run: `pnpm --filter api exec vitest run src/ai`
Expected: PASS — `ai-prompts.spec.ts` (15 tests), `gemini.provider.spec.ts` et `ai.controller.spec.ts` toujours verts.

- [ ] **Step 6: Lint et commit**

Run: `pnpm --filter api lint`
Expected: aucune erreur ni warning sur `src/ai/`.

```bash
git add apps/api/src/ai/ai-prompts.ts apps/api/src/ai/ai-prompts.spec.ts apps/api/src/ai/gemini.provider.ts
git commit -m "refactor(api): extrait prompts et parseurs IA dans ai-prompts.ts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Pool de clés (`KeyPool`)

**Files:**
- Create: `apps/api/src/ai/key-pool.ts`
- Create: `apps/api/src/ai/key-pool.spec.ts`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `type Clock = () => number`
  - `class KeyPool` : `constructor(keys: readonly string[], now?: Clock)`, `static fromEnv(prefix: string, env?: NodeJS.ProcessEnv, now?: Clock): KeyPool`, `get size(): number`, `available(): { index: number; key: string }[]`, `pause(index: number, durationMs: number): void`, `disable(index: number): void`.

- [ ] **Step 1: Écrire les tests qui échouent**

`apps/api/src/ai/key-pool.spec.ts` :

```ts
import { describe, expect, it } from "vitest";
import { KeyPool } from "./key-pool.js";

describe("KeyPool.fromEnv", () => {
  it("loads the base key then the suffixed keys in order, skipping gaps", () => {
    const pool = KeyPool.fromEnv("GEMINI_API_KEY", {
      GEMINI_API_KEY: "k1",
      GEMINI_API_KEY_3: "k3",
      GEMINI_API_KEY_10: "k10",
    });

    expect(pool.available().map((entry) => entry.key)).toEqual(["k1", "k3", "k10"]);
    expect(pool.size).toBe(3);
  });

  it("ignores empty and whitespace-only values", () => {
    const pool = KeyPool.fromEnv("GROQ_API_KEY", { GROQ_API_KEY: "", GROQ_API_KEY_2: "   ", GROQ_API_KEY_3: " k3 " });

    expect(pool.available().map((entry) => entry.key)).toEqual(["k3"]);
  });

  it("keeps a key listed twice only once", () => {
    const pool = KeyPool.fromEnv("GEMINI_API_KEY", { GEMINI_API_KEY: "same", GEMINI_API_KEY_2: "same" });

    expect(pool.size).toBe(1);
  });

  it("is empty when no key is configured", () => {
    const pool = KeyPool.fromEnv("MISTRAL_API_KEY", {});

    expect(pool.size).toBe(0);
    expect(pool.available()).toEqual([]);
  });
});

describe("KeyPool availability", () => {
  it("hides a paused key until the pause has elapsed", () => {
    let now = 1_000;
    const pool = new KeyPool(["k1", "k2"], () => now);

    pool.pause(0, 60_000);
    expect(pool.available()).toEqual([{ index: 1, key: "k2" }]);

    now += 59_999;
    expect(pool.available().map((entry) => entry.key)).toEqual(["k2"]);

    now += 1;
    expect(pool.available().map((entry) => entry.key)).toEqual(["k1", "k2"]);
  });

  it("never returns a disabled key again", () => {
    let now = 0;
    const pool = new KeyPool(["k1", "k2"], () => now);

    pool.disable(1);
    now += 24 * 60 * 60 * 1000;

    expect(pool.available()).toEqual([{ index: 0, key: "k1" }]);
  });
});
```

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `pnpm --filter api exec vitest run src/ai/key-pool.spec.ts`
Expected: FAIL — `Failed to resolve import "./key-pool.js"`.

- [ ] **Step 3: Implémenter `KeyPool`**

`apps/api/src/ai/key-pool.ts` :

```ts
export type Clock = () => number;

const MAX_SUFFIX = 10;

export class KeyPool {
  private readonly pausedUntil = new Map<number, number>();
  private readonly disabled = new Set<number>();

  constructor(
    private readonly keys: readonly string[],
    private readonly now: Clock = Date.now,
  ) {}

  static fromEnv(prefix: string, env: NodeJS.ProcessEnv = process.env, now: Clock = Date.now): KeyPool {
    const names = [prefix];
    for (let suffix = 2; suffix <= MAX_SUFFIX; suffix++) {
      names.push(`${prefix}_${suffix}`);
    }

    const keys = names.map((name) => env[name]?.trim() ?? "").filter((key) => key.length > 0);

    // A key listed twice would be retried right after being rate-limited.
    return new KeyPool([...new Set(keys)], now);
  }

  get size(): number {
    return this.keys.length;
  }

  available(): { index: number; key: string }[] {
    const now = this.now();
    return this.keys.flatMap((key, index) =>
      this.disabled.has(index) || (this.pausedUntil.get(index) ?? 0) > now ? [] : [{ index, key }],
    );
  }

  pause(index: number, durationMs: number): void {
    this.pausedUntil.set(index, this.now() + durationMs);
  }

  disable(index: number): void {
    this.disabled.add(index);
  }
}
```

- [ ] **Step 4: Lancer les tests et vérifier qu'ils passent**

Run: `pnpm --filter api exec vitest run src/ai/key-pool.spec.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/ai/key-pool.ts apps/api/src/ai/key-pool.spec.ts
git commit -m "feat(api): pool de cles IA avec pause et desactivation

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Contrat `LlmBackend` et adaptateur OpenAI-compatible (Groq, Mistral)

**Files:**
- Create: `apps/api/src/ai/llm-backend.ts`
- Create: `apps/api/src/ai/openai-compatible.backend.ts`
- Create: `apps/api/src/ai/openai-compatible.backend.spec.ts`

**Interfaces:**
- Consumes: `JsonSchema`, `HYPOTHESES_JSON_SCHEMA` (Task 1) ; `KeyPool` (Task 2).
- Produces:
  - `interface LlmRequest { prompt: string; schema: JsonSchema; apiKey: string; signal: AbortSignal }`
  - `interface LlmBackend { readonly name: string; readonly pool: KeyPool; generateJson(request: LlmRequest): Promise<string> }`
  - `type LlmErrorKind = "rate_limited" | "unauthorized" | "unavailable"`
  - `class LlmError extends Error { readonly kind: LlmErrorKind; readonly retryAfterMs?: number; constructor(kind, message, retryAfterMs?) }`
  - `interface OpenAiCompatibleConfig { name: string; baseUrl: string; model: string }`
  - `class OpenAiCompatibleBackend implements LlmBackend` : `constructor(config: OpenAiCompatibleConfig, pool: KeyPool)`

- [ ] **Step 1: Créer le contrat `llm-backend.ts`** (pas de logique, pas de test propre ; couvert par les tests des adaptateurs)

`apps/api/src/ai/llm-backend.ts` :

```ts
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
```

- [ ] **Step 2: Écrire les tests qui échouent pour l'adaptateur**

`apps/api/src/ai/openai-compatible.backend.spec.ts` :

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HYPOTHESES_JSON_SCHEMA } from "./ai-prompts.js";
import { KeyPool } from "./key-pool.js";
import { OpenAiCompatibleBackend } from "./openai-compatible.backend.js";

const fetchMock = vi.fn();

function backend() {
  return new OpenAiCompatibleBackend(
    { name: "groq", baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
    new KeyPool(["k1"]),
  );
}

function request() {
  return { prompt: "le prompt", schema: HYPOTHESES_JSON_SCHEMA, apiKey: "k1", signal: new AbortController().signal };
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" }, ...init });
}

describe("OpenAiCompatibleBackend.generateJson", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the message content and sends a json_object chat completion request", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ choices: [{ message: { content: '{"price":5000}' } }] }));

    const text = await backend().generateJson(request());

    expect(text).toBe('{"price":5000}');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer k1");
    expect(JSON.parse(init.body as string)).toEqual({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: "le prompt" }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });
  });

  it("throws rate_limited with the Retry-After delay on 429", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: {} }, { status: 429, headers: { "Retry-After": "12" } }));

    await expect(backend().generateJson(request())).rejects.toMatchObject({ kind: "rate_limited", retryAfterMs: 12_000 });
  });

  it("throws rate_limited without delay when Retry-After is an HTTP date", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: {} }, { status: 429, headers: { "Retry-After": "Wed, 21 Oct 2026 07:28:00 GMT" } }),
    );

    await expect(backend().generateJson(request())).rejects.toMatchObject({
      kind: "rate_limited",
      retryAfterMs: undefined,
    });
  });

  it.each([401, 403])("throws unauthorized on %i", async (status) => {
    fetchMock.mockResolvedValue(jsonResponse({ error: {} }, { status }));

    await expect(backend().generateJson(request())).rejects.toMatchObject({ kind: "unauthorized" });
  });

  it("throws unavailable on a 5xx response", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: {} }, { status: 503 }));

    await expect(backend().generateJson(request())).rejects.toMatchObject({ kind: "unavailable" });
  });

  it("throws unavailable when the request is aborted by the attempt timeout", async () => {
    fetchMock.mockRejectedValue(new DOMException("The operation was aborted due to timeout", "TimeoutError"));

    await expect(backend().generateJson(request())).rejects.toMatchObject({ kind: "unavailable" });
  });

  it("throws unavailable when the response has no content", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ choices: [{ message: { content: "" } }] }));

    await expect(backend().generateJson(request())).rejects.toMatchObject({ kind: "unavailable" });
  });
});
```

- [ ] **Step 3: Lancer les tests et vérifier qu'ils échouent**

Run: `pnpm --filter api exec vitest run src/ai/openai-compatible.backend.spec.ts`
Expected: FAIL — `Failed to resolve import "./openai-compatible.backend.js"`.

- [ ] **Step 4: Implémenter l'adaptateur**

`apps/api/src/ai/openai-compatible.backend.ts` :

```ts
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
```

- [ ] **Step 5: Lancer les tests et vérifier qu'ils passent**

Run: `pnpm --filter api exec vitest run src/ai/openai-compatible.backend.spec.ts`
Expected: PASS (8 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/ai/llm-backend.ts apps/api/src/ai/openai-compatible.backend.ts apps/api/src/ai/openai-compatible.backend.spec.ts
git commit -m "feat(api): adaptateur IA OpenAI-compatible (Groq, Mistral) via fetch

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Adaptateur Gemini (`GeminiBackend`)

**Files:**
- Create: `apps/api/src/ai/gemini.backend.ts`
- Create: `apps/api/src/ai/gemini.backend.spec.ts`

**Interfaces:**
- Consumes: `LlmBackend`, `LlmRequest`, `LlmError` (Task 3) ; `KeyPool` (Task 2) ; `HYPOTHESES_JSON_SCHEMA` (Task 1, tests).
- Produces: `class GeminiBackend implements LlmBackend` : `constructor(pool: KeyPool, model: string)`, `name = "gemini"`.

- [ ] **Step 1: Écrire les tests qui échouent**

`apps/api/src/ai/gemini.backend.spec.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const generateContentMock = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(function () {
    return { models: { generateContent: generateContentMock } };
  }),
  Type: { OBJECT: "OBJECT", INTEGER: "INTEGER", STRING: "STRING" },
}));

const { GoogleGenAI } = await import("@google/genai");
const { GeminiBackend } = await import("./gemini.backend.js");
const { HYPOTHESES_JSON_SCHEMA } = await import("./ai-prompts.js");
const { KeyPool } = await import("./key-pool.js");

function backend() {
  return new GeminiBackend(new KeyPool(["k1", "k2"]), "gemini-2.5-flash");
}

function request(apiKey = "k1") {
  return { prompt: "le prompt", schema: HYPOTHESES_JSON_SCHEMA, apiKey, signal: new AbortController().signal };
}

function apiError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

describe("GeminiBackend.generateJson", () => {
  beforeEach(() => {
    generateContentMock.mockReset();
    vi.mocked(GoogleGenAI).mockClear();
  });

  it("returns the response text and sends the schema as a Gemini responseSchema", async () => {
    generateContentMock.mockResolvedValue({ text: '{"price":5000}' });
    const req = request();

    const text = await backend().generateJson(req);

    expect(text).toBe('{"price":5000}');
    expect(generateContentMock).toHaveBeenCalledWith({
      model: "gemini-2.5-flash",
      contents: "le prompt",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            price: { type: "INTEGER" },
            volume: { type: "INTEGER" },
            variableCostPerUnit: { type: "INTEGER" },
            fixedCosts: { type: "INTEGER" },
          },
          required: ["price", "volume", "variableCostPerUnit", "fixedCosts"],
        },
        abortSignal: req.signal,
      },
    });
  });

  it("creates one SDK client per API key and reuses it", async () => {
    generateContentMock.mockResolvedValue({ text: "{}" });
    const gemini = backend();

    await gemini.generateJson(request("k1"));
    await gemini.generateJson(request("k1"));
    await gemini.generateJson(request("k2"));

    expect(GoogleGenAI).toHaveBeenCalledTimes(2);
    expect(GoogleGenAI).toHaveBeenNthCalledWith(1, { apiKey: "k1" });
    expect(GoogleGenAI).toHaveBeenNthCalledWith(2, { apiKey: "k2" });
  });

  it("throws rate_limited with the suggested retry delay on 429", async () => {
    generateContentMock.mockRejectedValue(apiError(429, "Quota exceeded. Please retry in 40.5s."));

    await expect(backend().generateJson(request())).rejects.toMatchObject({ kind: "rate_limited", retryAfterMs: 40_500 });
  });

  it.each([
    [401, "Unauthorized"],
    [403, "Permission denied"],
    [400, "API key not valid. Please pass a valid API key."],
  ])("throws unauthorized on %i (%s)", async (status, message) => {
    generateContentMock.mockRejectedValue(apiError(status, message));

    await expect(backend().generateJson(request())).rejects.toMatchObject({ kind: "unauthorized" });
  });

  it("throws unavailable on any other error", async () => {
    generateContentMock.mockRejectedValue(new Error("fetch failed"));

    await expect(backend().generateJson(request())).rejects.toMatchObject({ kind: "unavailable" });
  });

  it("throws unavailable when the response has no text", async () => {
    generateContentMock.mockResolvedValue({ text: undefined });

    await expect(backend().generateJson(request())).rejects.toMatchObject({ kind: "unavailable" });
  });
});
```

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `pnpm --filter api exec vitest run src/ai/gemini.backend.spec.ts`
Expected: FAIL — `Failed to resolve import "./gemini.backend.js"`.

- [ ] **Step 3: Implémenter l'adaptateur**

`apps/api/src/ai/gemini.backend.ts` :

```ts
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
  // Gemini answers an invalid key with 400 INVALID_ARGUMENT rather than 401.
  if (status === 401 || status === 403 || (status === 400 && /api key not valid/i.test(message))) {
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
```

- [ ] **Step 4: Lancer les tests et vérifier qu'ils passent**

Run: `pnpm --filter api exec vitest run src/ai/gemini.backend.spec.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/ai/gemini.backend.ts apps/api/src/ai/gemini.backend.spec.ts
git commit -m "feat(api): adaptateur Gemini multi-cles avec classement des erreurs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Orchestrateur `FallbackAiProvider`

**Files:**
- Create: `apps/api/src/ai/fallback-ai.provider.ts`
- Create: `apps/api/src/ai/fallback-ai.provider.spec.ts`

**Interfaces:**
- Consumes: `AiProvider`, `AiSuggestionInput`, `SuggestedHypotheses`, `SuggestedCanvasBlocks` (port) ; prompts/parseurs/schémas (Task 1) ; `KeyPool`, `Clock` (Task 2) ; `LlmBackend`, `LlmError` (Task 3).
- Produces:
  - `const TOTAL_BUDGET_MS = 15_000`, `const ATTEMPT_TIMEOUT_MS = 6_000`, `const DEFAULT_RATE_LIMIT_PAUSE_MS = 60_000`
  - `class FallbackAiProvider implements AiProvider` : `constructor(backends: readonly LlmBackend[], now?: Clock)`, propriété publique `readonly backends: readonly LlmBackend[]`.

- [ ] **Step 1: Écrire les tests qui échouent**

`apps/api/src/ai/fallback-ai.provider.spec.ts` :

```ts
import { describe, expect, it } from "vitest";
import { FallbackAiProvider } from "./fallback-ai.provider.js";
import { KeyPool } from "./key-pool.js";
import { LlmError, type LlmBackend, type LlmRequest } from "./llm-backend.js";

const HYPOTHESES = { price: 5000, volume: 50, variableCostPerUnit: 2000, fixedCosts: 100000 };
const VALID_HYPOTHESES = JSON.stringify(HYPOTHESES);

const CANVAS = {
  valueProposition: "Des vetements tendance.",
  customerSegments: "Jeunes actifs.",
  channels: "Instagram.",
  customerRelationships: "WhatsApp.",
  keyResources: "Stock.",
  keyActivities: "Livraison.",
  keyPartners: "Grossistes.",
};

function input() {
  return {
    businessModel: "ECOMMERCE" as const,
    rawDescription: "Vente de vetements en ligne pour jeunes actifs.",
    currency: "XOF" as const,
  };
}

class FakeBackend implements LlmBackend {
  readonly calls: string[] = [];

  constructor(
    readonly name: string,
    readonly pool: KeyPool,
    private readonly respond: (apiKey: string, request: LlmRequest) => Promise<string>,
  ) {}

  generateJson(request: LlmRequest): Promise<string> {
    this.calls.push(request.apiKey);
    return this.respond(request.apiKey, request);
  }
}

function setup() {
  const clock = { now: 0 };
  const pool = (...keys: string[]) => new KeyPool(keys, () => clock.now);
  return { clock, pool, now: () => clock.now };
}

describe("FallbackAiProvider", () => {
  it("returns the first valid suggestion from the first backend", async () => {
    const { pool, now } = setup();
    const gemini = new FakeBackend("gemini", pool("g1", "g2"), async () => VALID_HYPOTHESES);

    const result = await new FallbackAiProvider([gemini], now).suggestHypotheses(input());

    expect(result).toEqual(HYPOTHESES);
    expect(gemini.calls).toEqual(["g1"]);
  });

  it("rotates to the next key of the same backend on rate limit, and skips the paused key on the next request", async () => {
    const { pool, now } = setup();
    const gemini = new FakeBackend("gemini", pool("g1", "g2"), async (key) => {
      if (key === "g1") throw new LlmError("rate_limited", "429");
      return VALID_HYPOTHESES;
    });
    const provider = new FallbackAiProvider([gemini], now);

    expect(await provider.suggestHypotheses(input())).toEqual(HYPOTHESES);
    expect(await provider.suggestHypotheses(input())).toEqual(HYPOTHESES);

    expect(gemini.calls).toEqual(["g1", "g2", "g2"]);
  });

  it("pauses a rate-limited key for retryAfterMs, or 60 s by default", async () => {
    const { clock, pool, now } = setup();
    let failures = 2;
    const gemini = new FakeBackend("gemini", pool("g1"), async () => {
      if (failures-- > 0) throw new LlmError("rate_limited", "429", failures === 1 ? 5_000 : undefined);
      return VALID_HYPOTHESES;
    });
    const provider = new FallbackAiProvider([gemini], now);

    expect(await provider.suggestHypotheses(input())).toBeNull(); // paused 5 s
    clock.now = 4_999;
    expect(await provider.suggestHypotheses(input())).toBeNull(); // still paused, not called
    clock.now = 5_000;
    expect(await provider.suggestHypotheses(input())).toBeNull(); // retried, paused 60 s by default
    clock.now = 64_999;
    expect(await provider.suggestHypotheses(input())).toBeNull(); // still paused, not called
    clock.now = 65_000;
    expect(await provider.suggestHypotheses(input())).toEqual(HYPOTHESES);

    expect(gemini.calls).toEqual(["g1", "g1", "g1"]);
  });

  it("falls back to the next backend when every key of the first one is rate-limited", async () => {
    const { pool, now } = setup();
    const gemini = new FakeBackend("gemini", pool("g1", "g2"), async () => {
      throw new LlmError("rate_limited", "429");
    });
    const groq = new FakeBackend("groq", pool("q1"), async () => VALID_HYPOTHESES);

    const result = await new FallbackAiProvider([gemini, groq], now).suggestHypotheses(input());

    expect(result).toEqual(HYPOTHESES);
    expect(gemini.calls).toEqual(["g1", "g2"]);
    expect(groq.calls).toEqual(["q1"]);
  });

  it("disables an unauthorized key for good", async () => {
    const { clock, pool, now } = setup();
    const gemini = new FakeBackend("gemini", pool("g1", "g2"), async (key) => {
      if (key === "g1") throw new LlmError("unauthorized", "401");
      return VALID_HYPOTHESES;
    });
    const provider = new FallbackAiProvider([gemini], now);

    await provider.suggestHypotheses(input());
    clock.now = 24 * 60 * 60 * 1000;
    await provider.suggestHypotheses(input());

    expect(gemini.calls).toEqual(["g1", "g2", "g2"]);
  });

  it("moves to the next backend without trying other keys when a backend is unavailable", async () => {
    const { pool, now } = setup();
    const gemini = new FakeBackend("gemini", pool("g1", "g2"), async () => {
      throw new LlmError("unavailable", "timeout");
    });
    const groq = new FakeBackend("groq", pool("q1"), async () => VALID_HYPOTHESES);

    const result = await new FallbackAiProvider([gemini, groq], now).suggestHypotheses(input());

    expect(result).toEqual(HYPOTHESES);
    expect(gemini.calls).toEqual(["g1"]);
  });

  it("treats a non-LlmError exception as unavailable", async () => {
    const { pool, now } = setup();
    const gemini = new FakeBackend("gemini", pool("g1"), async () => {
      throw new TypeError("boom");
    });
    const groq = new FakeBackend("groq", pool("q1"), async () => VALID_HYPOTHESES);

    expect(await new FallbackAiProvider([gemini, groq], now).suggestHypotheses(input())).toEqual(HYPOTHESES);
  });

  it("moves to the next backend when the response fails validation", async () => {
    const { pool, now } = setup();
    const groq = new FakeBackend("groq", pool("q1", "q2"), async () => JSON.stringify({ ...HYPOTHESES, price: 0 }));
    const mistral = new FakeBackend("mistral", pool("m1"), async () => VALID_HYPOTHESES);

    const result = await new FallbackAiProvider([groq, mistral], now).suggestHypotheses(input());

    expect(result).toEqual(HYPOTHESES);
    expect(groq.calls).toEqual(["q1"]);
  });

  it("gives up once the 15 s budget is spent, without calling the remaining backends", async () => {
    const { clock, pool, now } = setup();
    const gemini = new FakeBackend("gemini", pool("g1"), async () => {
      clock.now += 15_000;
      throw new LlmError("unavailable", "timeout");
    });
    const groq = new FakeBackend("groq", pool("q1"), async () => VALID_HYPOTHESES);

    const result = await new FallbackAiProvider([gemini, groq], now).suggestHypotheses(input());

    expect(result).toBeNull();
    expect(groq.calls).toEqual([]);
  });

  it("gives each attempt a signal that is not yet aborted", async () => {
    const { pool, now } = setup();
    let signal: AbortSignal | undefined;
    const gemini = new FakeBackend("gemini", pool("g1"), async (_key, request) => {
      signal = request.signal;
      return VALID_HYPOTHESES;
    });

    await new FallbackAiProvider([gemini], now).suggestHypotheses(input());

    expect(signal?.aborted).toBe(false);
  });

  it("returns null when no backend is configured", async () => {
    expect(await new FallbackAiProvider([]).suggestHypotheses(input())).toBeNull();
  });

  it("parses canvas blocks with the canvas parser", async () => {
    const { pool, now } = setup();
    const gemini = new FakeBackend("gemini", pool("g1"), async () => JSON.stringify(CANVAS));

    expect(await new FallbackAiProvider([gemini], now).suggestCanvasBlocks(input())).toEqual(CANVAS);
  });
});
```

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `pnpm --filter api exec vitest run src/ai/fallback-ai.provider.spec.ts`
Expected: FAIL — `Failed to resolve import "./fallback-ai.provider.js"`.

- [ ] **Step 3: Implémenter l'orchestrateur**

`apps/api/src/ai/fallback-ai.provider.ts` :

```ts
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
export const ATTEMPT_TIMEOUT_MS = 6_000;
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
```

- [ ] **Step 4: Lancer les tests et vérifier qu'ils passent**

Run: `pnpm --filter api exec vitest run src/ai/fallback-ai.provider.spec.ts`
Expected: PASS (12 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/ai/fallback-ai.provider.ts apps/api/src/ai/fallback-ai.provider.spec.ts
git commit -m "feat(api): orchestrateur IA avec rotation de cles et chaine de providers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Câblage NestJS et suppression de `GeminiProvider`

**Files:**
- Create: `apps/api/src/ai/ai-provider.factory.ts`
- Create: `apps/api/src/ai/ai-provider.factory.spec.ts`
- Modify: `apps/api/src/ai/ai.module.ts`
- Delete: `apps/api/src/ai/gemini.provider.ts`, `apps/api/src/ai/gemini.provider.spec.ts` (leurs cas sont couverts par `ai-prompts.spec.ts`, `gemini.backend.spec.ts` et `fallback-ai.provider.spec.ts`)

**Interfaces:**
- Consumes: `FallbackAiProvider` (Task 5), `GeminiBackend` (Task 4), `OpenAiCompatibleBackend` (Task 3), `KeyPool` (Task 2), `AI_PROVIDER` (port).
- Produces: `createAiProvider(env?: NodeJS.ProcessEnv): FallbackAiProvider`.

- [ ] **Step 1: Écrire les tests qui échouent**

`apps/api/src/ai/ai-provider.factory.spec.ts` :

```ts
import { describe, expect, it } from "vitest";
import { createAiProvider } from "./ai-provider.factory.js";

describe("createAiProvider", () => {
  it("chains Gemini, Groq then Mistral when all have keys", () => {
    const provider = createAiProvider({ GEMINI_API_KEY: "g", GROQ_API_KEY: "q", MISTRAL_API_KEY: "m" });

    expect(provider.backends.map((backend) => backend.name)).toEqual(["gemini", "groq", "mistral"]);
  });

  it("skips providers without any key", () => {
    const provider = createAiProvider({ GEMINI_API_KEY: "", GROQ_API_KEY_2: "q2", MISTRAL_API_KEY: "m" });

    expect(provider.backends.map((backend) => backend.name)).toEqual(["groq", "mistral"]);
  });

  it("has no backend when no key is configured", () => {
    expect(createAiProvider({}).backends).toEqual([]);
  });
});
```

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `pnpm --filter api exec vitest run src/ai/ai-provider.factory.spec.ts`
Expected: FAIL — `Failed to resolve import "./ai-provider.factory.js"`.

- [ ] **Step 3: Implémenter la factory**

`apps/api/src/ai/ai-provider.factory.ts` :

```ts
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
```

- [ ] **Step 4: Câbler le module**

Remplacer le contenu de `apps/api/src/ai/ai.module.ts` par :

```ts
import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { AiController } from "./ai.controller.js";
import { AI_PROVIDER } from "./ai-provider.port.js";
import { createAiProvider } from "./ai-provider.factory.js";

@Module({
  imports: [ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 10 }])],
  controllers: [AiController],
  providers: [{ provide: AI_PROVIDER, useFactory: () => createAiProvider() }],
  exports: [AI_PROVIDER],
})
export class AiModule {}
```

- [ ] **Step 5: Supprimer l'ancien provider**

```bash
git rm apps/api/src/ai/gemini.provider.ts apps/api/src/ai/gemini.provider.spec.ts
grep -rn "gemini.provider" apps/api/src || echo "aucune reference restante"
```
Expected: `aucune reference restante`.

- [ ] **Step 6: Suite complète, lint, build**

Run: `pnpm --filter api test && pnpm --filter api lint && pnpm --filter api build`
Expected: tous les tests verts (dont `ai.controller.spec.ts` inchangé), lint sans warning, build OK.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/ai
git commit -m "feat(api): branche la chaine Gemini -> Groq -> Mistral sur AI_PROVIDER

Remplace GeminiProvider (cle unique) par FallbackAiProvider construit
depuis l'environnement ; les providers sans cle sont ignores.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Documentation, configuration et vérification bout en bout

**Files:**
- Modify: `apps/api/.env.example`
- Modify: `docs/DECISIONS.md` (nouvelle entrée en fin de liste des décisions datées)
- Modify: `docs/AI_ENGINE.md` (section `## Architecture`)
- Modify: `docs/superpowers/specs/2026-09-26-ia-rotation-providers-design.md` (API de `KeyPool` alignée sur les index)
- Modify: `tasks/TODO.md`, `tasks/CHANGELOG.md`

**Interfaces:** aucune (documentation).

- [ ] **Step 1: `.env.example`**

Remplacer les lignes `GEMINI_API_KEY=""` et `GEMINI_MODEL="gemini-2.5-flash"` de `apps/api/.env.example` par :

```bash
# AI providers, tried in order: Gemini -> Groq -> Mistral (a provider without key is skipped).
# Add _2 ... _10 suffixes to rotate several keys of the same provider when one hits its quota.
GEMINI_API_KEY=""
GEMINI_API_KEY_2=""
GEMINI_MODEL="gemini-2.5-flash"
GROQ_API_KEY=""
GROQ_MODEL="llama-3.3-70b-versatile"
MISTRAL_API_KEY=""
MISTRAL_MODEL="mistral-small-latest"
```

- [ ] **Step 2: `docs/DECISIONS.md`**

Ajouter après la dernière entrée datée :

```markdown
- **[2026-09-26] IA : rotation de clés et chaîne de providers Gemini → Groq → Mistral (révise la décision du 2026-09-19).** Le quota free-tier Gemini a été atteint en conditions réelles, renvoyant l'utilisateur à une saisie 100 % manuelle. Chaque provider dispose d'un pool de clés (`<PROVIDER>_API_KEY`, `_2` … `_10`) : une clé en 429 est mise en pause (délai fourni par le provider, sinon 60 s), une clé refusée est désactivée, et quand un provider n'a plus de clé utilisable on passe au suivant, le tout sous un budget de 15 s (6 s max par tentative). L'exclusion de Groq (fiabilité JSON) est levée : toutes les réponses, quel que soit le provider, passent par les mêmes parseurs stricts, et une réponse invalide fait passer au provider suivant au lieu d'être affichée. Gemini reste premier de chaîne pour son structured output natif. Mécanisme repris du CLI `zero-to-one-ai` (`modules/llm/index.js`), sans retry avec backoff (la latence du wizard prime). Groq et Mistral sont appelés en `fetch` (API OpenAI-compatible), sans nouvelle dépendance. État des clés en mémoire du processus (un seul serveur au MVP). Spec : `docs/superpowers/specs/2026-09-26-ia-rotation-providers-design.md`.
```

- [ ] **Step 3: `docs/AI_ENGINE.md`**

Ajouter à la fin de la section `## Architecture` :

```markdown
- Chaîne de providers **Gemini → Groq → Mistral** derrière le port `AiProvider` (`FallbackAiProvider`, `apps/api/src/ai/`) : chaque provider a un pool de clés en rotation (`<PROVIDER>_API_KEY`, `_2` … `_10`), budget de 15 s par suggestion (6 s max par tentative). Si tout échoue, repli silencieux : l'utilisateur saisit lui-même (voir `docs/DECISIONS.md`, 2026-09-26).
- Toute réponse IA, quel que soit le provider, est validée par un parseur strict (`ai-prompts.ts`) avant d'être proposée à l'utilisateur.
```

- [ ] **Step 4: Aligner la spec sur l'API réelle de `KeyPool`**

Dans `docs/superpowers/specs/2026-09-26-ia-rotation-providers-design.md`, remplacer la phrase
`API : \`available(): string[]\` (clés non en pause ni désactivées, dans l'ordre), \`pause(key, ms)\`, \`disable(key)\`, \`size\`.`
par
`API : \`available(): { index; key }[]\` (clés non en pause ni désactivées, dans l'ordre), \`pause(index, ms)\`, \`disable(index)\`, \`size\` ; une clé présente deux fois dans l'env n'est gardée qu'une fois.`

- [ ] **Step 5: `tasks/TODO.md` et `tasks/CHANGELOG.md`**

Dans `tasks/TODO.md`, sous `## Phase 4 — IA`, ajouter :

```markdown
- [x] Rotation de clés et chaîne de providers IA (Gemini → Groq → Mistral), budget 15 s, repli silencieux inchangé. Voir `docs/superpowers/specs/2026-09-26-ia-rotation-providers-design.md`.
```

Dans `tasks/CHANGELOG.md`, juste sous le titre `# CHANGELOG.md`, ajouter :

```markdown
## [Non versionné], IA : rotation de clés et de providers
- Les suggestions IA (hypothèses, canvas) essaient Gemini, puis Groq, puis Mistral ; chaque provider peut avoir plusieurs clés (`_2` … `_10`) utilisées à tour de rôle quand l'une atteint son quota.
- Budget de 15 s par suggestion : au-delà, repli silencieux vers la saisie manuelle, comme avant.
- Toutes les réponses restent validées par les mêmes parseurs stricts avant d'être proposées.
```

- [ ] **Step 6: Vérification bout en bout (serveur réel, ports dédiés)**

Ne jamais toucher aux serveurs de l'utilisateur (API 3001, web 3002). Utiliser le port 3011, arrêter par PID exact.

1. Clé Gemini volontairement invalide, aucun autre provider — doit se replier proprement :
   ```bash
   cd apps/api
   GEMINI_API_KEY=cle-invalide GEMINI_API_KEY_2= GROQ_API_KEY= MISTRAL_API_KEY= PORT=3011 pnpm start:dev > /tmp/<scratchpad>/api-invalid.log 2>&1 &
   # attendre "Nest application successfully started", puis :
   curl -s -X POST localhost:3011/ideas/suggest-hypotheses -H 'Content-Type: application/json' \
     -d '{"businessModel":"ECOMMERCE","rawDescription":"Vente de sacs faits main en ligne","currency":"XOF"}'
   ```
   Expected: `{"available":false}` ; le log contient `gemini cle #1 desactivee (cle refusee)` et ne contient pas `cle-invalide`.
   Arrêter ce serveur (PID exact et ses enfants).
2. Configuration réelle de l'utilisateur (`.env`) : relancer sans surcharge sur 3011, refaire le même `curl` puis `POST /ideas/suggest-canvas-blocks` avec le même corps.
   Expected: `{"available":true,...}` si au moins une clé a du quota ; sinon `{"available":false}` avec les raisons dans le log. Arrêter le serveur.

- [ ] **Step 7: Suite complète et commit**

Run: `pnpm --filter api test && pnpm --filter api lint && pnpm --filter api build`
Expected: tout vert.

```bash
git add apps/api/.env.example docs/DECISIONS.md docs/AI_ENGINE.md docs/superpowers/specs/2026-09-26-ia-rotation-providers-design.md tasks/TODO.md tasks/CHANGELOG.md
git commit -m "docs: rotation de cles et de providers IA (decision, config, changelog)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
