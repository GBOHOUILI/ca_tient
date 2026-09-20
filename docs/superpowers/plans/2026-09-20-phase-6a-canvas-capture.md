# Phase 6a, capture des blocs manquants du canvas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capturer les 7 blocs qualitatifs manquants du business model canvas (proposition de valeur, segments clients, canaux, relations clients, ressources clés, activités clés, partenaires clés) via une suggestion IA validée par l'utilisateur, persistés en base — préparation de contenu pour le rapport final enrichi (Phase 6b, hors scope ici).

**Architecture:** Backend NestJS — nouveau modèle Prisma `CanvasBlock` (pattern `Hypothesis` existant), extension du provider IA existant (`GeminiProvider`) avec une 2e méthode, nouvel endpoint de suggestion (stateless, mirrors `suggest-hypotheses`) et un endpoint de persistance (`PATCH /ideas/:id/canvas-blocks`). Frontend Next.js — nouvelle étape de wizard `StepCanvas` entre "Hypothèses" et "Résultats", appel IA déclenché en parallèle de `createIdea` (`Promise.all`), échec de suggestion silencieux (comme Phase 4), échec de sauvegarde bloquant avec retry.

**Tech Stack:** NestJS 12 + Prisma 7.10.0 + `@google/genai` (backend), Next.js 16 + React 19 (frontend), vitest (tests backend uniquement — pas de suite automatisée `apps/web`, précédent établi).

**Spec:** docs/superpowers/specs/2026-09-20-phase-6a-canvas-capture-design.md

## Global Constraints

- Les calculs financiers ne sont jamais confiés à l'IA (`CLAUDE.md` #3) — cette phase ne touche à aucun calcul ; les 7 blocs sont du texte qualitatif, jamais un chiffre affiché à l'utilisateur.
- N'invente pas de couleurs/typographies/composants à la volée (`CLAUDE.md` #8) — `StepCanvas.tsx` réutilise exactement les tokens déjà utilisés par `StepHypotheses.tsx` (`border-border`, `bg-surface`, `text-text-primary`, `accent-emerald`, `text-error`, `text-small`, `text-h2-mobile`/`text-h2`).
- Stack imposée : Next.js + TypeScript (frontend), NestJS (backend), PostgreSQL (`CLAUDE.md` #9) — aucun changement de stack dans cette phase.
- `CANVAS_BLOCK_KEYS` est redéfini identiquement côté `apps/api` (`apps/api/src/ai/ai-provider.port.ts`) et côté `apps/web` (`apps/web/src/lib/ideas-api.ts`) — pas de nouveau package partagé, même convention que `BusinessModel`/`CurrencyCode` déjà dupliqués entre les deux apps.
- Longueur de chaque bloc de canvas plafonnée à 500 caractères (validation `class-validator` côté backend, `maxLength` HTML côté frontend) — un bloc de canvas est une note courte, pas un paragraphe.
- Le flag `source` s'applique à l'ensemble des 7 blocs en un seul envoi (pas de suivi par bloc) — mirrors exactement le comportement existant de `wasSuggested` sur `StepHypotheses`/`wizard-reducer.ts`.

---

### Task 1: Modèle de données `CanvasBlock`

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Test: vérification manuelle (migration + requête Prisma Studio ou script ponctuel), pas de test unitaire dédié — ce sera couvert indirectement par les tests de Task 3 (`IdeasService.updateCanvasBlocks`)

**Interfaces:**
- Produces: modèle Prisma `CanvasBlock { id, ideaId, key, content, source }`, relation inverse `Idea.canvasBlocks`, contrainte unique `@@unique([ideaId, key])` (nom généré par Prisma : `ideaId_key`, utilisé par Task 3 pour l'`upsert`)

- [ ] **Step 1: Ajouter le modèle au schéma**

Dans `apps/api/prisma/schema.prisma`, ajouter à la fin du fichier (après le modèle `Simulation` existant) :

```prisma
model CanvasBlock {
  id      String @id @default(cuid())
  ideaId  String
  idea    Idea   @relation(fields: [ideaId], references: [id], onDelete: Cascade)
  key     String
  content String
  source  String

  @@unique([ideaId, key])
}
```

Et ajouter la relation inverse sur le modèle `Idea` existant (à côté des champs `hypotheses`/`simulations` déjà présents) :

```prisma
model Idea {
  id             String        @id @default(cuid())
  businessModel  BusinessModel
  rawDescription String
  currency       String
  createdAt      DateTime      @default(now())
  hypotheses     Hypothesis[]
  simulations    Simulation[]
  canvasBlocks   CanvasBlock[]
}
```

- [ ] **Step 2: Générer et appliquer la migration**

Run (depuis `apps/api`) : `pnpm exec prisma migrate dev --name add_canvas_block`

Expected: la commande crée un nouveau dossier sous `apps/api/prisma/migrations/`, régénère le client Prisma (`@prisma/client`), aucune erreur. Le conteneur Postgres local doit tourner (`docker compose ps` depuis la racine du repo — port hôte 5433, voir `docs/DECISIONS.md`).

- [ ] **Step 3: Vérifier que le modèle est utilisable**

`tsx` n'est pas une dépendance du monorepo — écrire un script Node pur (le client Prisma généré est du JS simple, pas besoin de compilation TypeScript pour ce script ponctuel). Créer un fichier temporaire `apps/api/scratch-canvas-check.mjs` :

```javascript
import { PrismaClient } from "@prisma/client";

process.loadEnvFile();
const prisma = new PrismaClient();

const idea = await prisma.idea.create({
  data: { businessModel: "ECOMMERCE", rawDescription: "test", currency: "XOF" },
});
const block = await prisma.canvasBlock.create({
  data: { ideaId: idea.id, key: "valueProposition", content: "Un test", source: "utilisateur_edite" },
});
console.log("OK", block.id);

await prisma.canvasBlock.deleteMany({ where: { ideaId: idea.id } });
await prisma.idea.delete({ where: { id: idea.id } });
await prisma.$disconnect();
```

Run (depuis `apps/api`) : `node scratch-canvas-check.mjs`

Expected: affiche `OK <id>` puis se termine sans erreur. Supprimer ensuite le fichier :

```bash
rm apps/api/scratch-canvas-check.mjs
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations
git commit -m "feat(api): ajoute le modele CanvasBlock (Phase 6a)"
```

---

### Task 2: Backend — suggestion IA des blocs de canvas

**Files:**
- Modify: `apps/api/src/ai/ai-provider.port.ts`
- Modify: `apps/api/src/ai/gemini.provider.ts`
- Modify: `apps/api/src/ai/ai.controller.ts`
- Test: `apps/api/src/ai/gemini.provider.spec.ts` (ajouts)
- Test: `apps/api/src/ai/ai.controller.spec.ts` (ajouts)

**Interfaces:**
- Consumes: `AiSuggestionInput` déjà existant (`businessModel`, `rawDescription`, `currency`) — réutilisé tel quel
- Produces: `CANVAS_BLOCK_KEYS` (const array de 7 clés), `CanvasBlockKey` (union type), `SuggestedCanvasBlocks` (`Record<CanvasBlockKey, string>`), méthode `AiProvider.suggestCanvasBlocks(input: AiSuggestionInput): Promise<SuggestedCanvasBlocks | null>`, route `POST /ideas/suggest-canvas-blocks` retournant `{ available: true, blocks: SuggestedCanvasBlocks } | { available: false }` — consommés par Task 3 (import de `CANVAS_BLOCK_KEYS`/`CanvasBlockKey`) et par le frontend (Task 4)

- [ ] **Step 1: Écrire les tests qui échouent pour `GeminiProvider.suggestCanvasBlocks`**

Modifier `apps/api/src/ai/gemini.provider.spec.ts` — ajouter en bas du fichier (après le `describe("GeminiProvider.suggestHypotheses", ...)` existant, sans le toucher) :

```typescript
describe("GeminiProvider.suggestCanvasBlocks", () => {
  beforeEach(() => {
    generateContentMock.mockReset();
  });

  function validCanvasBlocks() {
    return {
      valueProposition: "Des sacs faits main livres a domicile.",
      customerSegments: "Jeunes actifs urbains, 20-35 ans.",
      channels: "Instagram et bouche-a-oreille.",
      customerRelationships: "Suivi par WhatsApp apres chaque commande.",
      keyResources: "Machine a coudre, stock de tissu.",
      keyActivities: "Production, livraison, publication sur les reseaux.",
      keyPartners: "Fournisseur de tissu, livreur local.",
    };
  }

  it("returns the parsed canvas blocks when Gemini responds with valid JSON", async () => {
    generateContentMock.mockResolvedValue({ text: JSON.stringify(validCanvasBlocks()) });

    const provider = new GeminiProvider();
    const result = await provider.suggestCanvasBlocks(input());

    expect(result).toEqual(validCanvasBlocks());
  });

  it("returns null when the response is not valid JSON", async () => {
    generateContentMock.mockResolvedValue({ text: "ceci n'est pas du JSON" });

    const provider = new GeminiProvider();
    const result = await provider.suggestCanvasBlocks(input());

    expect(result).toBeNull();
  });

  it("returns null when a block is missing", async () => {
    const { keyPartners, ...incomplete } = validCanvasBlocks();
    generateContentMock.mockResolvedValue({ text: JSON.stringify(incomplete) });

    const provider = new GeminiProvider();
    const result = await provider.suggestCanvasBlocks(input());

    expect(result).toBeNull();
  });

  it("returns null when a block exceeds 500 characters", async () => {
    generateContentMock.mockResolvedValue({
      text: JSON.stringify({ ...validCanvasBlocks(), valueProposition: "a".repeat(501) }),
    });

    const provider = new GeminiProvider();
    const result = await provider.suggestCanvasBlocks(input());

    expect(result).toBeNull();
  });

  it("returns null when the SDK call throws", async () => {
    generateContentMock.mockRejectedValue(new Error("quota exceeded"));

    const provider = new GeminiProvider();
    const result = await provider.suggestCanvasBlocks(input());

    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `pnpm --filter api test -- gemini.provider.spec.ts`
Expected: FAIL — `provider.suggestCanvasBlocks is not a function` (la méthode n'existe pas encore)

- [ ] **Step 3: Ajouter `CANVAS_BLOCK_KEYS`/`CanvasBlockKey`/`SuggestedCanvasBlocks` au port**

Dans `apps/api/src/ai/ai-provider.port.ts`, remplacer le contenu du fichier par :

```typescript
import type { BusinessModel } from "@prisma/client";
import type { CurrencyCode } from "financial-engine";

export interface SuggestedHypotheses {
  price: number;
  volume: number;
  variableCostPerUnit: number;
  fixedCosts: number;
}

export const CANVAS_BLOCK_KEYS = [
  "valueProposition",
  "customerSegments",
  "channels",
  "customerRelationships",
  "keyResources",
  "keyActivities",
  "keyPartners",
] as const;

export type CanvasBlockKey = (typeof CANVAS_BLOCK_KEYS)[number];

export type SuggestedCanvasBlocks = Record<CanvasBlockKey, string>;

export interface AiSuggestionInput {
  businessModel: BusinessModel;
  rawDescription: string;
  currency: CurrencyCode;
}

export const AI_PROVIDER = Symbol("AI_PROVIDER");

export interface AiProvider {
  suggestHypotheses(input: AiSuggestionInput): Promise<SuggestedHypotheses | null>;
  suggestCanvasBlocks(input: AiSuggestionInput): Promise<SuggestedCanvasBlocks | null>;
}
```

- [ ] **Step 4: Implémenter `GeminiProvider.suggestCanvasBlocks`**

Dans `apps/api/src/ai/gemini.provider.ts`, modifier la ligne d'import existante pour inclure les nouveaux exports :

```typescript
import type { AiProvider, AiSuggestionInput, SuggestedHypotheses, SuggestedCanvasBlocks } from "./ai-provider.port.js";
import { CANVAS_BLOCK_KEYS } from "./ai-provider.port.js";
```

Ajouter après la fonction `buildPrompt` existante (ne pas la modifier) :

```typescript
function buildCanvasPrompt(input: AiSuggestionInput): string {
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
    "Reponds uniquement avec les 7 textes, chacun en francais, sans jargon, 500 caracteres maximum par bloc.",
  ].join("\n");
}

function parseSuggestedCanvasBlocks(text: string | undefined): SuggestedCanvasBlocks | null {
  if (!text) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;

  const record = parsed as Record<string, unknown>;
  const result = {} as SuggestedCanvasBlocks;

  for (const key of CANVAS_BLOCK_KEYS) {
    const value = record[key];
    if (typeof value !== "string" || value.trim().length === 0 || value.length > 500) return null;
    result[key] = value.trim();
  }

  return result;
}
```

Ajouter dans la classe `GeminiProvider`, après la méthode `suggestHypotheses` existante :

```typescript
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
```

Le mock `vi.mock("@google/genai", ...)` en tête de `gemini.provider.spec.ts` définit déjà `Type: { OBJECT: "OBJECT", INTEGER: "INTEGER" }` — ajouter `STRING: "STRING"` à cet objet (seule modification du bloc de mock existant) :

```typescript
vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(function () {
    return { models: { generateContent: generateContentMock } };
  }),
  Type: { OBJECT: "OBJECT", INTEGER: "INTEGER", STRING: "STRING" },
}));
```

- [ ] **Step 5: Lancer les tests et vérifier qu'ils passent**

Run: `pnpm --filter api test -- gemini.provider.spec.ts`
Expected: PASS — tous les tests, y compris les 5 nouveaux et les 4 existants de `suggestHypotheses`

- [ ] **Step 6: Écrire les tests qui échouent pour l'endpoint HTTP**

Modifier `apps/api/src/ai/ai.controller.spec.ts` — dans le premier `describe`, la ligne `const aiProvider: AiProvider = { suggestHypotheses: vi.fn() };` doit devenir :

```typescript
  const aiProvider: AiProvider = { suggestHypotheses: vi.fn(), suggestCanvasBlocks: vi.fn() };
```

(même changement dans le second `describe("AiController (HTTP) — rate limiting", ...)`, où la ligne devient `const aiProvider: AiProvider = { suggestHypotheses: vi.fn().mockResolvedValue(null), suggestCanvasBlocks: vi.fn().mockResolvedValue(null) };` — nécessaire car `AiProvider` a maintenant 2 méthodes obligatoires, sinon erreur de type TypeScript)

Ajouter un nouveau `describe` en bas du fichier :

```typescript
describe("AiController (HTTP) — suggestion canvas", () => {
  let app: INestApplication;
  const aiProvider: AiProvider = { suggestHypotheses: vi.fn(), suggestCanvasBlocks: vi.fn() };

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

  const canvasBlocks = {
    valueProposition: "Des sacs faits main livres a domicile.",
    customerSegments: "Jeunes actifs urbains.",
    channels: "Instagram.",
    customerRelationships: "WhatsApp.",
    keyResources: "Machine a coudre.",
    keyActivities: "Production.",
    keyPartners: "Fournisseur de tissu.",
  };

  it("returns available:true with the blocks when the provider succeeds", async () => {
    vi.mocked(aiProvider.suggestCanvasBlocks).mockResolvedValueOnce(canvasBlocks);

    const response = await request(app.getHttpServer())
      .post("/ideas/suggest-canvas-blocks")
      .send(validPayload())
      .expect(200);

    expect(response.body).toEqual({ available: true, blocks: canvasBlocks });
  });

  it("returns available:false when the provider has no suggestion", async () => {
    vi.mocked(aiProvider.suggestCanvasBlocks).mockResolvedValueOnce(null);

    const response = await request(app.getHttpServer())
      .post("/ideas/suggest-canvas-blocks")
      .send(validPayload())
      .expect(200);

    expect(response.body).toEqual({ available: false });
  });

  it("rejects an invalid payload", async () => {
    await request(app.getHttpServer())
      .post("/ideas/suggest-canvas-blocks")
      .send({ ...validPayload(), currency: "JPY" })
      .expect(400);
  });
});
```

- [ ] **Step 7: Lancer les tests et vérifier qu'ils échouent**

Run: `pnpm --filter api test -- ai.controller.spec.ts`
Expected: FAIL — d'abord une erreur de compilation TypeScript (`suggestCanvasBlocks` manquant sur l'objet `aiProvider` avant le Step 6b, ou route `404` sur `/ideas/suggest-canvas-blocks` une fois le typage corrigé)

- [ ] **Step 8: Ajouter la route sur `AiController`**

Dans `apps/api/src/ai/ai.controller.ts`, ajouter après la méthode `suggestHypotheses` existante :

```typescript
  @Post("suggest-canvas-blocks")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  async suggestCanvasBlocks(@Body() dto: SuggestHypothesesDto) {
    const blocks = await this.aiProvider.suggestCanvasBlocks(dto);

    if (!blocks) {
      return { available: false as const };
    }

    return { available: true as const, blocks };
  }
```

(réutilise `SuggestHypothesesDto` déjà importé en tête de fichier — aucun nouvel import nécessaire dans ce fichier)

- [ ] **Step 9: Lancer les tests et vérifier qu'ils passent**

Run: `pnpm --filter api test -- ai.controller.spec.ts gemini.provider.spec.ts`
Expected: PASS — tous les tests des deux fichiers

- [ ] **Step 10: Lint et build**

Run: `pnpm --filter api lint && pnpm --filter api build`
Expected: aucune erreur

- [ ] **Step 11: Commit**

```bash
git add apps/api/src/ai
git commit -m "feat(api): suggestion IA des blocs de canvas (Phase 6a)"
```

---

### Task 3: Backend — persistance des blocs de canvas

**Files:**
- Create: `apps/api/src/ideas/dto/update-canvas-blocks.dto.ts`
- Create: `apps/api/src/ideas/dto/update-canvas-blocks.dto.spec.ts`
- Modify: `apps/api/src/ideas/ideas.service.ts`
- Modify: `apps/api/src/ideas/ideas.controller.ts`
- Test: `apps/api/src/ideas/ideas.service.spec.ts` (ajouts)
- Test: `apps/api/src/ideas/ideas.controller.spec.ts` (ajouts)

**Interfaces:**
- Consumes: `CANVAS_BLOCK_KEYS`/`CanvasBlockKey` de `apps/api/src/ai/ai-provider.port.ts` (Task 2), modèle Prisma `CanvasBlock` (Task 1)
- Produces: route `PATCH /ideas/:id/canvas-blocks`, méthode `IdeasService.updateCanvasBlocks(ideaId: string, dto: UpdateCanvasBlocksDto): Promise<void>` — consommés par le frontend (Task 4)

- [ ] **Step 1: Écrire les tests qui échouent pour le DTO**

Créer `apps/api/src/ideas/dto/update-canvas-blocks.dto.spec.ts` :

```typescript
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { UpdateCanvasBlocksDto } from "./update-canvas-blocks.dto.js";

function validPayload() {
  return {
    blocks: [
      { key: "valueProposition", content: "Des sacs faits main." },
      { key: "customerSegments", content: "Jeunes actifs urbains." },
      { key: "channels", content: "Instagram." },
      { key: "customerRelationships", content: "WhatsApp." },
      { key: "keyResources", content: "Machine a coudre." },
      { key: "keyActivities", content: "Production." },
      { key: "keyPartners", content: "Fournisseur de tissu." },
    ],
    source: "utilisateur_edite",
  };
}

describe("UpdateCanvasBlocksDto", () => {
  it("accepts a valid payload", async () => {
    const dto = plainToInstance(UpdateCanvasBlocksDto, validPayload());
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it("rejects fewer than 7 blocks", async () => {
    const payload = validPayload();
    payload.blocks = payload.blocks.slice(0, 6);
    const dto = plainToInstance(UpdateCanvasBlocksDto, payload);
    const errors = await validate(dto);

    expect(errors.some((e) => e.property === "blocks")).toBe(true);
  });

  it("rejects an unknown block key", async () => {
    const payload = validPayload();
    payload.blocks[0] = { key: "unknownBlock", content: "x" };
    const dto = plainToInstance(UpdateCanvasBlocksDto, payload);
    const errors = await validate(dto);

    const blocksError = errors.find((e) => e.property === "blocks");
    expect(blocksError?.children?.some((c) => c.children?.some((cc) => cc.property === "key"))).toBe(true);
  });

  it("rejects a block content over 500 characters", async () => {
    const payload = validPayload();
    payload.blocks[0].content = "a".repeat(501);
    const dto = plainToInstance(UpdateCanvasBlocksDto, payload);
    const errors = await validate(dto);

    const blocksError = errors.find((e) => e.property === "blocks");
    expect(blocksError?.children?.some((c) => c.children?.some((cc) => cc.property === "content"))).toBe(true);
  });

  it("rejects an invalid source", async () => {
    const dto = plainToInstance(UpdateCanvasBlocksDto, { ...validPayload(), source: "autre" });
    const errors = await validate(dto);

    expect(errors.some((e) => e.property === "source")).toBe(true);
  });
});
```

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `pnpm --filter api test -- update-canvas-blocks.dto.spec.ts`
Expected: FAIL — le fichier `update-canvas-blocks.dto.ts` n'existe pas encore

- [ ] **Step 3: Créer le DTO**

Créer `apps/api/src/ideas/dto/update-canvas-blocks.dto.ts` :

```typescript
import { ArrayMaxSize, ArrayMinSize, IsIn, IsNotEmpty, IsString, MaxLength, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { CANVAS_BLOCK_KEYS, type CanvasBlockKey } from "../../ai/ai-provider.port.js";

const SOURCES = ["ia_suggere", "utilisateur_edite"] as const;

export class CanvasBlockDto {
  @IsIn(CANVAS_BLOCK_KEYS)
  key!: CanvasBlockKey;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  content!: string;
}

export class UpdateCanvasBlocksDto {
  @ValidateNested({ each: true })
  @Type(() => CanvasBlockDto)
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  blocks!: CanvasBlockDto[];

  @IsIn(SOURCES)
  source!: (typeof SOURCES)[number];
}
```

- [ ] **Step 4: Lancer les tests et vérifier qu'ils passent**

Run: `pnpm --filter api test -- update-canvas-blocks.dto.spec.ts`
Expected: PASS — les 5 tests

- [ ] **Step 5: Écrire les tests qui échouent pour `IdeasService.updateCanvasBlocks`**

Modifier `apps/api/src/ideas/ideas.service.spec.ts` — ajouter en bas du fichier (après le `describe("IdeasService.findOne", ...)` existant) :

```typescript
describe("IdeasService.updateCanvasBlocks", () => {
  const prisma = new PrismaService();
  const service = new IdeasService(prisma, new FinancialEngineService());

  beforeAll(async () => {
    await prisma.onModuleInit();
  });

  afterEach(async () => {
    await prisma.idea.deleteMany();
  });

  afterAll(async () => {
    await prisma.onModuleDestroy();
  });

  function canvasPayload() {
    return {
      blocks: [
        { key: "valueProposition" as const, content: "Des sacs faits main." },
        { key: "customerSegments" as const, content: "Jeunes actifs urbains." },
        { key: "channels" as const, content: "Instagram." },
        { key: "customerRelationships" as const, content: "WhatsApp." },
        { key: "keyResources" as const, content: "Machine a coudre." },
        { key: "keyActivities" as const, content: "Production." },
        { key: "keyPartners" as const, content: "Fournisseur de tissu." },
      ],
      source: "utilisateur_edite" as const,
    };
  }

  it("persists the 7 blocks for an existing idea", async () => {
    const { ideaId } = await service.create(payload());

    await service.updateCanvasBlocks(ideaId, canvasPayload());

    const stored = await prisma.canvasBlock.findMany({ where: { ideaId } });
    expect(stored).toHaveLength(7);
    expect(stored.every((b) => b.source === "utilisateur_edite")).toBe(true);
    expect(stored.find((b) => b.key === "valueProposition")?.content).toBe("Des sacs faits main.");
  });

  it("upserts on a second call instead of duplicating", async () => {
    const { ideaId } = await service.create(payload());

    await service.updateCanvasBlocks(ideaId, canvasPayload());
    const updated = canvasPayload();
    updated.blocks[0].content = "Contenu modifie.";
    await service.updateCanvasBlocks(ideaId, updated);

    const stored = await prisma.canvasBlock.findMany({ where: { ideaId } });
    expect(stored).toHaveLength(7);
    expect(stored.find((b) => b.key === "valueProposition")?.content).toBe("Contenu modifie.");
  });

  it("throws NotFoundException for an unknown idea", async () => {
    await expect(service.updateCanvasBlocks("does-not-exist", canvasPayload())).rejects.toThrow();
  });
});
```

- [ ] **Step 6: Lancer les tests et vérifier qu'ils échouent**

Run: `pnpm --filter api test -- ideas.service.spec.ts`
Expected: FAIL — `service.updateCanvasBlocks is not a function`

- [ ] **Step 7: Implémenter `IdeasService.updateCanvasBlocks`**

Dans `apps/api/src/ideas/ideas.service.ts`, modifier la ligne d'import existante `import { Injectable } from "@nestjs/common";` en :

```typescript
import { Injectable, NotFoundException } from "@nestjs/common";
```

Ajouter un import pour le DTO, à côté des imports existants :

```typescript
import type { UpdateCanvasBlocksDto } from "./dto/update-canvas-blocks.dto.js";
```

Ajouter la méthode dans la classe `IdeasService`, après `findOne` :

```typescript
  async updateCanvasBlocks(ideaId: string, dto: UpdateCanvasBlocksDto): Promise<void> {
    const idea = await this.prisma.idea.findUnique({ where: { id: ideaId }, select: { id: true } });
    if (!idea) {
      throw new NotFoundException(`Idee ${ideaId} introuvable.`);
    }

    await this.prisma.$transaction(
      dto.blocks.map((block) =>
        this.prisma.canvasBlock.upsert({
          where: { ideaId_key: { ideaId, key: block.key } },
          create: { ideaId, key: block.key, content: block.content, source: dto.source },
          update: { content: block.content, source: dto.source },
        }),
      ),
    );
  }
```

- [ ] **Step 8: Lancer les tests et vérifier qu'ils passent**

Run: `pnpm --filter api test -- ideas.service.spec.ts`
Expected: PASS — tous les tests, y compris les 3 nouveaux

- [ ] **Step 9: Écrire les tests qui échouent pour l'endpoint HTTP**

Modifier `apps/api/src/ideas/ideas.controller.spec.ts` — ajouter dans le `describe("IdeasController (HTTP)", ...)` existant, après le test `"GET /ideas/:id returns 404 for an unknown id"` :

```typescript
  it("PATCH /ideas/:id/canvas-blocks persists the blocks and returns ok", async () => {
    const created = await request(app.getHttpServer()).post("/ideas").send(validPayload()).expect(201);

    const canvasPayload = {
      blocks: [
        { key: "valueProposition", content: "Des sacs faits main." },
        { key: "customerSegments", content: "Jeunes actifs urbains." },
        { key: "channels", content: "Instagram." },
        { key: "customerRelationships", content: "WhatsApp." },
        { key: "keyResources", content: "Machine a coudre." },
        { key: "keyActivities", content: "Production." },
        { key: "keyPartners", content: "Fournisseur de tissu." },
      ],
      source: "utilisateur_edite",
    };

    const response = await request(app.getHttpServer())
      .patch(`/ideas/${created.body.ideaId}/canvas-blocks`)
      .send(canvasPayload)
      .expect(200);

    expect(response.body).toEqual({ ok: true });
  });

  it("PATCH /ideas/:id/canvas-blocks returns 404 for an unknown idea", async () => {
    const canvasPayload = {
      blocks: [
        { key: "valueProposition", content: "x" },
        { key: "customerSegments", content: "x" },
        { key: "channels", content: "x" },
        { key: "customerRelationships", content: "x" },
        { key: "keyResources", content: "x" },
        { key: "keyActivities", content: "x" },
        { key: "keyPartners", content: "x" },
      ],
      source: "utilisateur_edite",
    };

    await request(app.getHttpServer())
      .patch("/ideas/does-not-exist/canvas-blocks")
      .send(canvasPayload)
      .expect(404);
  });

  it("PATCH /ideas/:id/canvas-blocks rejects an invalid payload", async () => {
    const created = await request(app.getHttpServer()).post("/ideas").send(validPayload()).expect(201);

    await request(app.getHttpServer())
      .patch(`/ideas/${created.body.ideaId}/canvas-blocks`)
      .send({ blocks: [], source: "utilisateur_edite" })
      .expect(400);
  });
```

- [ ] **Step 10: Lancer les tests et vérifier qu'ils échouent**

Run: `pnpm --filter api test -- ideas.controller.spec.ts`
Expected: FAIL — `404` sur la route inexistante `PATCH /ideas/:id/canvas-blocks`

- [ ] **Step 11: Ajouter la route sur `IdeasController`**

Dans `apps/api/src/ideas/ideas.controller.ts`, modifier la ligne d'import existante :

```typescript
import { Body, Controller, Get, NotFoundException, Param, Patch, Post } from "@nestjs/common";
```

Ajouter un import pour le DTO :

```typescript
import { UpdateCanvasBlocksDto } from "./dto/update-canvas-blocks.dto.js";
```

Ajouter la méthode dans la classe, après `findOne` :

```typescript
  @Patch(":id/canvas-blocks")
  async updateCanvasBlocks(@Param("id") id: string, @Body() dto: UpdateCanvasBlocksDto) {
    await this.ideasService.updateCanvasBlocks(id, dto);
    return { ok: true };
  }
```

- [ ] **Step 12: Lancer les tests et vérifier qu'ils passent**

Run: `pnpm --filter api test -- ideas.controller.spec.ts`
Expected: PASS — tous les tests, y compris les 3 nouveaux

- [ ] **Step 13: Suite complète, lint et build**

Run: `pnpm --filter api test && pnpm --filter api lint && pnpm --filter api build`
Expected: tous les tests passent (suite complète, pas seulement les fichiers touchés), aucune erreur de lint/build

- [ ] **Step 14: Commit**

```bash
git add apps/api/src/ideas
git commit -m "feat(api): persistance des blocs de canvas (Phase 6a)"
```

---

### Task 4: Frontend — client API et état du wizard

**Files:**
- Modify: `apps/web/src/lib/ideas-api.ts`
- Modify: `apps/web/src/components/wizard/wizard-reducer.ts`

**Interfaces:**
- Consumes: routes `POST /ideas/suggest-canvas-blocks` et `PATCH /ideas/:id/canvas-blocks` (Task 2, Task 3)
- Produces: `CANVAS_BLOCK_KEYS`, `CanvasBlockKey`, `CanvasBlocks` (types frontend), `suggestCanvasBlocks()`, `saveCanvasBlocks()` (fonctions client), `WizardStep` incluant `"canvas"`, `WizardState.canvasBlocks`/`canvasWasSuggested`, actions `SET_CANVAS_BLOCKS`/`SET_CANVAS_BLOCK` — consommés par Task 5 (`StepCanvas`) et Task 6 (`commencer/page.tsx`, `WizardProgress.tsx`)

Pas de suite de tests automatisée sur `apps/web` (précédent établi, voir Global Constraints du plan Phase 5b) — cette tâche se vérifie par `lint`/`build` et par la tâche suivante qui consomme ces types (une erreur de frappe dans un nom de champ casserait la compilation TypeScript de `StepCanvas.tsx`).

- [ ] **Step 1: Ajouter les types et fonctions client dans `ideas-api.ts`**

Dans `apps/web/src/lib/ideas-api.ts`, ajouter à la fin du fichier :

```typescript
export const CANVAS_BLOCK_KEYS = [
  "valueProposition",
  "customerSegments",
  "channels",
  "customerRelationships",
  "keyResources",
  "keyActivities",
  "keyPartners",
] as const;

export type CanvasBlockKey = (typeof CANVAS_BLOCK_KEYS)[number];
export type CanvasBlocks = Record<CanvasBlockKey, string>;

export interface SuggestCanvasBlocksInput {
  businessModel: BusinessModel;
  rawDescription: string;
  currency: CurrencyCode;
}

export type SuggestCanvasBlocksResponse = { available: true; blocks: CanvasBlocks } | { available: false };

export async function suggestCanvasBlocks(input: SuggestCanvasBlocksInput): Promise<SuggestCanvasBlocksResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/ideas/suggest-canvas-blocks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      return { available: false };
    }

    return (await response.json()) as SuggestCanvasBlocksResponse;
  } catch {
    return { available: false };
  }
}

export async function saveCanvasBlocks(
  ideaId: string,
  blocks: CanvasBlocks,
  source: "ia_suggere" | "utilisateur_edite",
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/ideas/${ideaId}/canvas-blocks`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      blocks: CANVAS_BLOCK_KEYS.map((key) => ({ key, content: blocks[key] })),
      source,
    }),
  });

  if (!response.ok) {
    throw new Error(`L'enregistrement du canvas a echoue (${response.status}).`);
  }
}
```

- [ ] **Step 2: Étendre `wizard-reducer.ts`**

Dans `apps/web/src/components/wizard/wizard-reducer.ts`, modifier la ligne d'import existante :

```typescript
import type { BusinessModel, CanvasBlockKey, CanvasBlocks, CurrencyCode, HypothesesInput } from "@/lib/ideas-api";
```

Modifier `WizardStep` (ajouter `"canvas"` entre `"hypotheses"` et `"results"`) :

```typescript
export type WizardStep =
  | "business-type"
  | "description"
  | "hypotheses"
  | "canvas"
  | "results"
  | "et-si"
  | "scenarios";
```

Ajouter, avant l'interface `WizardState` :

```typescript
const EMPTY_CANVAS_BLOCKS: CanvasBlocks = {
  valueProposition: "",
  customerSegments: "",
  channels: "",
  customerRelationships: "",
  keyResources: "",
  keyActivities: "",
  keyPartners: "",
};
```

Ajouter deux champs dans `WizardState` (à côté de `wasSuggested` existant) :

```typescript
  canvasBlocks: CanvasBlocks;
  canvasWasSuggested: boolean;
```

Ajouter deux actions dans `WizardAction` (avant `GO_TO_STEP`) :

```typescript
  | { type: "SET_CANVAS_BLOCKS"; blocks: CanvasBlocks }
  | { type: "SET_CANVAS_BLOCK"; key: CanvasBlockKey; value: string }
```

Ajouter dans `initialWizardState` (à côté de `wasSuggested: false`) :

```typescript
  canvasBlocks: EMPTY_CANVAS_BLOCKS,
  canvasWasSuggested: false,
```

Ajouter dans le `switch` de `wizardReducer` (avant `case "GO_TO_STEP":`) :

```typescript
    case "SET_CANVAS_BLOCKS":
      return { ...state, canvasBlocks: action.blocks, canvasWasSuggested: true };
    case "SET_CANVAS_BLOCK":
      return {
        ...state,
        canvasBlocks: { ...state.canvasBlocks, [action.key]: action.value },
        canvasWasSuggested: false,
      };
```

- [ ] **Step 3: Lint et build**

Run: `pnpm --filter web lint && pnpm --filter web build`
Expected: aucune erreur (le build peut échouer transitivement si `commencer/page.tsx` n'a pas encore de bloc JSX pour `"canvas"` — ce n'est PAS le cas ici : `WizardStep` élargi n'oblige aucun `switch`/JSX existant à gérer le nouveau cas puisque le rendu se fait par comparaisons `state.step === "..."` indépendantes, pas par un `switch` exhaustif ; si le build échoue pour une autre raison, corriger avant de continuer)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/ideas-api.ts apps/web/src/components/wizard/wizard-reducer.ts
git commit -m "feat(web): client API et etat du wizard pour le canvas (Phase 6a)"
```

---

### Task 5: Frontend — composant `StepCanvas`

**Files:**
- Create: `apps/web/src/components/wizard/StepCanvas.tsx`

**Interfaces:**
- Consumes: `CanvasBlockKey`, `CanvasBlocks` de `@/lib/ideas-api` (Task 4)
- Produces: composant `StepCanvas` — props `{ canvasBlocks: CanvasBlocks; wasSuggested: boolean; onBlockChange: (key: CanvasBlockKey, value: string) => void; onNext: () => void; onBack: () => void; submitting: boolean; error: string | null }` — consommé par Task 6 (`commencer/page.tsx`)

- [ ] **Step 1: Créer le composant**

Créer `apps/web/src/components/wizard/StepCanvas.tsx` :

```typescript
"use client";

import type { CanvasBlockKey, CanvasBlocks } from "@/lib/ideas-api";

const FIELDS: { key: CanvasBlockKey; label: string; placeholder: string }[] = [
  {
    key: "valueProposition",
    label: "Qu'est-ce que tu offres, et pourquoi c'est interessant ?",
    placeholder: "Ex : des sacs faits main, livres en 24h a Cotonou",
  },
  {
    key: "customerSegments",
    label: "A qui tu vends ?",
    placeholder: "Ex : jeunes actifs urbains, 20-35 ans",
  },
  {
    key: "channels",
    label: "Comment tes clients te trouvent et achetent ?",
    placeholder: "Ex : Instagram, bouche-a-oreille, marche local",
  },
  {
    key: "customerRelationships",
    label: "Comment tu gardes le contact avec eux dans la duree ?",
    placeholder: "Ex : WhatsApp, newsletter, programme de fidelite",
  },
  {
    key: "keyResources",
    label: "De quoi tu as absolument besoin pour fonctionner ?",
    placeholder: "Ex : machine a coudre, stock de tissu, local",
  },
  {
    key: "keyActivities",
    label: "Qu'est-ce que tu dois faire au quotidien pour faire tourner ca ?",
    placeholder: "Ex : production, livraison, reseaux sociaux",
  },
  {
    key: "keyPartners",
    label: "De qui tu as besoin autour de toi ?",
    placeholder: "Ex : fournisseur de tissu, livreur, comptable",
  },
];

export function StepCanvas({
  canvasBlocks,
  wasSuggested,
  onBlockChange,
  onNext,
  onBack,
  submitting,
  error,
}: {
  canvasBlocks: CanvasBlocks;
  wasSuggested: boolean;
  onBlockChange: (key: CanvasBlockKey, value: string) => void;
  onNext: () => void;
  onBack: () => void;
  submitting: boolean;
  error: string | null;
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <h1 className="text-center text-h2-mobile font-semibold md:text-h2">Ton business model</h1>
      {wasSuggested ? (
        <p className="text-center text-small text-accent-emerald">
          Suggere par l&apos;IA a partir de ta description : verifie et corrige si besoin.
        </p>
      ) : null}
      {FIELDS.map((field) => (
        <label key={field.key} className="flex flex-col gap-2 text-small text-text-secondary">
          {field.label}
          <textarea
            value={canvasBlocks[field.key]}
            onChange={(e) => onBlockChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            maxLength={500}
            rows={2}
            className="rounded-lg border border-border bg-surface p-3 text-body text-text-primary focus:border-accent-emerald focus:outline-none"
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
          onClick={onNext}
          disabled={submitting}
          className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-6 py-3 text-body font-semibold text-white disabled:opacity-40"
        >
          {submitting ? "Enregistrement..." : "Continuer"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Lint et build**

Run: `pnpm --filter web lint && pnpm --filter web build`
Expected: aucune erreur (le composant n'est pas encore importé nulle part — `oxlint`/`eslint` ne signalent pas un export non utilisé au niveau module, seul un import non utilisé le serait ; si le linter du projet signale un export non consommé, ignorer pour cette tâche : Task 6 le consomme immédiatement après)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/wizard/StepCanvas.tsx
git commit -m "feat(web): composant StepCanvas (Phase 6a)"
```

---

### Task 6: Câblage final, vérification bout en bout

**Files:**
- Modify: `apps/web/src/app/commencer/page.tsx`
- Modify: `apps/web/src/components/wizard/WizardProgress.tsx`
- Modify: `tasks/TODO.md`
- Modify: `tasks/CHANGELOG.md`

**Interfaces:**
- Consumes: `suggestCanvasBlocks`/`saveCanvasBlocks` (Task 4), `StepCanvas` (Task 5), `WizardStep` incluant `"canvas"` (Task 4)

- [ ] **Step 1: Modifier `handleSubmit` dans `commencer/page.tsx`**

Dans `apps/web/src/app/commencer/page.tsx`, modifier la ligne d'import existante de `@/lib/ideas-api` :

```typescript
import { createIdea, suggestHypotheses, suggestCanvasBlocks, saveCanvasBlocks, type CreateIdeaResponse } from "@/lib/ideas-api";
```

Ajouter l'import du nouveau composant, à côté des imports `StepEtSi`/`StepScenarios` existants :

```typescript
import { StepCanvas } from "@/components/wizard/StepCanvas";
```

Remplacer la fonction `handleSubmit` existante par :

```typescript
  async function handleSubmit() {
    if (!state.businessModel) return;
    setSubmitting(true);
    setError(null);
    try {
      const [result, canvasSuggestion] = await Promise.all([
        createIdea({
          businessModel: state.businessModel,
          rawDescription: state.rawDescription,
          currency: state.currency,
          hypotheses: state.hypotheses,
        }),
        suggestCanvasBlocks({
          businessModel: state.businessModel,
          rawDescription: state.rawDescription,
          currency: state.currency,
        }),
      ]);
      setResponse(result);
      if (canvasSuggestion.available) {
        dispatch({ type: "SET_CANVAS_BLOCKS", blocks: canvasSuggestion.blocks });
      }
      dispatch({ type: "GO_TO_STEP", step: "canvas" });
    } catch {
      setError("Le calcul a echoue. Verifie tes valeurs et reessaie.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCanvasNext() {
    if (!response) return;
    setSubmitting(true);
    setError(null);
    try {
      await saveCanvasBlocks(
        response.ideaId,
        state.canvasBlocks,
        state.canvasWasSuggested ? "ia_suggere" : "utilisateur_edite",
      );
      dispatch({ type: "GO_TO_STEP", step: "results" });
    } catch {
      setError("L'enregistrement a echoue. Reessaie.");
    } finally {
      setSubmitting(false);
    }
  }
```

- [ ] **Step 2: Ajouter le bloc JSX pour l'étape "canvas"**

Toujours dans `apps/web/src/app/commencer/page.tsx`, insérer entre le bloc `{state.step === "hypotheses" && ...}` existant et le bloc `{state.step === "results" && ...}` existant :

```tsx
      {state.step === "canvas" && (
        <StepCanvas
          canvasBlocks={state.canvasBlocks}
          wasSuggested={state.canvasWasSuggested}
          onBlockChange={(key, value) => dispatch({ type: "SET_CANVAS_BLOCK", key, value })}
          onNext={handleCanvasNext}
          onBack={() => dispatch({ type: "GO_TO_STEP", step: "hypotheses" })}
          submitting={submitting}
          error={error}
        />
      )}
```

- [ ] **Step 3: Ajouter l'étape à `WizardProgress.tsx`**

Dans `apps/web/src/components/wizard/WizardProgress.tsx`, le tableau `STEPS` est actuellement :

```typescript
const STEPS: { key: WizardStep; label: string }[] = [
  { key: "business-type", label: "Type" },
  { key: "description", label: "Description" },
  { key: "hypotheses", label: "Hypotheses" },
  { key: "results", label: "Resultats" },
  { key: "et-si", label: "Et si ?" },
  { key: "scenarios", label: "Scenarios" },
];
```

Insérer `{ key: "canvas", label: "Ton business model" }` entre l'entrée `"hypotheses"` et l'entrée `"results"` :

```typescript
const STEPS: { key: WizardStep; label: string }[] = [
  { key: "business-type", label: "Type" },
  { key: "description", label: "Description" },
  { key: "hypotheses", label: "Hypotheses" },
  { key: "canvas", label: "Ton business model" },
  { key: "results", label: "Resultats" },
  { key: "et-si", label: "Et si ?" },
  { key: "scenarios", label: "Scenarios" },
];
```

Aucune autre modification du fichier — la logique `currentIndex`/`STEPS.map` gère déjà n'importe quelle longueur de tableau sans changement.

- [ ] **Step 4: Lint et build**

Run: `pnpm --filter web lint && pnpm --filter web build`
Expected: aucune erreur

- [ ] **Step 5: Vérification manuelle bout en bout (navigateur, Playwright)**

Démarrer les serveurs de dev du worktree (ports dédiés — ne jamais toucher aux serveurs du checkout principal de l'utilisateur, voir note opérationnelle ci-dessous), puis parcourir dans un vrai navigateur :

1. Type → Description (texte libre, ex. "Vente de sacs a main faits main en ligne") → Continuer
2. Hypothèses : remplir les 4 champs, cliquer "Voir mes resultats"
3. **Nouvel écran "Ton business model" doit apparaitre** (pas directement "Résultats") — vérifier que l'indicateur de progression affiche 7 étapes avec "Ton business model" en 4e position
4. Si l'IA a répondu : les 7 champs sont pré-remplis, le message "Suggéré par l'IA..." est visible ; si l'IA est indisponible (quota, déjà observé en conditions réelles) : les 7 champs sont vides, éditables, pas de message
5. Éditer au moins un champ, vérifier que le message "Suggéré par l'IA" disparaît si présent (comportement `SET_CANVAS_BLOCK` → `canvasWasSuggested: false`)
6. Cliquer "Continuer" → l'écran "Résultats" s'affiche (comportement inchangé)
7. Vérifier la console navigateur : 0 erreur sur tout le parcours
8. Revenir en arrière (bouton Retour sur "Ton business model" → retourne à "Hypothèses"), puis ré-avancer : re-soumission ne doit pas planter (upsert backend)
9. Vérifier en base (`psql` ou Prisma Studio) que les 7 lignes `CanvasBlock` existent pour l'idée créée, avec le bon `source`

**Note opérationnelle :** l'utilisateur fait tourner ses propres serveurs de dev (API port 3001, web port 3002) sur le checkout principal pour explorer l'app en parallèle — ne jamais les arrêter ni réutiliser ces ports. Utiliser des ports dédiés au worktree (ex. API 3011, web 3012 avec `NEXT_PUBLIC_API_URL` pointant vers 3011), les arrêter proprement à la fin de la vérification (tuer par PID exact, jamais par un `pkill` large qui risquerait de toucher les processus du checkout principal — un tel incident s'est produit lors de la Phase 5b).

- [ ] **Step 6: Mettre à jour `tasks/TODO.md`**

`tasks/TODO.md` contient actuellement, juste après la section `## Phase 5 — Scénarios` (qui se termine par la ligne `- [ ] **Bug mineur découvert (revue finale Phase 5b)**...`), la section :

```markdown
## Phase 6-7 — Analyse complète & Paiement
- [ ] Écran d'offre à 1 000 FCFA
- [ ] Intégration FedaPay (`docs/PAYMENT.md`, `skills/payment.md`)
- [ ] Rapport final
```

Insérer une nouvelle sous-section juste avant celle-ci (entre la fin de `## Phase 5 — Scénarios` et `## Phase 6-7 — Analyse complète & Paiement`) :

```markdown
## Phase 6a — Canvas (blocs manquants)
- [x] Capture des 7 blocs qualitatifs du business model canvas (`apps/web/src/components/wizard/StepCanvas.tsx`), suggestion IA (`apps/api/src/ai/gemini.provider.ts`), persistance (`CanvasBlock`, `PATCH /ideas/:id/canvas-blocks`). Voir `docs/superpowers/specs/2026-09-20-phase-6a-canvas-capture-design.md`.

```

(ne pas renommer ni modifier la section `## Phase 6-7 — Analyse complète & Paiement` existante — elle correspond au périmètre de la future Phase 6b)

- [ ] **Step 7: Mettre à jour `tasks/CHANGELOG.md`**

`tasks/CHANGELOG.md` commence par `# CHANGELOG.md`, suivi immédiatement de l'entrée `## [Non versionné], Phase 5b : écrans "Et si ?" / "Scénarios"`. Insérer la nouvelle entrée entre le titre et cette entrée existante (donc tout en haut de la liste des entrées, même convention que les Phases 4/5a/5b qui s'empilent chronologiquement en ordre inverse) :

```markdown
## [Non versionné], Phase 6a : capture du canvas
- Nouvel écran "Ton business model" dans le wizard, entre "Hypothèses" et "Résultats" : 7 blocs qualitatifs du business model canvas (proposition de valeur, segments clients, canaux, relations clients, ressources clés, activités clés, partenaires clés), suggérés par l'IA (`GeminiProvider.suggestCanvasBlocks`, même mécanique que la Phase 4) depuis la description libre, validés/édités par l'utilisateur.
- Nouveau modèle Prisma `CanvasBlock` (pattern identique à `Hypothesis`), persisté via `PATCH /ideas/:id/canvas-blocks` (`upsert`, tolère un retour en arrière puis re-soumission). Suggestion IA et création de l'idée lancées en parallèle (`Promise.all`) pour ne pas cumuler les latences.
- Préparation de contenu pour le rapport final enrichi (Phase 6b, hors scope ici) : les 2 blocs restants du canvas (structure de coûts, flux de revenus) resteront calculés en direct par `financial-engine`, jamais stockés comme texte.
```

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/app/commencer/page.tsx apps/web/src/components/wizard/WizardProgress.tsx tasks/TODO.md tasks/CHANGELOG.md
git commit -m "feat(web): cable l'ecran Ton business model dans le wizard (Phase 6a)"
```
