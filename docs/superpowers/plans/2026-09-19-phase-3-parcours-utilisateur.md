# Phase 3, parcours utilisateur, Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire le parcours "type de business -> description -> hypothèses -> résultats" (docs/USER_FLOWS.md écrans 2 à 5), en saisie manuelle (l'extraction IA arrive en Phase 4), avec persistance Postgres et un formulaire guidé sur `/commencer`.

**Architecture:** Nouveau module NestJS pur `PrismaModule`/`PrismaService` (driver adapter Prisma 7) + nouveau module `IdeasModule` (controller/service/DTOs) qui orchestre la persistance et appelle le `FinancialEngineModule` déjà livré. Côté frontend, un wizard client (`useReducer`) sur `apps/web/src/app/commencer/page.tsx` qui n'appelle le backend qu'une fois, à la fin.

**Tech Stack:** NestJS 12, Prisma 7.10.0 + `@prisma/adapter-pg`, PostgreSQL (Docker local), class-validator/class-transformer, vitest, Next.js 16 (App Router), Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-09-19-phase-3-parcours-utilisateur-design.md`

## Global Constraints

- Aucun calcul financier côté frontend : tous les chiffres affichés viennent de la réponse de `POST /ideas` (docs/FINANCIAL_ENGINE.md).
- Montants toujours des entiers dans la plus petite unité de la devise, jamais de flottant natif sur un montant.
- Pas de compte utilisateur ni d'authentification dans ce lot.
- Pas de suite de tests automatisée sur `apps/web` (aucune n'existe encore dans ce projet) : les tâches frontend sont vérifiées manuellement (dev server + capture d'écran), c'est une exception TDD explicitement actée avec l'humain dans le spec, pas une tâche à sauter en silence.
- Toutes les tâches backend suivent strictement TDD (test avant code, RED vérifié avant GREEN) contre une vraie base Postgres locale, jamais de mock de Prisma (skills/testing.md).
- Imports relatifs TypeScript avec extension `.js` explicite dans `apps/api` (résolution `nodenext`, voir `apps/api/tsconfig.json`).
- Ne pas toucher au prix fixe de l'analyse (1 000 FCFA) ni au flux de paiement : hors scope de ce plan.
- Toutes les tâches à partir de la Task 2 supposent Postgres démarré (`docker compose up -d`, Task 1 Step 2) et la migration appliquée (Task 1 Step 5) : à vérifier en début de tâche si elles sont exécutées dans des sessions séparées.
- Les tâches doivent être faites dans l'ordre (1 -> 11), chaque tâche consomme des fichiers produits par la précédente.

---

## Task 1: Docker Compose (Postgres local) + schéma Prisma + migration

**Files:**
- Create: `docker-compose.yml`
- Modify: `apps/api/prisma/schema.prisma`

**Interfaces:**
- Produces: tables Postgres `Idea`, `Hypothesis`, `Simulation` et l'enum `BusinessModel` (`ECOMMERCE`, `FORMATION`, `EBOOK`, `SERVICE`, `PRODUIT_PHYSIQUE`, `AUTRE`), disponibles pour toutes les tâches suivantes via `@prisma/client`.

Config, pas de cycle TDD (exception explicite de la skill test-driven-development).

- [x] **Step 1: Écrire `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: ca_tient
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

- [x] **Step 2: Démarrer Postgres et vérifier qu'il accepte les connexions**

Run: `docker compose up -d && docker compose exec postgres pg_isready -U user -d ca_tient`
Expected: `/var/run/postgresql:5432 - accepting connections`

- [x] **Step 3: Copier `.env.example` en `.env` si absent**

Run: `cd apps/api && [ -f .env ] || cp .env.example .env`
Expected: `apps/api/.env` existe avec `DATABASE_URL="postgresql://user:password@localhost:5432/ca_tient?schema=public"` (déjà le cas depuis la Phase 1, ne rien écraser si le fichier existe déjà).

- [x] **Step 4: Ajouter les modèles au schéma Prisma**

Remplacer le contenu de `apps/api/prisma/schema.prisma` par :

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

enum BusinessModel {
  ECOMMERCE
  FORMATION
  EBOOK
  SERVICE
  PRODUIT_PHYSIQUE
  AUTRE
}

model Idea {
  id             String        @id @default(cuid())
  businessModel  BusinessModel
  rawDescription String
  currency       String
  createdAt      DateTime      @default(now())
  hypotheses     Hypothesis[]
  simulations    Simulation[]
}

model Hypothesis {
  id     String  @id @default(cuid())
  ideaId String
  idea   Idea    @relation(fields: [ideaId], references: [id], onDelete: Cascade)
  key    String
  label  String
  value  Int
  unit   String?
  source String

  @@unique([ideaId, key])
}

model Simulation {
  id             String   @id @default(cuid())
  ideaId         String
  idea           Idea     @relation(fields: [ideaId], references: [id], onDelete: Cascade)
  type           String
  inputsSnapshot Json
  result         Json
  breakEven      Json
  createdAt      DateTime @default(now())
}
```

- [x] **Step 5: Générer et appliquer la migration**

Run: `cd apps/api && pnpm exec prisma migrate dev --name add_ideas_hypotheses_simulations`
Expected: la commande crée `apps/api/prisma/migrations/<timestamp>_add_ideas_hypotheses_simulations/migration.sql`, l'applique, régénère le client Prisma, se termine sans erreur.

- [x] **Step 6: Vérifier que les tables existent**

Run: `docker compose exec postgres psql -U user -d ca_tient -c '\dt'`
Expected: la liste inclut `Idea`, `Hypothesis`, `Simulation`, `_prisma_migrations`.

- [x] **Step 7: Commit**

```bash
git add docker-compose.yml apps/api/prisma/schema.prisma apps/api/prisma/migrations
git commit -m "feat(api): schema Prisma Idea/Hypothesis/Simulation + Postgres local via Docker Compose"
```

---

## Task 2: `PrismaService` + `PrismaModule`

**Files:**
- Create: `apps/api/src/prisma/prisma.service.ts`
- Create: `apps/api/src/prisma/prisma.module.ts`
- Create: `apps/api/src/prisma/prisma.service.spec.ts`

**Interfaces:**
- Consumes: tables créées en Task 1 (base `ca_tient` locale accessible via `DATABASE_URL`).
- Produces: `PrismaService` (`apps/api/src/prisma/prisma.service.ts`, étend `PrismaClient`, expose toutes les méthodes Prisma standard comme `idea.create`, `idea.findUnique`, etc.), `PrismaModule` (`@Global()`, exporte `PrismaService`), consommés par toutes les tâches suivantes via `import { PrismaService } from "../prisma/prisma.service.js"`.

- [x] **Step 1: Installer les dépendances**

Run: `cd apps/api && pnpm add @prisma/adapter-pg pg && pnpm add -D @types/pg`
Expected: `apps/api/package.json` liste `@prisma/adapter-pg` et `pg` en dependencies, `@types/pg` en devDependencies.

- [x] **Step 2: Écrire le test (RED)**

Créer `apps/api/src/prisma/prisma.service.spec.ts` :

```typescript
import { PrismaService } from "./prisma.service.js";

describe("PrismaService", () => {
  it("connects to Postgres and can run a raw query", async () => {
    const prisma = new PrismaService();
    await prisma.onModuleInit();

    const result = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`;

    expect(result).toEqual([{ ok: 1 }]);

    await prisma.onModuleDestroy();
  });
});
```

- [x] **Step 3: Vérifier l'échec (RED)**

Run: `pnpm --filter api exec vitest run src/prisma/prisma.service.spec.ts`
Expected: FAIL, `Cannot find module './prisma.service.js'`.

- [x] **Step 4: Implémenter `PrismaService`**

Créer `apps/api/src/prisma/prisma.service.ts` :

```typescript
import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
```

Note : si `PrismaPg` n'accepte pas `{ connectionString }` tel quel, vérifier la signature exacte dans `apps/api/node_modules/@prisma/adapter-pg/dist/index.d.ts` et ajuster (l'API du driver adapter est encore jeune sur Prisma 7.10.0).

- [x] **Step 5: Vérifier le succès (GREEN)**

Run: `pnpm --filter api exec vitest run src/prisma/prisma.service.spec.ts`
Expected: PASS, 1 test.

- [x] **Step 6: Créer `PrismaModule`**

Créer `apps/api/src/prisma/prisma.module.ts` :

```typescript
import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service.js";

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [x] **Step 7: Lancer toute la suite pour confirmer l'absence de régression**

Run: `pnpm --filter api test`
Expected: tous les tests passent (ceux du moteur financier + le nouveau).

- [x] **Step 8: Commit**

```bash
git add apps/api/package.json apps/api/pnpm-lock.yaml apps/api/src/prisma
git commit -m "feat(api): PrismaService avec driver adapter pg"
```

---

## Task 3: DTOs `CreateIdeaDto` / `HypothesesDto`

**Files:**
- Create: `apps/api/src/ideas/dto/hypotheses.dto.ts`
- Create: `apps/api/src/ideas/dto/create-idea.dto.ts`
- Create: `apps/api/src/ideas/dto/create-idea.dto.spec.ts`

**Interfaces:**
- Consumes: `SUPPORTED_CURRENCIES`, `CurrencyCode` depuis `apps/api/src/financial-engine/financial-engine.types.ts` (déjà livré Phase 2) ; `BusinessModel` généré par Prisma (`@prisma/client`, disponible depuis Task 1).
- Produces: classes `HypothesesDto` (`price`, `volume`, `variableCostPerUnit`, `fixedCosts: number`) et `CreateIdeaDto` (`businessModel: BusinessModel`, `rawDescription: string`, `currency: CurrencyCode`, `hypotheses: HypothesesDto`), consommées par `IdeasService`/`IdeasController` (Tasks 4-6).

- [x] **Step 1: Installer class-validator et class-transformer**

Run: `cd apps/api && pnpm add class-validator class-transformer`
Expected: ajoutés aux dependencies de `apps/api/package.json`.

- [x] **Step 2: Écrire le test (RED)**

Créer `apps/api/src/ideas/dto/create-idea.dto.spec.ts` :

```typescript
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateIdeaDto } from "./create-idea.dto.js";

function validPayload() {
  return {
    businessModel: "ECOMMERCE",
    rawDescription: "Vente de vêtements en ligne pour jeunes actifs.",
    currency: "XOF",
    hypotheses: { price: 5000, volume: 50, variableCostPerUnit: 2000, fixedCosts: 100000 },
  };
}

describe("CreateIdeaDto", () => {
  it("accepts a valid payload", async () => {
    const dto = plainToInstance(CreateIdeaDto, validPayload());
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it("rejects an unsupported currency", async () => {
    const dto = plainToInstance(CreateIdeaDto, { ...validPayload(), currency: "JPY" });
    const errors = await validate(dto);

    expect(errors.some((e) => e.property === "currency")).toBe(true);
  });

  it("rejects an unknown business model", async () => {
    const dto = plainToInstance(CreateIdeaDto, { ...validPayload(), businessModel: "SAAS" });
    const errors = await validate(dto);

    expect(errors.some((e) => e.property === "businessModel")).toBe(true);
  });

  it("rejects an empty description", async () => {
    const dto = plainToInstance(CreateIdeaDto, { ...validPayload(), rawDescription: "" });
    const errors = await validate(dto);

    expect(errors.some((e) => e.property === "rawDescription")).toBe(true);
  });

  it("rejects a negative price in the nested hypotheses", async () => {
    const payload = validPayload();
    payload.hypotheses.price = -1;
    const dto = plainToInstance(CreateIdeaDto, payload);
    const errors = await validate(dto);

    const hypothesesError = errors.find((e) => e.property === "hypotheses");
    expect(hypothesesError?.children?.some((c) => c.property === "price")).toBe(true);
  });
});
```

- [x] **Step 3: Vérifier l'échec (RED)**

Run: `pnpm --filter api exec vitest run src/ideas/dto/create-idea.dto.spec.ts`
Expected: FAIL, `Cannot find module './create-idea.dto.js'`.

- [x] **Step 4: Implémenter `HypothesesDto`**

Créer `apps/api/src/ideas/dto/hypotheses.dto.ts` :

```typescript
import { IsInt, Min } from "class-validator";

export class HypothesesDto {
  @IsInt()
  @Min(1)
  price!: number;

  @IsInt()
  @Min(0)
  volume!: number;

  @IsInt()
  @Min(0)
  variableCostPerUnit!: number;

  @IsInt()
  @Min(0)
  fixedCosts!: number;
}
```

- [x] **Step 5: Implémenter `CreateIdeaDto`**

Créer `apps/api/src/ideas/dto/create-idea.dto.ts` :

```typescript
import { Type } from "class-transformer";
import { IsEnum, IsIn, IsNotEmpty, IsString, MaxLength, ValidateNested } from "class-validator";
import { BusinessModel } from "@prisma/client";
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "../../financial-engine/financial-engine.types.js";
import { HypothesesDto } from "./hypotheses.dto.js";

export class CreateIdeaDto {
  @IsEnum(BusinessModel)
  businessModel!: BusinessModel;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  rawDescription!: string;

  @IsIn(SUPPORTED_CURRENCIES)
  currency!: CurrencyCode;

  @ValidateNested()
  @Type(() => HypothesesDto)
  hypotheses!: HypothesesDto;
}
```

- [x] **Step 6: Vérifier le succès (GREEN)**

Run: `pnpm --filter api exec vitest run src/ideas/dto/create-idea.dto.spec.ts`
Expected: PASS, 5 tests.

- [x] **Step 7: Commit**

```bash
git add apps/api/package.json apps/api/pnpm-lock.yaml apps/api/src/ideas
git commit -m "feat(api): DTOs CreateIdeaDto/HypothesesDto avec validation"
```

---

## Task 4: `IdeasService.create()`

**Files:**
- Create: `apps/api/src/ideas/ideas.service.ts`
- Create: `apps/api/src/ideas/ideas.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService` (Task 2), `CreateIdeaDto` (Task 3), `FinancialEngineService.computeResult`/`computeBreakEven` (Phase 2, `apps/api/src/financial-engine/financial-engine.service.ts`).
- Produces: `IdeasService.create(dto: CreateIdeaDto): Promise<{ ideaId: string; result: FinancialResult; breakEven: BreakEvenResult }>`, consommé par `IdeasController` (Task 6).

- [x] **Step 1: Écrire le test (RED)**

Créer `apps/api/src/ideas/ideas.service.ts` vide n'est pas nécessaire : écrire directement le test contre un fichier qui n'existe pas encore.

Créer `apps/api/src/ideas/ideas.service.spec.ts` :

```typescript
import { PrismaService } from "../prisma/prisma.service.js";
import { FinancialEngineService } from "../financial-engine/financial-engine.service.js";
import { IdeasService } from "./ideas.service.js";
import type { CreateIdeaDto } from "./dto/create-idea.dto.js";

function payload(overrides: Partial<CreateIdeaDto> = {}): CreateIdeaDto {
  return {
    businessModel: "ECOMMERCE",
    rawDescription: "Vente de vêtements en ligne pour jeunes actifs.",
    currency: "XOF",
    hypotheses: { price: 5000, volume: 50, variableCostPerUnit: 2000, fixedCosts: 100000 },
    ...overrides,
  } as CreateIdeaDto;
}

describe("IdeasService.create", () => {
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

  it("persists the idea, its hypotheses and the preview simulation", async () => {
    const { ideaId, result, breakEven } = await service.create(payload());

    expect(result).toEqual({ currency: "XOF", revenue: 250000, grossMargin: 150000, estimatedResult: 50000 });
    expect(breakEven).toEqual({ reachable: true, volumeUnits: 34 });

    const stored = await prisma.idea.findUniqueOrThrow({
      where: { id: ideaId },
      include: { hypotheses: true, simulations: true },
    });

    expect(stored.businessModel).toBe("ECOMMERCE");
    expect(stored.currency).toBe("XOF");
    expect(stored.hypotheses).toHaveLength(4);
    expect(stored.hypotheses.every((h) => h.source === "utilisateur_saisi")).toBe(true);
    expect(stored.simulations).toHaveLength(1);
    expect(stored.simulations[0]?.type).toBe("apercu");
  });

  it("stores the input snapshot used for the simulation", async () => {
    const { ideaId } = await service.create(payload());

    const simulation = await prisma.simulation.findFirstOrThrow({ where: { ideaId } });

    expect(simulation.inputsSnapshot).toEqual({
      currency: "XOF",
      price: 5000,
      volume: 50,
      variableCostPerUnit: 2000,
      fixedCosts: 100000,
    });
  });
});
```

- [x] **Step 2: Vérifier l'échec (RED)**

Run: `pnpm --filter api exec vitest run src/ideas/ideas.service.spec.ts`
Expected: FAIL, `Cannot find module './ideas.service.js'`.

- [x] **Step 3: Implémenter `IdeasService.create()`**

Créer `apps/api/src/ideas/ideas.service.ts` :

```typescript
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { FinancialEngineService } from "../financial-engine/financial-engine.service.js";
import type { CreateIdeaDto } from "./dto/create-idea.dto.js";
import type { Hypotheses } from "../financial-engine/financial-engine.types.js";

@Injectable()
export class IdeasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financialEngine: FinancialEngineService,
  ) {}

  async create(dto: CreateIdeaDto) {
    const hypotheses: Hypotheses = {
      currency: dto.currency,
      price: dto.hypotheses.price,
      volume: dto.hypotheses.volume,
      variableCostPerUnit: dto.hypotheses.variableCostPerUnit,
      fixedCosts: dto.hypotheses.fixedCosts,
    };

    const result = this.financialEngine.computeResult(hypotheses);
    const breakEven = this.financialEngine.computeBreakEven(hypotheses);

    const hypothesesRows = [
      { key: "price", label: "Prix de vente unitaire", value: dto.hypotheses.price, unit: dto.currency },
      { key: "volume", label: "Volume de ventes", value: dto.hypotheses.volume, unit: "unites/mois" },
      {
        key: "variableCostPerUnit",
        label: "Coût variable par unité",
        value: dto.hypotheses.variableCostPerUnit,
        unit: dto.currency,
      },
      { key: "fixedCosts", label: "Coûts fixes", value: dto.hypotheses.fixedCosts, unit: dto.currency },
    ].map((row) => ({ ...row, source: "utilisateur_saisi" }));

    const idea = await this.prisma.idea.create({
      data: {
        businessModel: dto.businessModel,
        rawDescription: dto.rawDescription,
        currency: dto.currency,
        hypotheses: { create: hypothesesRows },
        simulations: {
          create: {
            type: "apercu",
            inputsSnapshot: hypotheses,
            result,
            breakEven,
          },
        },
      },
    });

    return { ideaId: idea.id, result, breakEven };
  }
}
```

- [x] **Step 4: Vérifier le succès (GREEN)**

Run: `pnpm --filter api exec vitest run src/ideas/ideas.service.spec.ts`
Expected: PASS, 2 tests.

- [x] **Step 5: Commit**

```bash
git add apps/api/src/ideas/ideas.service.ts apps/api/src/ideas/ideas.service.spec.ts
git commit -m "feat(api): IdeasService.create, persistance + orchestration du moteur financier"
```

---

## Task 5: `IdeasService.findOne()`

**Files:**
- Modify: `apps/api/src/ideas/ideas.service.ts`
- Modify: `apps/api/src/ideas/ideas.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService` (Task 2), le résultat de `create()` (Task 4).
- Produces: `IdeasService.findOne(id: string): Promise<IdeaDetail | null>`, où `IdeaDetail` est exporté depuis `apps/api/src/ideas/ideas.service.ts` avec la forme `{ id: string; businessModel: string; rawDescription: string; currency: string; hypotheses: { key: string; label: string; value: number; unit: string | null }[]; simulation: { type: string; inputsSnapshot: unknown; result: unknown; breakEven: unknown; createdAt: Date } | null }`. Consommé par `IdeasController` (Task 6).

- [x] **Step 1: Ajouter les tests (RED)**

Ajouter à `apps/api/src/ideas/ideas.service.spec.ts`, dans un nouveau bloc `describe` :

```typescript
describe("IdeasService.findOne", () => {
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

  it("returns the idea with its hypotheses and latest simulation", async () => {
    const { ideaId } = await service.create(payload());

    const idea = await service.findOne(ideaId);

    expect(idea?.id).toBe(ideaId);
    expect(idea?.businessModel).toBe("ECOMMERCE");
    expect(idea?.hypotheses).toHaveLength(4);
    expect(idea?.simulation?.type).toBe("apercu");
  });

  it("returns null for an unknown id", async () => {
    const idea = await service.findOne("does-not-exist");

    expect(idea).toBeNull();
  });
});
```

- [x] **Step 2: Vérifier l'échec (RED)**

Run: `pnpm --filter api exec vitest run src/ideas/ideas.service.spec.ts`
Expected: FAIL sur les 2 nouveaux tests, `service.findOne is not a function`.

- [x] **Step 3: Implémenter `findOne()`**

Ajouter à `apps/api/src/ideas/ideas.service.ts` (après la classe, ou dans la classe : ajouter la méthode et le type exporté en haut du fichier) :

```typescript
export interface IdeaDetail {
  id: string;
  businessModel: string;
  rawDescription: string;
  currency: string;
  hypotheses: { key: string; label: string; value: number; unit: string | null }[];
  simulation: { type: string; inputsSnapshot: unknown; result: unknown; breakEven: unknown; createdAt: Date } | null;
}
```

Puis ajouter la méthode dans la classe `IdeasService` (après `create`) :

```typescript
  async findOne(id: string): Promise<IdeaDetail | null> {
    const idea = await this.prisma.idea.findUnique({
      where: { id },
      include: {
        hypotheses: true,
        simulations: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (!idea) return null;

    return {
      id: idea.id,
      businessModel: idea.businessModel,
      rawDescription: idea.rawDescription,
      currency: idea.currency,
      hypotheses: idea.hypotheses.map((h) => ({ key: h.key, label: h.label, value: h.value, unit: h.unit })),
      simulation: idea.simulations[0]
        ? {
            type: idea.simulations[0].type,
            inputsSnapshot: idea.simulations[0].inputsSnapshot,
            result: idea.simulations[0].result,
            breakEven: idea.simulations[0].breakEven,
            createdAt: idea.simulations[0].createdAt,
          }
        : null,
    };
  }
```

- [x] **Step 4: Vérifier le succès (GREEN)**

Run: `pnpm --filter api exec vitest run src/ideas/ideas.service.spec.ts`
Expected: PASS, 4 tests au total.

- [x] **Step 5: Commit**

```bash
git add apps/api/src/ideas/ideas.service.ts apps/api/src/ideas/ideas.service.spec.ts
git commit -m "feat(api): IdeasService.findOne"
```

---

## Task 6: `IdeasController` + `IdeasModule` + câblage `AppModule`

**Files:**
- Create: `apps/api/src/ideas/ideas.controller.ts`
- Create: `apps/api/src/ideas/ideas.module.ts`
- Create: `apps/api/src/ideas/ideas.controller.spec.ts`
- Modify: `apps/api/src/main.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: `IdeasService` (Tasks 4-5), `PrismaModule` (Task 2), `FinancialEngineModule` (Phase 2).
- Produces: `POST /ideas` (201, body `CreateIdeaDto`, réponse `{ ideaId, result, breakEven }` ; 400 si DTO invalide), `GET /ideas/:id` (200 avec `IdeaDetail` ; 404 si absent). Consommé par le frontend (Task 7).

- [x] **Step 1: Activer la validation globale**

Modifier `apps/api/src/main.ts` :

```typescript
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
```

- [x] **Step 2: Écrire le test HTTP (RED)**

Créer `apps/api/src/ideas/ideas.controller.spec.ts` :

```typescript
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { IdeasModule } from "./ideas.module.js";
import { PrismaService } from "../prisma/prisma.service.js";

function validPayload() {
  return {
    businessModel: "ECOMMERCE",
    rawDescription: "Vente de vêtements en ligne pour jeunes actifs.",
    currency: "XOF",
    hypotheses: { price: 5000, volume: 50, variableCostPerUnit: 2000, fixedCosts: 100000 },
  };
}

describe("IdeasController (HTTP)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [IdeasModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
    prisma = moduleRef.get(PrismaService);
  });

  afterEach(async () => {
    await prisma.idea.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /ideas creates an idea and returns the preview result", async () => {
    const response = await request(app.getHttpServer()).post("/ideas").send(validPayload()).expect(201);

    expect(response.body.ideaId).toEqual(expect.any(String));
    expect(response.body.result).toEqual({ currency: "XOF", revenue: 250000, grossMargin: 150000, estimatedResult: 50000 });
  });

  it("POST /ideas rejects an invalid payload", async () => {
    const payload = validPayload();
    payload.hypotheses.price = -1;

    await request(app.getHttpServer()).post("/ideas").send(payload).expect(400);
  });

  it("GET /ideas/:id returns the persisted idea", async () => {
    const created = await request(app.getHttpServer()).post("/ideas").send(validPayload()).expect(201);

    const response = await request(app.getHttpServer()).get(`/ideas/${created.body.ideaId}`).expect(200);

    expect(response.body.businessModel).toBe("ECOMMERCE");
    expect(response.body.hypotheses).toHaveLength(4);
  });

  it("GET /ideas/:id returns 404 for an unknown id", async () => {
    await request(app.getHttpServer()).get("/ideas/does-not-exist").expect(404);
  });
});
```

- [x] **Step 3: Vérifier l'échec (RED)**

Run: `pnpm --filter api exec vitest run src/ideas/ideas.controller.spec.ts`
Expected: FAIL, `Cannot find module './ideas.module.js'`.

- [x] **Step 4: Implémenter `IdeasController`**

Créer `apps/api/src/ideas/ideas.controller.ts` :

```typescript
import { Body, Controller, Get, NotFoundException, Param, Post } from "@nestjs/common";
import { IdeasService } from "./ideas.service.js";
import { CreateIdeaDto } from "./dto/create-idea.dto.js";

@Controller("ideas")
export class IdeasController {
  constructor(private readonly ideasService: IdeasService) {}

  @Post()
  create(@Body() dto: CreateIdeaDto) {
    return this.ideasService.create(dto);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const idea = await this.ideasService.findOne(id);
    if (!idea) {
      throw new NotFoundException(`Idee ${id} introuvable.`);
    }
    return idea;
  }
}
```

- [x] **Step 5: Implémenter `IdeasModule`**

Créer `apps/api/src/ideas/ideas.module.ts` :

```typescript
import { Module } from "@nestjs/common";
import { IdeasController } from "./ideas.controller.js";
import { IdeasService } from "./ideas.service.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { FinancialEngineModule } from "../financial-engine/financial-engine.module.js";

@Module({
  imports: [PrismaModule, FinancialEngineModule],
  controllers: [IdeasController],
  providers: [IdeasService],
})
export class IdeasModule {}
```

- [x] **Step 6: Vérifier le succès (GREEN)**

Run: `pnpm --filter api exec vitest run src/ideas/ideas.controller.spec.ts`
Expected: PASS, 4 tests.

- [x] **Step 7: Câbler `IdeasModule` dans `AppModule`**

Modifier `apps/api/src/app.module.ts` :

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { FinancialEngineModule } from './financial-engine/financial-engine.module.js';
import { IdeasModule } from './ideas/ideas.module.js';

@Module({
  imports: [FinancialEngineModule, IdeasModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [x] **Step 8: Lancer toute la suite, build, lint**

Run: `pnpm --filter api test && pnpm --filter api build && pnpm --filter api lint`
Expected: tous les tests passent, build et lint sans erreur.

- [x] **Step 9: Smoke test manuel**

Run (deux terminaux, ou `pnpm --filter api start:dev &` puis attendre le démarrage) :
```bash
curl -s -X POST http://localhost:3001/ideas -H "Content-Type: application/json" -d '{"businessModel":"ECOMMERCE","rawDescription":"Vente de vetements en ligne","currency":"XOF","hypotheses":{"price":5000,"volume":50,"variableCostPerUnit":2000,"fixedCosts":100000}}'
```
Expected: réponse JSON 201 avec `ideaId`, `result`, `breakEven`.

- [x] **Step 10: Commit**

```bash
git add apps/api/src
git commit -m "feat(api): IdeasController, IdeasModule et route POST/GET /ideas"
```

---

## Task 7: Client API frontend + machine à états du wizard

**Files:**
- Create: `apps/web/src/lib/ideas-api.ts`
- Create: `apps/web/src/components/wizard/wizard-reducer.ts`

**Interfaces:**
- Produces: types `BusinessModel`, `CurrencyCode` (copies locales, pas de package partagé, decision docs/DECISIONS.md monorepo), fonction `createIdea(input: CreateIdeaInput): Promise<CreateIdeaResponse>` où `CreateIdeaInput = { businessModel: BusinessModel; rawDescription: string; currency: CurrencyCode; hypotheses: { price: number; volume: number; variableCostPerUnit: number; fixedCosts: number } }` et `CreateIdeaResponse = { ideaId: string; result: { currency: CurrencyCode; revenue: number; grossMargin: number; estimatedResult: number }; breakEven: { reachable: true; volumeUnits: number } | { reachable: false; reason: string } }`. Type `WizardState`, `WizardAction`, `WizardStep`, fonction `wizardReducer`, valeur `initialWizardState`, tous exportés depuis `apps/web/src/components/wizard/wizard-reducer.ts`. Consommés par les composants d'étape (Tasks 8-10) et la page wizard (Task 11).

Pas de suite de tests automatisée sur `apps/web` (contrainte globale du plan). Vérification à la Task 11.

- [x] **Step 1: Écrire le client API**

Créer `apps/web/src/lib/ideas-api.ts` :

```typescript
export const BUSINESS_MODELS = ["ECOMMERCE", "FORMATION", "EBOOK", "SERVICE", "PRODUIT_PHYSIQUE", "AUTRE"] as const;
export type BusinessModel = (typeof BUSINESS_MODELS)[number];

export const CURRENCIES = ["XOF", "EUR", "USD", "GBP", "NGN", "GHS"] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

export interface HypothesesInput {
  price: number;
  volume: number;
  variableCostPerUnit: number;
  fixedCosts: number;
}

export interface CreateIdeaInput {
  businessModel: BusinessModel;
  rawDescription: string;
  currency: CurrencyCode;
  hypotheses: HypothesesInput;
}

export interface FinancialResult {
  currency: CurrencyCode;
  revenue: number;
  grossMargin: number;
  estimatedResult: number;
}

export type BreakEvenResult = { reachable: true; volumeUnits: number } | { reachable: false; reason: string };

export interface CreateIdeaResponse {
  ideaId: string;
  result: FinancialResult;
  breakEven: BreakEvenResult;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function createIdea(input: CreateIdeaInput): Promise<CreateIdeaResponse> {
  const response = await fetch(`${API_BASE_URL}/ideas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`La création de l'idée a échoué (${response.status}).`);
  }

  return (await response.json()) as CreateIdeaResponse;
}
```

- [x] **Step 2: Écrire la machine à états du wizard**

Créer `apps/web/src/components/wizard/wizard-reducer.ts` :

```typescript
import type { BusinessModel, CurrencyCode, HypothesesInput } from "@/lib/ideas-api";

export type WizardStep = "business-type" | "description" | "hypotheses" | "results";

export interface WizardState {
  step: WizardStep;
  businessModel: BusinessModel | null;
  rawDescription: string;
  currency: CurrencyCode;
  hypotheses: HypothesesInput;
}

export type WizardAction =
  | { type: "SELECT_BUSINESS_MODEL"; businessModel: BusinessModel }
  | { type: "SET_DESCRIPTION"; rawDescription: string }
  | { type: "SET_CURRENCY"; currency: CurrencyCode }
  | { type: "SET_HYPOTHESIS"; key: keyof HypothesesInput; value: number }
  | { type: "GO_TO_STEP"; step: WizardStep };

export const initialWizardState: WizardState = {
  step: "business-type",
  businessModel: null,
  rawDescription: "",
  currency: "XOF",
  hypotheses: { price: 0, volume: 0, variableCostPerUnit: 0, fixedCosts: 0 },
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
      return { ...state, hypotheses: { ...state.hypotheses, [action.key]: action.value } };
    case "GO_TO_STEP":
      return { ...state, step: action.step };
    default:
      return state;
  }
}
```

- [x] **Step 3: Vérifier que le projet compile toujours**

Run: `pnpm --filter web lint && pnpm --filter web build`
Expected: succès (ces fichiers ne sont pas encore importés ailleurs, doivent juste être syntaxiquement/typiquement valides).

- [x] **Step 4: Commit**

```bash
git add apps/web/src/lib/ideas-api.ts apps/web/src/components/wizard/wizard-reducer.ts
git commit -m "feat(web): client API ideas + machine a etats du wizard"
```

---

## Task 8: `WizardProgress` + `StepBusinessType`

**Files:**
- Create: `apps/web/src/components/wizard/WizardProgress.tsx`
- Create: `apps/web/src/components/wizard/StepBusinessType.tsx`

**Interfaces:**
- Consumes: `WizardStep` (Task 7), `BusinessModel`, `BUSINESS_MODELS` (Task 7).
- Produces: `WizardProgress({ currentStep }: { currentStep: WizardStep })`, `StepBusinessType({ onSelect }: { onSelect: (model: BusinessModel) => void })`. Consommés par la page wizard (Task 11).

- [x] **Step 1: `WizardProgress`**

Créer `apps/web/src/components/wizard/WizardProgress.tsx` :

```typescript
import type { WizardStep } from "./wizard-reducer";

const STEPS: { key: WizardStep; label: string }[] = [
  { key: "business-type", label: "Type" },
  { key: "description", label: "Description" },
  { key: "hypotheses", label: "Hypotheses" },
  { key: "results", label: "Resultats" },
];

export function WizardProgress({ currentStep }: { currentStep: WizardStep }) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <ol className="flex items-center justify-center gap-2 text-micro font-medium tracking-micro text-text-secondary">
      {STEPS.map((step, index) => (
        <li key={step.key} className="flex items-center gap-2">
          <span
            className={
              index <= currentIndex
                ? "flex h-6 w-6 items-center justify-center rounded-full bg-accent-emerald text-white"
                : "flex h-6 w-6 items-center justify-center rounded-full border border-border"
            }
          >
            {index + 1}
          </span>
          <span className={index === currentIndex ? "text-text-primary" : ""}>{step.label}</span>
          {index < STEPS.length - 1 ? <span aria-hidden>/</span> : null}
        </li>
      ))}
    </ol>
  );
}
```

- [x] **Step 2: `StepBusinessType`**

Créer `apps/web/src/components/wizard/StepBusinessType.tsx` :

```typescript
import type { BusinessModel } from "@/lib/ideas-api";

const OPTIONS: { value: BusinessModel; label: string }[] = [
  { value: "ECOMMERCE", label: "E-commerce" },
  { value: "FORMATION", label: "Formation" },
  { value: "EBOOK", label: "E-book" },
  { value: "SERVICE", label: "Service" },
  { value: "PRODUIT_PHYSIQUE", label: "Produit physique" },
  { value: "AUTRE", label: "Autre" },
];

export function StepBusinessType({ onSelect }: { onSelect: (model: BusinessModel) => void }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
      <h1 className="text-h2-mobile font-semibold md:text-h2">Quel type de business ?</h1>
      <div className="grid w-full gap-3 sm:grid-cols-2">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className="rounded-2xl border border-border bg-surface p-6 text-left text-h4 font-semibold transition-colors hover:border-accent-emerald"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [x] **Step 3: Vérifier lint + build**

Run: `pnpm --filter web lint && pnpm --filter web build`
Expected: succès.

- [x] **Step 4: Commit**

```bash
git add apps/web/src/components/wizard/WizardProgress.tsx apps/web/src/components/wizard/StepBusinessType.tsx
git commit -m "feat(web): WizardProgress et StepBusinessType"
```

---

## Task 9: `StepDescription` + `StepHypotheses`

**Files:**
- Create: `apps/web/src/components/wizard/StepDescription.tsx`
- Create: `apps/web/src/components/wizard/StepHypotheses.tsx`

**Interfaces:**
- Consumes: `BusinessModel`, `CurrencyCode`, `CURRENCIES`, `HypothesesInput` (Task 7).
- Produces: `StepDescription({ value, onChange, onNext, onBack }: { value: string; onChange: (v: string) => void; onNext: () => void; onBack: () => void })`, `StepHypotheses({ businessModel, hypotheses, currency, onHypothesisChange, onCurrencyChange, onSubmit, onBack, submitting, error }: {...})`. Consommés par la page wizard (Task 11).

- [ ] **Step 1: `StepDescription`**

Créer `apps/web/src/components/wizard/StepDescription.tsx` :

```typescript
export function StepDescription({
  value,
  onChange,
  onNext,
  onBack,
}: {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-center text-h2-mobile font-semibold md:text-h2">Decris ton idee</h1>
      <p className="text-center text-body text-text-secondary">
        Quelques phrases suffisent. Ca t'aidera plus tard quand l'IA proposera des hypotheses.
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
          disabled={value.trim().length === 0}
          className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-6 py-3 text-body font-semibold text-white disabled:opacity-40"
        >
          Continuer
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `StepHypotheses`**

Créer `apps/web/src/components/wizard/StepHypotheses.tsx` :

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

- [ ] **Step 3: Vérifier lint + build**

Run: `pnpm --filter web lint && pnpm --filter web build`
Expected: succès.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/wizard/StepDescription.tsx apps/web/src/components/wizard/StepHypotheses.tsx
git commit -m "feat(web): StepDescription et StepHypotheses"
```

---

## Task 10: `StepResults`

**Files:**
- Create: `apps/web/src/components/wizard/StepResults.tsx`

**Interfaces:**
- Consumes: `FinancialResult`, `BreakEvenResult` (Task 7).
- Produces: `StepResults({ result, breakEven }: { result: FinancialResult; breakEven: BreakEvenResult })`. Consommé par la page wizard (Task 11).

- [ ] **Step 1: Implémenter `StepResults`**

Créer `apps/web/src/components/wizard/StepResults.tsx` :

```typescript
import type { BreakEvenResult, FinancialResult } from "@/lib/ideas-api";

function formatAmount(value: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export function StepResults({ result, breakEven }: { result: FinancialResult; breakEven: BreakEvenResult }) {
  const positive = result.estimatedResult >= 0;

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-8 text-center">
      <div>
        <p className="text-micro font-medium tracking-micro text-text-secondary">Apercu</p>
        <h1 className={`text-h1-mobile font-bold md:text-h1 ${positive ? "text-success" : "text-error"}`}>
          {positive ? "Ca tient (pour l'instant)" : "Ca ne tient pas encore"}
        </h1>
      </div>
      <div className="grid w-full gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-small text-text-secondary">Chiffre d&apos;affaires</p>
          <p className="mt-2 text-h3 font-semibold tabular-nums">{formatAmount(result.revenue, result.currency)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-small text-text-secondary">Marge brute</p>
          <p className="mt-2 text-h3 font-semibold tabular-nums">{formatAmount(result.grossMargin, result.currency)}</p>
        </div>
        <div
          className={`rounded-2xl border-l-[3px] border-border bg-surface p-6 ${positive ? "border-l-success" : "border-l-error"}`}
        >
          <p className="text-small text-text-secondary">Resultat estime</p>
          <p className="mt-2 text-h3 font-semibold tabular-nums">
            {formatAmount(result.estimatedResult, result.currency)}
          </p>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-6 text-left">
        <p className="text-small text-text-secondary">Seuil de rentabilite</p>
        {breakEven.reachable ? (
          <p className="mt-2 text-body tabular-nums">
            Il te faut vendre <span className="font-semibold">{breakEven.volumeUnits}</span> unites par mois pour
            couvrir tes couts.
          </p>
        ) : (
          <p className="mt-2 text-body text-error">
            A prix et couts actuels, aucun volume ne permet d&apos;atteindre la rentabilite : ta marge par unite est
            nulle ou negative.
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Vérifier lint + build**

Run: `pnpm --filter web lint && pnpm --filter web build`
Expected: succès.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/wizard/StepResults.tsx
git commit -m "feat(web): StepResults"
```

---

## Task 11: Page wizard `/commencer` + vérification bout en bout

**Files:**
- Create: `apps/web/src/app/commencer/page.tsx`

**Interfaces:**
- Consumes: tout ce qui précède (Tasks 7-10).
- Produces: route `/commencer` fonctionnelle, cible déjà utilisée par les CTA de la landing (`apps/web/src/components/landing/Hero.tsx`, `Pricing.tsx`).

- [ ] **Step 1: Implémenter la page**

Créer `apps/web/src/app/commencer/page.tsx` :

```typescript
"use client";

import { useReducer, useState } from "react";
import { WizardProgress } from "@/components/wizard/WizardProgress";
import { StepBusinessType } from "@/components/wizard/StepBusinessType";
import { StepDescription } from "@/components/wizard/StepDescription";
import { StepHypotheses } from "@/components/wizard/StepHypotheses";
import { StepResults } from "@/components/wizard/StepResults";
import { initialWizardState, wizardReducer } from "@/components/wizard/wizard-reducer";
import { createIdea, type CreateIdeaResponse } from "@/lib/ideas-api";

export default function CommencerPage() {
  const [state, dispatch] = useReducer(wizardReducer, initialWizardState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<CreateIdeaResponse | null>(null);

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
          onNext={() => dispatch({ type: "GO_TO_STEP", step: "hypotheses" })}
          onBack={() => dispatch({ type: "GO_TO_STEP", step: "business-type" })}
        />
      )}

      {state.step === "hypotheses" && state.businessModel && (
        <StepHypotheses
          businessModel={state.businessModel}
          hypotheses={state.hypotheses}
          currency={state.currency}
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

- [ ] **Step 2: Vérifier lint + build**

Run: `pnpm --filter web lint && pnpm --filter web build`
Expected: succès.

- [ ] **Step 3: Vérification manuelle bout en bout**

Prérequis : `docker compose up -d`, `pnpm --filter api start:dev &`, `pnpm --filter web dev &` (attendre que les deux répondent : `curl -sf http://localhost:3001/ideas -o /dev/null -w "%{http_code}"` refuse en GET sans id donc tester plutôt `curl -sf http://localhost:3000 -o /dev/null -w "%{http_code}"` doit renvoyer `200`).

Avec un navigateur piloté (Playwright/chromium-cli) :
1. Naviguer vers `http://localhost:3000/commencer`.
2. Cliquer sur "E-commerce".
3. Remplir la description, cliquer "Continuer".
4. Remplir prix `5000`, volume `50`, cout variable `2000`, couts fixes `100000`, devise `XOF`, cliquer "Voir mes resultats".
5. Capturer un screenshot de l'écran résultats : vérifier CA, marge, résultat, seuil de rentabilité affichés et cohérents avec le moteur (250 000 / 150 000 / 50 000 XOF, seuil 34 unités).
6. Vérifier `console --errors` : 0 erreur.

- [ ] **Step 4: Vérifier la persistance en base**

Run: `docker compose exec postgres psql -U user -d ca_tient -c 'SELECT "businessModel", "currency" FROM "Idea" ORDER BY "createdAt" DESC LIMIT 1;'`
Expected: une ligne `ECOMMERCE | XOF` correspondant au test manuel.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/commencer/page.tsx
git commit -m "feat(web): page wizard /commencer, parcours bout en bout"
```

---

## Après ce plan

- `tasks/TODO.md` et `tasks/CHANGELOG.md` mis à jour (item Phase 3 coché, décisions notées) dans un commit dédié une fois toutes les tâches validées.
- `docs/DECISIONS.md` : ajouter une entrée si une déviation notable a eu lieu pendant l'exécution (ex. signature réelle de `@prisma/adapter-pg` différente de celle anticipée à la Task 2).
- Prochaines phases naturelles : Phase 4 (IA, préremplit les mêmes 4 champs), Phase 5 (module "Et si ?" et scénarios, le moteur les supporte déjà), déploiement, i18n.
