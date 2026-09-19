# Phase 4, extraction IA des hypothèses, Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Préremplir l'écran Hypothèses du wizard (`/commencer`) avec une suggestion IA (Google Gemini) extraite de la description libre de l'utilisateur, sans jamais bloquer le parcours si l'IA est indisponible.

**Architecture:** Nouveau module NestJS `AiModule`, isolé du reste du domaine (`IdeasModule` ne le connaît pas, et réciproquement) : une interface `AiProvider` (port) + une implémentation `GeminiProvider` (SDK officiel `@google/genai`, mode structured output), exposées via un nouvel endpoint stateless `POST /ideas/suggest-hypotheses` (servi par un `AiController` propre à `AiModule`, pas ajouté à `IdeasController`). Côté frontend, le passage Description → Hypothèses du wizard devient asynchrone : il appelle ce nouvel endpoint et préremplit les champs si une suggestion est disponible, sinon le comportement Phase 3 (champs à 0) est inchangé.

**Tech Stack:** `@google/genai` (^2.23.0), `@nestjs/throttler` (^6.7.0), NestJS 12, vitest, Next.js 16 (App Router).

**Spec:** `docs/superpowers/specs/2026-09-19-phase-4-extraction-ia-design.md`

## Global Constraints

- L'IA ne calcule jamais un chiffre affiché : elle ne fait que proposer les 4 hypothèses d'entrée du moteur financier (Phase 2), qui reste seul à produire CA/marge/résultat/seuil (`docs/AI_ENGINE.md`).
- Aucun changement au contrat `POST /ideas` / `GET /ideas/:id` ni au schéma Prisma (`docs/superpowers/specs/2026-09-19-phase-4-extraction-ia-design.md`, section Décisions actées). `Hypothesis.source` reste toujours `"utilisateur_saisi"` à la persistance.
- Mode dégradé **silencieux obligatoire** : toute panne IA (réseau, timeout, quota, JSON hors schéma, valeurs hors bornes) doit se traduire par `{ available: false }` côté API et par un écran Hypothèses à 0 côté wizard — jamais une exception qui remonte au frontend, jamais un écran bloquant (`skills/ai.md`).
- `GeminiProvider` est le seul composant du projet où une dépendance externe est mockée dans les tests (`@google/genai`) : appeler une vraie API IA payante/à quota dans la suite de tests n'est pas praticable, contrairement à Prisma/Postgres qui tournent en local sans coût (`skills/testing.md`).
- Le rate-limiting (`@nestjs/throttler`) s'applique **uniquement** à `POST /ideas/suggest-hypotheses`, jamais globalement : ne pas toucher au comportement de `IdeasController`.
- Imports relatifs TypeScript avec extension `.js` explicite dans `apps/api` (résolution `nodenext`, déjà en place Phase 3).
- Montants toujours des entiers dans la plus petite unité de la devise, jamais de flottant natif sur un montant (`docs/FINANCIAL_ENGINE.md`).
- Les tâches doivent être faites dans l'ordre (1 → 6), chaque tâche consomme des fichiers produits par la précédente.
- **Dépendance externe non codable :** vérifier le succès de la suggestion IA en conditions réelles nécessite une clé `GEMINI_API_KEY` valide (compte Google AI Studio), que l'agent ne peut pas créer lui-même. Toutes les tâches de code (backend + frontend) sont entièrement testables sans cette clé (DTOs, `GeminiProvider` avec SDK mocké, `AiController` avec provider mocké, build/lint frontend). Seule la vérification manuelle finale du chemin de succès (Task 6, Step 6) en dépend — le chemin dégradé (sans clé, ou clé invalide) est lui vérifiable sans dépendance externe et constitue la vérification minimale acceptable si aucune clé n'est disponible.

---

## Task 1: Dépendances, configuration, décision actée

**Files:**
- Modify: `apps/api/package.json` (dépendances)
- Modify: `apps/api/.env.example`
- Modify: `docs/DECISIONS.md`

**Interfaces:**
- Produces: `@google/genai` et `@nestjs/throttler` installés et disponibles pour les tâches suivantes ; variables d'environnement `GEMINI_API_KEY`/`GEMINI_MODEL` documentées.

Config, pas de cycle TDD (exception explicite de la skill test-driven-development, même pattern que Task 1 de la Phase 3).

- [ ] **Step 1: Installer les dépendances**

Run: `cd apps/api && pnpm add @google/genai @nestjs/throttler`
Expected: `apps/api/package.json` liste `@google/genai` et `@nestjs/throttler` en dependencies.

- [ ] **Step 2: Ajouter les variables d'environnement**

Ajouter à `apps/api/.env.example` (après `WEB_APP_URL`) :

```
GEMINI_API_KEY=""
GEMINI_MODEL="gemini-2.5-flash"
```

Si `apps/api/.env` existe déjà (créé en Phase 3), y ajouter les deux mêmes lignes sans écraser les valeurs existantes. `GEMINI_API_KEY` peut rester vide en local : `GeminiProvider` (Task 3) traite tout échec d'appel (y compris une clé vide/invalide) comme une suggestion indisponible, jamais comme un crash.

- [ ] **Step 3: Consigner la décision dans `docs/DECISIONS.md`**

Ajouter à la fin de `docs/DECISIONS.md`, avant la ligne `*(À compléter au fil du projet...)*` :

```markdown
- **[2026-09-19] Fournisseur IA (Phase 4) : Google Gemini (famille Flash), SDK officiel `@google/genai`.** Choisi pour son mode structured output natif (`responseSchema`), qui force une réponse JSON conforme à un schéma et réduit le risque d'extraction mal formée par rapport à un parsing de texte libre. Free-tier généreux (`docs/AI_ENGINE.md` : « privilégier une API économique / free-tier »). Groq écarté : modèles open-source moins fiables pour du JSON strict sans validation additionnelle. Modèle exact configurable via `GEMINI_MODEL` (défaut `gemini-2.5-flash`), pour pouvoir suivre les mises à jour de la famille Flash sans redéploiement de code.
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/package.json apps/api/pnpm-lock.yaml apps/api/.env.example docs/DECISIONS.md
git commit -m "chore(api): ajoute @google/genai et @nestjs/throttler pour la Phase 4"
```

---

## Task 2: `AiProvider` (port) + `SuggestHypothesesDto`

**Files:**
- Create: `apps/api/src/ai/ai-provider.port.ts`
- Create: `apps/api/src/ai/dto/suggest-hypotheses.dto.ts`
- Create: `apps/api/src/ai/dto/suggest-hypotheses.dto.spec.ts`

**Interfaces:**
- Consumes: `BusinessModel` (`@prisma/client`), `SUPPORTED_CURRENCIES`/`CurrencyCode` (`apps/api/src/financial-engine/financial-engine.types.ts`, Phase 2).
- Produces: interface `AiProvider` et type `SuggestedHypotheses` (`{ price: number; volume: number; variableCostPerUnit: number; fixedCosts: number }`), token d'injection `AI_PROVIDER` (`apps/api/src/ai/ai-provider.port.ts`), classe `SuggestHypothesesDto` (`apps/api/src/ai/dto/suggest-hypotheses.dto.ts`). Consommés par `GeminiProvider` (Task 3) et `AiController` (Task 4).

- [ ] **Step 1: Écrire `ai-provider.port.ts` (pas de test — interface et type purs, rien à exécuter)**

Créer `apps/api/src/ai/ai-provider.port.ts` :

```typescript
import type { BusinessModel } from "@prisma/client";
import type { CurrencyCode } from "../financial-engine/financial-engine.types.js";

export interface SuggestedHypotheses {
  price: number;
  volume: number;
  variableCostPerUnit: number;
  fixedCosts: number;
}

export interface AiSuggestionInput {
  businessModel: BusinessModel;
  rawDescription: string;
  currency: CurrencyCode;
}

export const AI_PROVIDER = Symbol("AI_PROVIDER");

export interface AiProvider {
  suggestHypotheses(input: AiSuggestionInput): Promise<SuggestedHypotheses | null>;
}
```

- [ ] **Step 2: Écrire le test du DTO (RED)**

Créer `apps/api/src/ai/dto/suggest-hypotheses.dto.spec.ts` :

```typescript
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { SuggestHypothesesDto } from "./suggest-hypotheses.dto.js";

function validPayload() {
  return {
    businessModel: "ECOMMERCE",
    rawDescription: "Vente de vêtements en ligne pour jeunes actifs.",
    currency: "XOF",
  };
}

describe("SuggestHypothesesDto", () => {
  it("accepts a valid payload", async () => {
    const dto = plainToInstance(SuggestHypothesesDto, validPayload());
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it("rejects an unsupported currency", async () => {
    const dto = plainToInstance(SuggestHypothesesDto, { ...validPayload(), currency: "JPY" });
    const errors = await validate(dto);

    expect(errors.some((e) => e.property === "currency")).toBe(true);
  });

  it("rejects an unknown business model", async () => {
    const dto = plainToInstance(SuggestHypothesesDto, { ...validPayload(), businessModel: "SAAS" });
    const errors = await validate(dto);

    expect(errors.some((e) => e.property === "businessModel")).toBe(true);
  });

  it("rejects an empty description", async () => {
    const dto = plainToInstance(SuggestHypothesesDto, { ...validPayload(), rawDescription: "" });
    const errors = await validate(dto);

    expect(errors.some((e) => e.property === "rawDescription")).toBe(true);
  });
});
```

- [ ] **Step 3: Vérifier l'échec (RED)**

Run: `pnpm --filter api exec vitest run src/ai/dto/suggest-hypotheses.dto.spec.ts`
Expected: FAIL, `Cannot find module './suggest-hypotheses.dto.js'`.

- [ ] **Step 4: Implémenter `SuggestHypothesesDto`**

Créer `apps/api/src/ai/dto/suggest-hypotheses.dto.ts` :

```typescript
import { IsEnum, IsIn, IsNotEmpty, IsString, MaxLength } from "class-validator";
import { BusinessModel } from "@prisma/client";
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "../../financial-engine/financial-engine.types.js";

export class SuggestHypothesesDto {
  @IsEnum(BusinessModel)
  businessModel!: BusinessModel;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  rawDescription!: string;

  @IsIn(SUPPORTED_CURRENCIES)
  currency!: CurrencyCode;
}
```

- [ ] **Step 5: Vérifier le succès (GREEN)**

Run: `pnpm --filter api exec vitest run src/ai/dto/suggest-hypotheses.dto.spec.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/ai/ai-provider.port.ts apps/api/src/ai/dto
git commit -m "feat(api): port AiProvider et SuggestHypothesesDto"
```

---

## Task 3: `GeminiProvider`

**Files:**
- Create: `apps/api/src/ai/gemini.provider.ts`
- Create: `apps/api/src/ai/gemini.provider.spec.ts`

**Interfaces:**
- Consumes: `AiProvider`, `SuggestedHypotheses`, `AiSuggestionInput` (Task 2), SDK `@google/genai` (`GoogleGenAI`, `Type`).
- Produces: classe `GeminiProvider implements AiProvider` (`apps/api/src/ai/gemini.provider.ts`), consommée par `AiModule` (Task 4).

- [ ] **Step 1: Écrire le test (RED)**

Créer `apps/api/src/ai/gemini.provider.spec.ts` :

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

const generateContentMock = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(function () {
    return { models: { generateContent: generateContentMock } };
  }),
  Type: { OBJECT: "OBJECT", INTEGER: "INTEGER" },
}));

const { GeminiProvider } = await import("./gemini.provider.js");

function input() {
  return {
    businessModel: "ECOMMERCE" as const,
    rawDescription: "Vente de vetements en ligne pour jeunes actifs.",
    currency: "XOF" as const,
  };
}

describe("GeminiProvider.suggestHypotheses", () => {
  beforeEach(() => {
    generateContentMock.mockReset();
  });

  it("returns the parsed hypotheses when Gemini responds with valid JSON", async () => {
    generateContentMock.mockResolvedValue({
      text: JSON.stringify({ price: 5000, volume: 50, variableCostPerUnit: 2000, fixedCosts: 100000 }),
    });

    const provider = new GeminiProvider();
    const result = await provider.suggestHypotheses(input());

    expect(result).toEqual({ price: 5000, volume: 50, variableCostPerUnit: 2000, fixedCosts: 100000 });
  });

  it("returns null when the response is not valid JSON", async () => {
    generateContentMock.mockResolvedValue({ text: "ceci n'est pas du JSON" });

    const provider = new GeminiProvider();
    const result = await provider.suggestHypotheses(input());

    expect(result).toBeNull();
  });

  it("returns null when a value is out of bounds (price must be >= 1)", async () => {
    generateContentMock.mockResolvedValue({
      text: JSON.stringify({ price: 0, volume: 50, variableCostPerUnit: 2000, fixedCosts: 100000 }),
    });

    const provider = new GeminiProvider();
    const result = await provider.suggestHypotheses(input());

    expect(result).toBeNull();
  });

  it("returns null when the SDK call throws", async () => {
    generateContentMock.mockRejectedValue(new Error("quota exceeded"));

    const provider = new GeminiProvider();
    const result = await provider.suggestHypotheses(input());

    expect(result).toBeNull();
  });
});
```

Note : le mock du module est déclaré avant l'import de `GeminiProvider` via un `import()` dynamique (`vi.mock` doit être évalué avant que le module testé importe `@google/genai`) — pattern requis ici car c'est le seul fichier du projet qui mocke une dépendance externe (voir Global Constraints).

Note : `mockImplementation` utilise une expression `function`, pas une fonction fléchée — `gemini.provider.ts` instancie le SDK avec `new GoogleGenAI(...)`, et une fonction fléchée n'a pas de `[[Construct]]` ; vitest 4.1.11 lève `TypeError: ... is not a constructor` si l'implémentation mockée est une flèche.

- [ ] **Step 2: Vérifier l'échec (RED)**

Run: `pnpm --filter api exec vitest run src/ai/gemini.provider.spec.ts`
Expected: FAIL, `Cannot find module './gemini.provider.js'`.

- [ ] **Step 3: Implémenter `GeminiProvider`**

Créer `apps/api/src/ai/gemini.provider.ts` :

```typescript
import { Injectable, Logger } from "@nestjs/common";
import { GoogleGenAI, Type } from "@google/genai";
import type { BusinessModel } from "@prisma/client";
import type { CurrencyCode } from "../financial-engine/financial-engine.types.js";
import type { AiProvider, AiSuggestionInput, SuggestedHypotheses } from "./ai-provider.port.js";

const MODEL_NAME = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
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

  constructor() {
    this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  async suggestHypotheses(input: AiSuggestionInput): Promise<SuggestedHypotheses | null> {
    try {
      const response = await this.client.models.generateContent({
        model: MODEL_NAME,
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
      this.logger.warn(`Suggestion Gemini indisponible : ${(error as Error).message}`);
      return null;
    }
  }
}
```

- [ ] **Step 4: Vérifier le succès (GREEN)**

Run: `pnpm --filter api exec vitest run src/ai/gemini.provider.spec.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/ai/gemini.provider.ts apps/api/src/ai/gemini.provider.spec.ts
git commit -m "feat(api): GeminiProvider, extraction structuree via @google/genai"
```

---

## Task 4: `AiController` + `AiModule` + câblage `AppModule` (avec rate-limiting)

**Files:**
- Create: `apps/api/src/ai/ai.controller.ts`
- Create: `apps/api/src/ai/ai.module.ts`
- Create: `apps/api/src/ai/ai.controller.spec.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: `AI_PROVIDER`, `AiProvider` (Task 2), `SuggestHypothesesDto` (Task 2), `GeminiProvider` (Task 3).
- Produces: `POST /ideas/suggest-hypotheses` (200 avec `{ available: true; hypotheses: SuggestedHypotheses }` ou `{ available: false }` ; 400 si DTO invalide ; 429 au-delà de 10 req/min/IP). Consommé par le frontend (Task 5).

- [ ] **Step 1: Écrire le test HTTP (RED)**

Créer `apps/api/src/ai/ai.controller.spec.ts` :

```typescript
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { vi } from "vitest";
import { AiModule } from "./ai.module.js";
import { AI_PROVIDER, type AiProvider } from "./ai-provider.port.js";

function validPayload() {
  return {
    businessModel: "ECOMMERCE",
    rawDescription: "Vente de vêtements en ligne pour jeunes actifs.",
    currency: "XOF",
  };
}

describe("AiController (HTTP) — suggestion", () => {
  let app: INestApplication;
  const aiProvider: AiProvider = { suggestHypotheses: vi.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AiModule] })
      .overrideProvider(AI_PROVIDER)
      .useValue(aiProvider)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns available:true with the suggestion when the provider succeeds", async () => {
    vi.mocked(aiProvider.suggestHypotheses).mockResolvedValueOnce({
      price: 5000,
      volume: 50,
      variableCostPerUnit: 2000,
      fixedCosts: 100000,
    });

    const response = await request(app.getHttpServer())
      .post("/ideas/suggest-hypotheses")
      .send(validPayload())
      .expect(200);

    expect(response.body).toEqual({
      available: true,
      hypotheses: { price: 5000, volume: 50, variableCostPerUnit: 2000, fixedCosts: 100000 },
    });
  });

  it("returns available:false when the provider has no suggestion", async () => {
    vi.mocked(aiProvider.suggestHypotheses).mockResolvedValueOnce(null);

    const response = await request(app.getHttpServer())
      .post("/ideas/suggest-hypotheses")
      .send(validPayload())
      .expect(200);

    expect(response.body).toEqual({ available: false });
  });

  it("rejects an invalid payload", async () => {
    await request(app.getHttpServer())
      .post("/ideas/suggest-hypotheses")
      .send({ ...validPayload(), currency: "JPY" })
      .expect(400);
  });
});

describe("AiController (HTTP) — rate limiting", () => {
  let app: INestApplication;
  const aiProvider: AiProvider = { suggestHypotheses: vi.fn().mockResolvedValue(null) };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AiModule] })
      .overrideProvider(AI_PROVIDER)
      .useValue(aiProvider)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("allows 10 requests per minute then rejects the 11th with 429", async () => {
    for (let i = 0; i < 10; i++) {
      await request(app.getHttpServer()).post("/ideas/suggest-hypotheses").send(validPayload()).expect(200);
    }

    await request(app.getHttpServer()).post("/ideas/suggest-hypotheses").send(validPayload()).expect(429);
  });
});
```

Note : le test de rate-limiting utilise sa propre instance d'app (son propre `beforeAll`), pour partir d'un compteur de throttling à zéro, indépendant des 3 premiers tests.

- [ ] **Step 2: Vérifier l'échec (RED)**

Run: `pnpm --filter api exec vitest run src/ai/ai.controller.spec.ts`
Expected: FAIL, `Cannot find module './ai.module.js'`.

- [ ] **Step 3: Implémenter `AiController`**

Créer `apps/api/src/ai/ai.controller.ts` :

```typescript
import { Body, Controller, Inject, Post, UseGuards } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { AI_PROVIDER, type AiProvider } from "./ai-provider.port.js";
import { SuggestHypothesesDto } from "./dto/suggest-hypotheses.dto.js";

@Controller("ideas")
export class AiController {
  constructor(@Inject(AI_PROVIDER) private readonly aiProvider: AiProvider) {}

  @Post("suggest-hypotheses")
  @UseGuards(ThrottlerGuard)
  async suggestHypotheses(@Body() dto: SuggestHypothesesDto) {
    const hypotheses = await this.aiProvider.suggestHypotheses(dto);

    if (!hypotheses) {
      return { available: false as const };
    }

    return { available: true as const, hypotheses };
  }
}
```

- [ ] **Step 4: Implémenter `AiModule`**

Créer `apps/api/src/ai/ai.module.ts` :

```typescript
import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { AiController } from "./ai.controller.js";
import { GeminiProvider } from "./gemini.provider.js";
import { AI_PROVIDER } from "./ai-provider.port.js";

@Module({
  imports: [ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 10 }])],
  controllers: [AiController],
  providers: [{ provide: AI_PROVIDER, useClass: GeminiProvider }],
})
export class AiModule {}
```

Note : `ThrottlerModule.forRoot(...)` est importé ici, dans `AiModule`, et non dans `AppModule` — ça garde le rate-limiting scopé à cet endpoint sans toucher `IdeasController`/`AppController` (Global Constraints).

- [ ] **Step 5: Vérifier le succès (GREEN)**

Run: `pnpm --filter api exec vitest run src/ai/ai.controller.spec.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Câbler `AiModule` dans `AppModule`**

Modifier `apps/api/src/app.module.ts` :

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { FinancialEngineModule } from './financial-engine/financial-engine.module.js';
import { IdeasModule } from './ideas/ideas.module.js';
import { AiModule } from './ai/ai.module.js';

@Module({
  imports: [FinancialEngineModule, IdeasModule, AiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 7: Lancer toute la suite, build, lint**

Run: `pnpm --filter api test && pnpm --filter api build && pnpm --filter api lint`
Expected: tous les tests passent (Phase 2 + Phase 3 + Phase 4), build et lint sans erreur.

- [ ] **Step 8: Smoke test manuel (chemin dégradé, sans clé API)**

Run (deux terminaux, `docker compose up -d` déjà fait en Phase 3) :
```bash
pnpm --filter api start:dev &
sleep 5
curl -s -X POST http://localhost:3001/ideas/suggest-hypotheses -H "Content-Type: application/json" -d '{"businessModel":"ECOMMERCE","rawDescription":"Vente de vetements en ligne","currency":"XOF"}'
```
Expected : réponse JSON `{"available":false}` (aucune clé `GEMINI_API_KEY` valide en local à ce stade), code 200, l'API ne plante pas.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/ai/ai.controller.ts apps/api/src/ai/ai.module.ts apps/api/src/ai/ai.controller.spec.ts apps/api/src/app.module.ts
git commit -m "feat(api): AiController, AiModule, endpoint POST /ideas/suggest-hypotheses avec rate-limiting"
```

---

## Task 5: Client API frontend + reducer

**Files:**
- Modify: `apps/web/src/lib/ideas-api.ts`
- Modify: `apps/web/src/components/wizard/wizard-reducer.ts`

**Interfaces:**
- Produces : `SuggestHypothesesInput` (`{ businessModel: BusinessModel; rawDescription: string; currency: CurrencyCode }`), `SuggestHypothesesResponse` (`{ available: true; hypotheses: HypothesesInput } | { available: false }`), fonction `suggestHypotheses(input: SuggestHypothesesInput): Promise<SuggestHypothesesResponse>` (`apps/web/src/lib/ideas-api.ts`) ; action `SET_HYPOTHESES` et champ `wasSuggested: boolean` sur `WizardState` (`apps/web/src/components/wizard/wizard-reducer.ts`). Consommés par `commencer/page.tsx` et `StepHypotheses` (Task 6).

Pas de suite de tests automatisée sur `apps/web` (contrainte globale héritée de la Phase 3). Vérification à la Task 6.

- [ ] **Step 1: Ajouter `suggestHypotheses` au client API**

Modifier `apps/web/src/lib/ideas-api.ts`, ajouter après `createIdea` :

```typescript
export interface SuggestHypothesesInput {
  businessModel: BusinessModel;
  rawDescription: string;
  currency: CurrencyCode;
}

export type SuggestHypothesesResponse =
  | { available: true; hypotheses: HypothesesInput }
  | { available: false };

export async function suggestHypotheses(input: SuggestHypothesesInput): Promise<SuggestHypothesesResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/ideas/suggest-hypotheses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      return { available: false };
    }

    return (await response.json()) as SuggestHypothesesResponse;
  } catch {
    return { available: false };
  }
}
```

Note : contrairement à `createIdea`, cette fonction n'expose jamais d'exception à l'appelant — un problème réseau ou une réponse HTTP non-200 devient `{ available: false }`, cohérent avec le mode dégradé silencieux (Global Constraints).

- [ ] **Step 2: Ajouter l'action `SET_HYPOTHESES` et l'état `wasSuggested`**

Modifier `apps/web/src/components/wizard/wizard-reducer.ts` :

```typescript
import type { BusinessModel, CurrencyCode, HypothesesInput } from "@/lib/ideas-api";

export type WizardStep = "business-type" | "description" | "hypotheses" | "results";

export interface WizardState {
  step: WizardStep;
  businessModel: BusinessModel | null;
  rawDescription: string;
  currency: CurrencyCode;
  hypotheses: HypothesesInput;
  wasSuggested: boolean;
}

export type WizardAction =
  | { type: "SELECT_BUSINESS_MODEL"; businessModel: BusinessModel }
  | { type: "SET_DESCRIPTION"; rawDescription: string }
  | { type: "SET_CURRENCY"; currency: CurrencyCode }
  | { type: "SET_HYPOTHESIS"; key: keyof HypothesesInput; value: number }
  | { type: "SET_HYPOTHESES"; hypotheses: HypothesesInput }
  | { type: "GO_TO_STEP"; step: WizardStep };

export const initialWizardState: WizardState = {
  step: "business-type",
  businessModel: null,
  rawDescription: "",
  currency: "XOF",
  hypotheses: { price: 0, volume: 0, variableCostPerUnit: 0, fixedCosts: 0 },
  wasSuggested: false,
};

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "SELECT_BUSINESS_MODEL":
      return { ...state, businessModel: action.businessModel, step: "description" };
    case "SET_DESCRIPTION":
      return { ...state, rawDescription: action.rawDescription };
    case "SET_CURRENCY":
      return { ...state, currency: action.currency };
    case "SET_HYPOTHESIS":
      return { ...state, hypotheses: { ...state.hypotheses, [action.key]: action.value }, wasSuggested: false };
    case "SET_HYPOTHESES":
      return { ...state, hypotheses: action.hypotheses, wasSuggested: true };
    case "GO_TO_STEP":
      return { ...state, step: action.step };
    default:
      return state;
  }
}
```

Note : `SET_HYPOTHESIS` (champ unique, édition manuelle) repasse `wasSuggested` à `false` — dès que l'utilisateur corrige un champ, le texte « suggéré par l'IA » (Task 6) n'a plus lieu d'être affiché.

- [ ] **Step 3: Vérifier que le projet compile toujours**

Run: `pnpm --filter web lint && pnpm --filter web build`
Expected: succès (ces changements ne sont pas encore branchés sur la page, doivent juste être syntaxiquement/typiquement valides).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/ideas-api.ts apps/web/src/components/wizard/wizard-reducer.ts
git commit -m "feat(web): client suggestHypotheses + action SET_HYPOTHESES du wizard"
```

---

## Task 6: Transition asynchrone Description → Hypothèses + indice IA + vérification bout en bout

**Files:**
- Modify: `apps/web/src/components/wizard/StepDescription.tsx`
- Modify: `apps/web/src/app/commencer/page.tsx`
- Modify: `apps/web/src/components/wizard/StepHypotheses.tsx`

**Interfaces:**
- Consumes: `suggestHypotheses` (Task 5), action `SET_HYPOTHESES` (Task 5).
- Produces: `StepDescription` accepte une nouvelle prop `loading: boolean` ; `commencer/page.tsx` expose un `handleDescriptionNext` asynchrone ; `StepHypotheses` accepte une nouvelle prop `wasSuggested: boolean`. Route `/commencer` fonctionnelle bout en bout avec extraction IA (ou repli silencieux).

Les trois fichiers changent ensemble dans cette tâche (pas de découpage en plusieurs tâches) : `page.tsx` passe une prop à `StepHypotheses` dès l'étape 2 ci-dessous, donc le projet ne compile qu'une fois les trois fichiers modifiés — un découpage laisserait un état intermédiaire non-compilable.

- [ ] **Step 1: Ajouter l'état de chargement à `StepDescription`**

Modifier `apps/web/src/components/wizard/StepDescription.tsx` :

```typescript
export function StepDescription({
  value,
  onChange,
  onNext,
  onBack,
  loading,
}: {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
  loading: boolean;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-center text-h2-mobile font-semibold md:text-h2">Decris ton idee</h1>
      <p className="text-center text-body text-text-secondary">
        Quelques phrases suffisent. Ca t&apos;aidera plus tard quand l&apos;IA proposera des hypotheses.
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        placeholder="Ex : je veux vendre des vetements en ligne pour jeunes actifs, livraison a domicile..."
        className="rounded-lg border border-border bg-surface p-4 text-body text-text-primary focus:border-accent-emerald focus:outline-none"
      />
      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="text-body font-medium text-text-secondary">
          Retour
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={value.trim().length === 0 || loading}
          className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-6 py-3 text-body font-semibold text-white disabled:opacity-40"
        >
          {loading ? "Analyse en cours..." : "Continuer"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rendre la transition asynchrone dans la page wizard**

Modifier `apps/web/src/app/commencer/page.tsx` :

```typescript
"use client";

import { useReducer, useState } from "react";
import { WizardProgress } from "@/components/wizard/WizardProgress";
import { StepBusinessType } from "@/components/wizard/StepBusinessType";
import { StepDescription } from "@/components/wizard/StepDescription";
import { StepHypotheses } from "@/components/wizard/StepHypotheses";
import { StepResults } from "@/components/wizard/StepResults";
import { initialWizardState, wizardReducer } from "@/components/wizard/wizard-reducer";
import { createIdea, suggestHypotheses, type CreateIdeaResponse } from "@/lib/ideas-api";

export default function CommencerPage() {
  const [state, dispatch] = useReducer(wizardReducer, initialWizardState);
  const [suggesting, setSuggesting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<CreateIdeaResponse | null>(null);

  async function handleDescriptionNext() {
    if (!state.businessModel) return;
    setSuggesting(true);
    try {
      const suggestion = await suggestHypotheses({
        businessModel: state.businessModel,
        rawDescription: state.rawDescription,
        currency: state.currency,
      });
      if (suggestion.available) {
        dispatch({ type: "SET_HYPOTHESES", hypotheses: suggestion.hypotheses });
      }
    } finally {
      setSuggesting(false);
      dispatch({ type: "GO_TO_STEP", step: "hypotheses" });
    }
  }

  async function handleSubmit() {
    if (!state.businessModel) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createIdea({
        businessModel: state.businessModel,
        rawDescription: state.rawDescription,
        currency: state.currency,
        hypotheses: state.hypotheses,
      });
      setResponse(result);
      dispatch({ type: "GO_TO_STEP", step: "results" });
    } catch {
      setError("Le calcul a echoue. Verifie tes valeurs et reessaie.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-12 px-4 py-16 sm:px-6">
      <WizardProgress currentStep={state.step} />

      {state.step === "business-type" && (
        <StepBusinessType onSelect={(businessModel) => dispatch({ type: "SELECT_BUSINESS_MODEL", businessModel })} />
      )}

      {state.step === "description" && (
        <StepDescription
          value={state.rawDescription}
          onChange={(rawDescription) => dispatch({ type: "SET_DESCRIPTION", rawDescription })}
          onNext={handleDescriptionNext}
          onBack={() => dispatch({ type: "GO_TO_STEP", step: "business-type" })}
          loading={suggesting}
        />
      )}

      {state.step === "hypotheses" && state.businessModel && (
        <StepHypotheses
          businessModel={state.businessModel}
          hypotheses={state.hypotheses}
          currency={state.currency}
          wasSuggested={state.wasSuggested}
          onHypothesisChange={(key, value) => dispatch({ type: "SET_HYPOTHESIS", key, value })}
          onCurrencyChange={(currency) => dispatch({ type: "SET_CURRENCY", currency })}
          onSubmit={handleSubmit}
          onBack={() => dispatch({ type: "GO_TO_STEP", step: "description" })}
          submitting={submitting}
          error={error}
        />
      )}

      {state.step === "results" && response && (
        <StepResults result={response.result} breakEven={response.breakEven} />
      )}
    </main>
  );
}
```

Note : `suggestHypotheses` ne lève jamais d'exception (Task 5, Step 1) — le `finally` seul suffit pour toujours transitionner vers l'écran Hypothèses, qu'il y ait suggestion ou non.

- [ ] **Step 3: Ajouter le texte contextuel « suggéré par l'IA » à `StepHypotheses`**

Modifier `apps/web/src/components/wizard/StepHypotheses.tsx` :

```typescript
import { CURRENCIES, type BusinessModel, type CurrencyCode, type HypothesesInput } from "@/lib/ideas-api";

const HINTS: Record<BusinessModel, string> = {
  ECOMMERCE: "Inclut cout produit, livraison et commissions.",
  FORMATION: "Inclut cout de production et plateforme.",
  EBOOK: "Inclut commissions et cout de creation.",
  SERVICE: "Inclut sous-traitance et outils.",
  PRODUIT_PHYSIQUE: "Inclut matieres, production et logistique.",
  AUTRE: "Regroupe tous tes couts qui varient avec le volume vendu.",
};

const FIELDS: { key: keyof HypothesesInput; label: string }[] = [
  { key: "price", label: "Prix de vente unitaire" },
  { key: "volume", label: "Volume de ventes par mois" },
  { key: "variableCostPerUnit", label: "Cout variable par unite" },
  { key: "fixedCosts", label: "Couts fixes par mois" },
];

export function StepHypotheses({
  businessModel,
  hypotheses,
  currency,
  wasSuggested,
  onHypothesisChange,
  onCurrencyChange,
  onSubmit,
  onBack,
  submitting,
  error,
}: {
  businessModel: BusinessModel;
  hypotheses: HypothesesInput;
  currency: CurrencyCode;
  wasSuggested: boolean;
  onHypothesisChange: (key: keyof HypothesesInput, value: number) => void;
  onCurrencyChange: (currency: CurrencyCode) => void;
  onSubmit: () => void;
  onBack: () => void;
  submitting: boolean;
  error: string | null;
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <h1 className="text-center text-h2-mobile font-semibold md:text-h2">Tes hypotheses</h1>
      {wasSuggested ? (
        <p className="text-center text-small text-accent-emerald">
          Suggere par l&apos;IA a partir de ta description : verifie et corrige si besoin.
        </p>
      ) : null}
      <label className="flex flex-col gap-2 text-small text-text-secondary">
        Devise
        <select
          value={currency}
          onChange={(e) => onCurrencyChange(e.target.value as CurrencyCode)}
          className="rounded-lg border border-border bg-surface p-3 text-body text-text-primary"
        >
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </label>
      {FIELDS.map((field) => (
        <label key={field.key} className="flex flex-col gap-2 text-small text-text-secondary">
          {field.label}
          {(field.key === "variableCostPerUnit" || field.key === "fixedCosts") && (
            <span className="text-micro">{HINTS[businessModel]}</span>
          )}
          <input
            type="number"
            min={0}
            value={hypotheses[field.key]}
            onChange={(e) => onHypothesisChange(field.key, Number(e.target.value))}
            className="rounded-lg border border-border bg-surface p-3 text-right text-body tabular-nums text-text-primary focus:border-accent-emerald focus:outline-none"
          />
        </label>
      ))}
      {error ? <p className="text-small text-error">{error}</p> : null}
      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="text-body font-medium text-text-secondary">
          Retour
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-6 py-3 text-body font-semibold text-white disabled:opacity-40"
        >
          {submitting ? "Calcul en cours..." : "Voir mes resultats"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Vérifier lint + build**

Run: `pnpm --filter web lint && pnpm --filter web build`
Expected: succès (les trois fichiers de cette tâche sont maintenant cohérents entre eux).

- [ ] **Step 5: Vérification manuelle — chemin dégradé (obligatoire, ne dépend d'aucune clé API)**

Prérequis : `docker compose up -d`, `pnpm --filter api start:dev &`, `pnpm --filter web dev &`, `apps/api/.env` **sans** `GEMINI_API_KEY` valide (vide ou absent — c'est l'état par défaut après Task 1).

Avec un navigateur piloté (Playwright) :
1. Naviguer vers `/commencer`, choisir un type de business, remplir la description, cliquer « Continuer ».
2. Vérifier l'état de chargement bref sur le bouton (« Analyse en cours... »).
3. Vérifier l'arrivée sur l'écran Hypothèses avec les champs à 0 (comme en Phase 3) et **aucun** texte « suggéré par l'IA ».
4. Vérifier `console --errors` : 0 erreur (l'échec de suggestion ne doit jamais apparaître comme une erreur JS).
5. Terminer le parcours (remplir manuellement, soumettre) pour confirmer qu'il reste fonctionnel de bout en bout.

- [ ] **Step 6: Vérification manuelle — chemin de succès (nécessite une vraie clé `GEMINI_API_KEY`)**

Si une clé Google AI Studio est disponible : la renseigner dans `apps/api/.env`, redémarrer `pnpm --filter api start:dev`, refaire le parcours avec une description un peu détaillée (ex. « Je vends des vêtements en ligne pour jeunes actifs à Cotonou, livraison à domicile, environ 5000 FCFA la pièce »), et vérifier que l'écran Hypothèses arrive prérempli avec des valeurs plausibles et le texte « Suggéré par l'IA... » visible.

Si aucune clé n'est disponible à ce stade : documenter cette étape comme non vérifiée (pas comme échouée) dans le message de fin de tâche — le chemin dégradé (Step 5) reste la vérification bloquante de cette tâche.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/wizard/StepDescription.tsx apps/web/src/app/commencer/page.tsx apps/web/src/components/wizard/StepHypotheses.tsx
git commit -m "feat(web): transition asynchrone Description -> Hypotheses avec suggestion IA"
```

---

## Après ce plan

- `tasks/TODO.md` et `tasks/CHANGELOG.md` mis à jour (item Phase 4 coché, décisions notées) dans un commit dédié une fois toutes les tâches validées.
- Si la vérification du chemin de succès (Task 6, Step 6) n'a pas pu être faite faute de clé `GEMINI_API_KEY`, le signaler explicitement à l'humain plutôt que de la marquer comme faite.
- La dette UX déjà notée dans `tasks/TODO.md` (vocabulaire trop jargonneux de l'écran Hypothèses) reste à traiter séparément, après cette phase — hors scope de ce plan.
- Prochaine phase naturelle : Phase 5 (module « Et si ? » et scénarios, le moteur les supporte déjà).
