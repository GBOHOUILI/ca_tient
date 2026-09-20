# Phase 5a, moteur financier — projection annuelle avec saisonnalité, Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extraire le moteur financier dans un package partagé du monorepo (`packages/financial-engine`) et lui ajouter une projection annuelle avec saisonnalité (4 profils prédéfinis), sans aucune UI — livrable backend pur, testable seul.

**Architecture:** Déplacement mécanique des 4 fichiers déjà 100% purs (`financial-engine.types.ts`, `financial-engine.errors.ts`, `financial-engine.validation.ts`, `scenarios.ts`) vers `packages/financial-engine/src/`, extraction de `computeResult`/`computeBreakEven` (aujourd'hui méthodes de la classe NestJS `FinancialEngineService`) en fonctions pures du package, ajout d'un nouveau fichier `seasonality.ts` (même mécanique que `scenarios.ts` : pourcentages de variation appliqués via `applyDelta` existant). `apps/api/src/financial-engine/financial-engine.service.ts` devient un fin wrapper NestJS délégant au package.

**Tech Stack:** pnpm workspaces, TypeScript 6, vitest, aucune nouvelle dépendance runtime.

**Spec:** `docs/superpowers/specs/2026-09-20-phase-5a-moteur-saisonnalite-design.md`

## Global Constraints

- La saisonnalité est un levier de plus sur le volume via `applyDelta` déjà existant — jamais de nouvelle abstraction de calcul, jamais de variation du prix ou des coûts par mois.
- Chaque profil de saisonnalité est un tableau de 12 pourcentages de variation du volume dont la **somme fait exactement 0** (moyenne nulle) — ne change pas silencieusement le volume annuel total implicite.
- Composable avec les scénarios : la saisonnalité s'applique par-dessus une base déjà ajustée par un scénario, jamais sur la base brute en écrasant l'ajustement du scénario.
- Le seuil de rentabilité (`computeBreakEven`) reste calculé une fois sur les hypothèses de base, jamais dérivé de la courbe mensuelle — pas de notion de "seuil cumulé".
- Aucune persistance, aucun nouvel endpoint HTTP dans cette phase — fonctions pures uniquement.
- `packages/financial-engine` est consommé par `apps/api` via un build `tsc` standard (`tsc -p tsconfig.build.json`, même pattern que `apps/api` lui-même) — pas de step de build exotique à inventer, pas de watch mode à maintenir en continu.
- Tests en TDD, sans aucun mock — le moteur est fait de fonctions pures, cohérent avec `skills/testing.md`.
- Imports relatifs avec extension `.js` explicite (résolution `nodenext`, déjà en place dans tout `apps/api` et reprise à l'identique dans le nouveau package).
- Les tâches doivent être faites dans l'ordre (1 → 5), chaque tâche laisse le dépôt dans un état qui compile et dont tous les tests passent — jamais de commit intermédiaire cassé.
- **Correction par rapport à la spec** : `computeResult`/`computeBreakEven` ne sont pas des fonctions pures autonomes dans le code actuel (ce sont des méthodes de la classe `@Injectable() FinancialEngineService`) — Task 2 les extrait explicitement en fonctions pures avant que `seasonality.ts` (Task 4) puisse les appeler. Déjà noté dans la spec, rappelé ici pour qu'aucune tâche ne suppose l'inverse.
- **Correction par rapport à la spec** : le "cas limite" de test initialement prévu ("un profil pousse un mois à une valeur invalide") n'est pas atteignable avec les profils calibrés dans ce plan (tous restent entre -25 % et +40 %, jamais assez extrême pour rendre un volume négatif à partir d'une base valide). Remplacé dans les tests de la Task 4 par un cas limite réellement atteignable : `computeAnnualProjection` rejette des **hypothèses de base** invalides (ex. `price: 0`), propagé depuis `computeResult`/`applyDelta`.

---

## Task 1: Scaffold du package `financial-engine` + déplacement des fichiers déjà purs

**Files:**
- Create: `packages/financial-engine/package.json`
- Create: `packages/financial-engine/tsconfig.json`
- Create: `packages/financial-engine/tsconfig.build.json`
- Create: `packages/financial-engine/vitest.config.ts`
- Create: `packages/financial-engine/src/financial-engine.types.ts`
- Create: `packages/financial-engine/src/financial-engine.errors.ts`
- Create: `packages/financial-engine/src/financial-engine.validation.ts`
- Create: `packages/financial-engine/src/financial-engine.validation.spec.ts`
- Create: `packages/financial-engine/src/scenarios.ts`
- Create: `packages/financial-engine/src/scenarios.spec.ts`
- Modify: `pnpm-workspace.yaml`
- Modify: `package.json` (racine)

**Interfaces:**
- Produces: package pnpm `financial-engine` (nom du package, pas de scope npm — cohérent avec `api`/`web`), exportant pour l'instant (via les fichiers déplacés) `SUPPORTED_CURRENCIES`, `CurrencyCode`, `Hypotheses`, `FinancialResult`, `BreakEvenResult` (`financial-engine.types.ts`), `FinancialEngineInputError` (`financial-engine.errors.ts`), `assertValidHypotheses` (`financial-engine.validation.ts`), `applyDelta`, `applyScenario`, `SCENARIO_DELTAS`, `ScenarioKey`, `SensitivityDelta` (`scenarios.ts`). Pas encore de barrel `index.ts` (ajouté Task 2) ni consommé par `apps/api` (câblé Task 3) — ce package est autonome et testable seul à la fin de cette tâche.

Ce déplacement est mécanique (contenu identique caractère pour caractère aux fichiers existants dans `apps/api/src/financial-engine/`, les imports relatifs entre eux ne changent pas puisqu'ils restent dans le même dossier). Pas de cycle TDD (aucun comportement nouveau) — exception explicite de la skill test-driven-development, même pattern que Task 1 des phases précédentes. `apps/api` n'est pas touché dans cette tâche : les fichiers originaux y restent en place pour l'instant (supprimés Task 3), donc rien ne casse.

- [ ] **Step 1: Créer la configuration du package**

Créer `packages/financial-engine/package.json` :

```json
{
  "name": "financial-engine",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "test": "vitest run"
  },
  "devDependencies": {
    "typescript": "^6.0.2",
    "vitest": "^4.1.2"
  }
}
```

Créer `packages/financial-engine/tsconfig.json` :

```json
{
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "target": "ES2023",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "types": ["vitest/globals", "node"]
  },
  "include": ["src"]
}
```

Créer `packages/financial-engine/tsconfig.build.json` (même pattern que `apps/api/tsconfig.build.json` : exclut les fichiers de test du build de production) :

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "**/*.spec.ts"]
}
```

Créer `packages/financial-engine/vitest.config.ts` :

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
  },
});
```

- [ ] **Step 2: Déclarer le package dans le workspace**

Modifier `pnpm-workspace.yaml` :

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Modifier `package.json` (racine), ajouter deux scripts après `"test:api"` :

```json
    "test:api": "pnpm --filter api test",
    "build:financial-engine": "pnpm --filter financial-engine build",
    "test:financial-engine": "pnpm --filter financial-engine test"
```

- [ ] **Step 3: Copier les 4 fichiers purs et leurs 2 fichiers de test**

Créer `packages/financial-engine/src/financial-engine.types.ts` (contenu identique à `apps/api/src/financial-engine/financial-engine.types.ts`) :

```typescript
// Liste volontairement restreinte pour le MVP (marché initial Bénin, ouverture
// régionale prévue par docs/PRODUCT.md). Rien à convertir entre devises : le champ
// n'est qu'une étiquette qui traverse le calcul, voir financial-engine.service.ts.
export const SUPPORTED_CURRENCIES = ["XOF", "EUR", "USD", "GBP", "NGN", "GHS"] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

// Tous les montants sont des entiers dans la plus petite unité de la devise
// (centimes pour EUR/USD/GBP/NGN/GHS, unité entière pour XOF qui n'a pas de
// sous-unité). Pas d'arithmétique flottante sur les montants, voir
// skills/financial-engine.md.
export interface Hypotheses {
  currency: CurrencyCode;
  price: number;
  variableCostPerUnit: number;
  fixedCosts: number;
  volume: number;
}

export interface FinancialResult {
  currency: CurrencyCode;
  revenue: number;
  grossMargin: number;
  estimatedResult: number;
}

export type BreakEvenResult =
  | { reachable: true; volumeUnits: number }
  | { reachable: false; reason: "non_positive_unit_margin" };
```

Créer `packages/financial-engine/src/financial-engine.errors.ts` (contenu identique) :

```typescript
export class FinancialEngineInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinancialEngineInputError";
  }
}
```

Créer `packages/financial-engine/src/financial-engine.validation.ts` (contenu identique) :

```typescript
import { FinancialEngineInputError } from "./financial-engine.errors.js";
import { SUPPORTED_CURRENCIES, type Hypotheses } from "./financial-engine.types.js";

function assertSafeNonNegativeInteger(value: number, field: string): void {
  if (!Number.isInteger(value)) {
    throw new FinancialEngineInputError(`${field} doit être un entier (plus petite unité de la devise).`);
  }
  if (value < 0) {
    throw new FinancialEngineInputError(`${field} ne peut pas être négatif.`);
  }
  if (value > Number.MAX_SAFE_INTEGER) {
    throw new FinancialEngineInputError(`${field} dépasse la limite numérique sûre.`);
  }
}

export function assertValidHypotheses(hypotheses: Hypotheses): void {
  if (!(SUPPORTED_CURRENCIES as readonly string[]).includes(hypotheses.currency)) {
    throw new FinancialEngineInputError(`Devise non supportée : ${hypotheses.currency}.`);
  }

  assertSafeNonNegativeInteger(hypotheses.price, "price");
  if (hypotheses.price === 0) {
    throw new FinancialEngineInputError("price doit être strictement positif.");
  }
  assertSafeNonNegativeInteger(hypotheses.variableCostPerUnit, "variableCostPerUnit");
  assertSafeNonNegativeInteger(hypotheses.fixedCosts, "fixedCosts");
  assertSafeNonNegativeInteger(hypotheses.volume, "volume");
}
```

Créer `packages/financial-engine/src/financial-engine.validation.spec.ts` (contenu identique) :

```typescript
import { assertValidHypotheses } from "./financial-engine.validation.js";
import { FinancialEngineInputError } from "./financial-engine.errors.js";
import type { Hypotheses } from "./financial-engine.types.js";

function validHypotheses(overrides: Partial<Hypotheses> = {}): Hypotheses {
  return {
    currency: "XOF",
    price: 5000,
    variableCostPerUnit: 2000,
    fixedCosts: 100000,
    volume: 50,
    ...overrides,
  };
}

describe("assertValidHypotheses", () => {
  it("accepts valid hypotheses without throwing", () => {
    expect(() => assertValidHypotheses(validHypotheses())).not.toThrow();
  });

  it("rejects an unsupported currency", () => {
    expect(() => assertValidHypotheses(validHypotheses({ currency: "JPY" as Hypotheses["currency"] }))).toThrow(
      FinancialEngineInputError,
    );
  });

  it("rejects a price of zero", () => {
    expect(() => assertValidHypotheses(validHypotheses({ price: 0 }))).toThrow(FinancialEngineInputError);
  });

  it("rejects a negative price", () => {
    expect(() => assertValidHypotheses(validHypotheses({ price: -100 }))).toThrow(FinancialEngineInputError);
  });

  it("rejects a non-integer price", () => {
    expect(() => assertValidHypotheses(validHypotheses({ price: 100.5 }))).toThrow(FinancialEngineInputError);
  });

  it("rejects a negative variableCostPerUnit", () => {
    expect(() => assertValidHypotheses(validHypotheses({ variableCostPerUnit: -1 }))).toThrow(
      FinancialEngineInputError,
    );
  });

  it("rejects a negative fixedCosts", () => {
    expect(() => assertValidHypotheses(validHypotheses({ fixedCosts: -1 }))).toThrow(FinancialEngineInputError);
  });

  it("rejects a negative volume", () => {
    expect(() => assertValidHypotheses(validHypotheses({ volume: -1 }))).toThrow(FinancialEngineInputError);
  });

  it("accepts a volume of zero", () => {
    expect(() => assertValidHypotheses(validHypotheses({ volume: 0 }))).not.toThrow();
  });

  it("accepts a fixedCosts of zero", () => {
    expect(() => assertValidHypotheses(validHypotheses({ fixedCosts: 0 }))).not.toThrow();
  });

  it("rejects an amount beyond Number.MAX_SAFE_INTEGER", () => {
    expect(() =>
      assertValidHypotheses(validHypotheses({ fixedCosts: Number.MAX_SAFE_INTEGER + 1 })),
    ).toThrow(FinancialEngineInputError);
  });
});
```

Créer `packages/financial-engine/src/scenarios.ts` (contenu identique) :

```typescript
import { assertValidHypotheses } from "./financial-engine.validation.js";
import type { Hypotheses } from "./financial-engine.types.js";

export interface SensitivityDelta {
  price?: number;
  variableCostPerUnit?: number;
  fixedCosts?: number;
  volume?: number;
}

export type ScenarioKey = "prudent" | "realiste" | "ambitieux" | "crise";

// docs/FINANCIAL_ENGINE.md ne distingue pas coûts fixes/variables dans sa colonne
// "Coûts" : on applique le même pourcentage aux deux. Coefficients marqués par le
// document lui-même comme "un point de départ, à valider avant implémentation finale".
export const SCENARIO_DELTAS: Record<ScenarioKey, SensitivityDelta> = {
  prudent: { volume: -20, fixedCosts: 10, variableCostPerUnit: 10 },
  realiste: {},
  ambitieux: { volume: 30 },
  crise: { volume: -40, price: -10, fixedCosts: 15, variableCostPerUnit: 15 },
};

function applyPercent(value: number, percent: number | undefined): number {
  if (!percent) return value;
  return Math.round(value * (1 + percent / 100));
}

export function applyDelta(base: Hypotheses, delta: SensitivityDelta): Hypotheses {
  const adjusted: Hypotheses = {
    currency: base.currency,
    price: applyPercent(base.price, delta.price),
    variableCostPerUnit: applyPercent(base.variableCostPerUnit, delta.variableCostPerUnit),
    fixedCosts: applyPercent(base.fixedCosts, delta.fixedCosts),
    volume: applyPercent(base.volume, delta.volume),
  };

  assertValidHypotheses(adjusted);
  return adjusted;
}

export function applyScenario(base: Hypotheses, scenario: ScenarioKey): Hypotheses {
  return applyDelta(base, SCENARIO_DELTAS[scenario]);
}
```

Créer `packages/financial-engine/src/scenarios.spec.ts` (contenu identique) :

```typescript
import { applyDelta, applyScenario, SCENARIO_DELTAS } from "./scenarios.js";
import { FinancialEngineInputError } from "./financial-engine.errors.js";
import type { Hypotheses } from "./financial-engine.types.js";

function hypotheses(overrides: Partial<Hypotheses> = {}): Hypotheses {
  return {
    currency: "XOF",
    price: 5000,
    variableCostPerUnit: 2000,
    fixedCosts: 100000,
    volume: 50,
    ...overrides,
  };
}

describe("applyDelta", () => {
  it("returns the base hypotheses unchanged when no delta is given", () => {
    expect(applyDelta(hypotheses(), {})).toEqual(hypotheses());
  });

  it("applies a percentage variation and rounds to the nearest integer", () => {
    const result = applyDelta(hypotheses({ volume: 33 }), { volume: -20 });

    expect(result.volume).toBe(26); // 33 * 0.8 = 26.4 -> 26
  });

  it("applies independent deltas to price, costs and volume at once", () => {
    const result = applyDelta(hypotheses(), { price: -10, volume: -40, fixedCosts: 15, variableCostPerUnit: 15 });

    expect(result).toEqual({
      currency: "XOF",
      price: 4500, // 5000 * 0.9
      variableCostPerUnit: 2300, // 2000 * 1.15
      fixedCosts: 115000, // 100000 * 1.15
      volume: 30, // 50 * 0.6
    });
  });

  it("throws when a delta pushes a value into invalid territory", () => {
    expect(() => applyDelta(hypotheses(), { price: -150 })).toThrow(FinancialEngineInputError);
  });
});

describe("applyScenario", () => {
  it("leaves hypotheses unchanged for the realiste scenario", () => {
    expect(applyScenario(hypotheses(), "realiste")).toEqual(hypotheses());
  });

  it("applies the prudent scenario coefficients", () => {
    const result = applyScenario(hypotheses(), "prudent");

    expect(result).toEqual({
      currency: "XOF",
      price: 5000,
      variableCostPerUnit: 2200, // +10 %
      fixedCosts: 110000, // +10 %
      volume: 40, // -20 %
    });
  });

  it("applies the ambitieux scenario coefficients", () => {
    const result = applyScenario(hypotheses(), "ambitieux");

    expect(result).toEqual({
      currency: "XOF",
      price: 5000,
      variableCostPerUnit: 2000,
      fixedCosts: 100000,
      volume: 65, // +30 %
    });
  });

  it("applies the crise scenario coefficients", () => {
    const result = applyScenario(hypotheses(), "crise");

    expect(result).toEqual({
      currency: "XOF",
      price: 4500, // -10 %
      variableCostPerUnit: 2300, // +15 %
      fixedCosts: 115000, // +15 %
      volume: 30, // -40 %
    });
  });

  it("exposes the four documented scenario keys", () => {
    expect(Object.keys(SCENARIO_DELTAS).sort()).toEqual(["ambitieux", "crise", "prudent", "realiste"]);
  });
});
```

- [ ] **Step 4: Installer et lier le workspace**

Run: `pnpm install`
Expected: pnpm détecte le nouveau package `financial-engine`, aucune erreur.

- [ ] **Step 5: Vérifier que le package est autonome et vert**

Run: `pnpm --filter financial-engine test`
Expected: PASS, 20 tests (11 dans `financial-engine.validation.spec.ts` + 9 dans `scenarios.spec.ts`).

- [ ] **Step 6: Vérifier que `apps/api` n'a pas régressé (toujours ses propres fichiers pour l'instant)**

Run: `pnpm --filter api test`
Expected: PASS, 57 tests (inchangé — `apps/api` utilise toujours ses fichiers locaux à ce stade).

- [ ] **Step 7: Commit**

```bash
git add packages/financial-engine pnpm-workspace.yaml package.json pnpm-lock.yaml
git commit -m "feat: scaffold du package financial-engine, deplacement des modules purs existants"
```

---

## Task 2: Extraction de `computeResult`/`computeBreakEven` en fonctions pures + barrel `index.ts`

**Files:**
- Create: `packages/financial-engine/src/financial-engine.calculations.ts`
- Create: `packages/financial-engine/src/financial-engine.calculations.spec.ts`
- Create: `packages/financial-engine/src/index.ts`

**Interfaces:**
- Consumes: `assertValidHypotheses` (`financial-engine.validation.ts`, Task 1), `Hypotheses`/`FinancialResult`/`BreakEvenResult` (`financial-engine.types.ts`, Task 1).
- Produces: fonctions pures `computeResult(hypotheses: Hypotheses): FinancialResult` et `computeBreakEven(input: BreakEvenInput): BreakEvenResult`, type `BreakEvenInput` (`financial-engine.calculations.ts`) ; barrel `index.ts` réexportant tout ce que le package expose publiquement. Consommées par `seasonality.ts` (Task 4) et par `apps/api` via le barrel (Task 3).

- [ ] **Step 1: Écrire le test (RED)**

Créer `packages/financial-engine/src/financial-engine.calculations.spec.ts` :

```typescript
import { computeResult, computeBreakEven } from "./financial-engine.calculations.js";
import { FinancialEngineInputError } from "./financial-engine.errors.js";
import type { Hypotheses } from "./financial-engine.types.js";

function hypotheses(overrides: Partial<Hypotheses> = {}): Hypotheses {
  return {
    currency: "XOF",
    price: 5000,
    variableCostPerUnit: 2000,
    fixedCosts: 100000,
    volume: 50,
    ...overrides,
  };
}

describe("computeResult", () => {
  it("computes revenue, gross margin and estimated result for the nominal case", () => {
    const result = computeResult(hypotheses());

    expect(result).toEqual({
      currency: "XOF",
      revenue: 250000,
      grossMargin: 150000,
      estimatedResult: 50000,
    });
  });

  it("returns a zero revenue and a negative result when volume is zero", () => {
    const result = computeResult(hypotheses({ volume: 0 }));

    expect(result).toEqual({
      currency: "XOF",
      revenue: 0,
      grossMargin: 0,
      estimatedResult: -100000,
    });
  });

  it("rejects invalid hypotheses", () => {
    expect(() => computeResult(hypotheses({ price: -1 }))).toThrow(FinancialEngineInputError);
  });
});

describe("computeBreakEven", () => {
  it("computes the break-even volume for the nominal case", () => {
    const result = computeBreakEven(hypotheses());

    expect(result).toEqual({ reachable: true, volumeUnits: 34 });
  });

  it("is exactly reachable when fixed costs divide evenly by the unit margin", () => {
    const result = computeBreakEven(hypotheses({ fixedCosts: 90000 }));

    expect(result).toEqual({ reachable: true, volumeUnits: 30 });
  });

  it("is reachable at volume zero when fixed costs are zero", () => {
    const result = computeBreakEven(hypotheses({ fixedCosts: 0 }));

    expect(result).toEqual({ reachable: true, volumeUnits: 0 });
  });

  it("is unreachable when the unit margin is zero", () => {
    const result = computeBreakEven(hypotheses({ price: 2000, variableCostPerUnit: 2000 }));

    expect(result).toEqual({ reachable: false, reason: "non_positive_unit_margin" });
  });

  it("is unreachable when the unit margin is negative", () => {
    const result = computeBreakEven(hypotheses({ price: 1000, variableCostPerUnit: 2000 }));

    expect(result).toEqual({ reachable: false, reason: "non_positive_unit_margin" });
  });

  it("rejects invalid hypotheses", () => {
    expect(() => computeBreakEven(hypotheses({ fixedCosts: -1 }))).toThrow(FinancialEngineInputError);
  });
});
```

- [ ] **Step 2: Vérifier l'échec (RED)**

Run: `pnpm --filter financial-engine exec vitest run src/financial-engine.calculations.spec.ts`
Expected: FAIL, `Cannot find module './financial-engine.calculations.js'`.

- [ ] **Step 3: Implémenter `financial-engine.calculations.ts`**

Créer `packages/financial-engine/src/financial-engine.calculations.ts` (extraction fidèle du corps des méthodes de `FinancialEngineService`, aucun changement de logique) :

```typescript
import { assertValidHypotheses } from "./financial-engine.validation.js";
import type { BreakEvenResult, FinancialResult, Hypotheses } from "./financial-engine.types.js";

export type BreakEvenInput = Pick<Hypotheses, "currency" | "price" | "variableCostPerUnit" | "fixedCosts">;

export function computeResult(hypotheses: Hypotheses): FinancialResult {
  assertValidHypotheses(hypotheses);

  const revenue = hypotheses.price * hypotheses.volume;
  const variableCosts = hypotheses.variableCostPerUnit * hypotheses.volume;
  const grossMargin = revenue - variableCosts;
  const estimatedResult = grossMargin - hypotheses.fixedCosts;

  return { currency: hypotheses.currency, revenue, grossMargin, estimatedResult };
}

export function computeBreakEven(input: BreakEvenInput): BreakEvenResult {
  assertValidHypotheses({ ...input, volume: 0 });

  const unitMargin = input.price - input.variableCostPerUnit;
  if (unitMargin <= 0) {
    return { reachable: false, reason: "non_positive_unit_margin" };
  }

  return { reachable: true, volumeUnits: Math.ceil(input.fixedCosts / unitMargin) };
}
```

- [ ] **Step 4: Vérifier le succès (GREEN)**

Run: `pnpm --filter financial-engine exec vitest run src/financial-engine.calculations.spec.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Créer le barrel `index.ts`**

Créer `packages/financial-engine/src/index.ts` :

```typescript
export * from "./financial-engine.types.js";
export * from "./financial-engine.errors.js";
export { assertValidHypotheses } from "./financial-engine.validation.js";
export { computeResult, computeBreakEven, type BreakEvenInput } from "./financial-engine.calculations.js";
export { applyDelta, applyScenario, SCENARIO_DELTAS, type ScenarioKey, type SensitivityDelta } from "./scenarios.js";
```

Note : `seasonality.ts` (Task 4) ajoutera sa propre ligne d'export ici.

- [ ] **Step 6: Lancer toute la suite du package et builder**

Run: `pnpm --filter financial-engine test && pnpm --filter financial-engine build`
Expected: 29 tests passent (20 de la Task 1 + 9 nouveaux) ; le build produit `packages/financial-engine/dist/index.js` et `dist/index.d.ts` sans erreur.

- [ ] **Step 7: Commit**

```bash
git add packages/financial-engine/src/financial-engine.calculations.ts packages/financial-engine/src/financial-engine.calculations.spec.ts packages/financial-engine/src/index.ts
git commit -m "feat: extrait computeResult/computeBreakEven en fonctions pures, ajoute le barrel du package"
```

---

## Task 3: Câblage d'`apps/api` sur le package, suppression des fichiers dupliqués

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/api/src/financial-engine/financial-engine.service.ts`
- Modify: `apps/api/src/financial-engine/financial-engine.service.spec.ts`
- Modify: `apps/api/src/ideas/ideas.service.ts`
- Modify: `apps/api/src/ideas/dto/create-idea.dto.ts`
- Modify: `apps/api/src/ai/ai-provider.port.ts`
- Modify: `apps/api/src/ai/dto/suggest-hypotheses.dto.ts`
- Modify: `apps/api/src/ai/gemini.provider.ts`
- Delete: `apps/api/src/financial-engine/financial-engine.types.ts`
- Delete: `apps/api/src/financial-engine/financial-engine.errors.ts`
- Delete: `apps/api/src/financial-engine/financial-engine.validation.ts`
- Delete: `apps/api/src/financial-engine/financial-engine.validation.spec.ts`
- Delete: `apps/api/src/financial-engine/scenarios.ts`
- Delete: `apps/api/src/financial-engine/scenarios.spec.ts`

**Interfaces:**
- Consumes: barrel `financial-engine` (package, Task 2) — `computeResult`, `computeBreakEven`, `BreakEvenInput`, `SUPPORTED_CURRENCIES`, `CurrencyCode`, `Hypotheses`, `FinancialResult`, `BreakEvenResult`.
- Produces: `FinancialEngineService` (signatures publiques inchangées, `computeResult`/`computeBreakEven` délèguent au package) — aucun changement d'interface pour `IdeasService`/`IdeasController`/`AiController`, qui continuent de fonctionner sans modification de leur propre code.

Tous les fichiers de cette tâche changent ensemble (dépendance directe : le service et les 5 fichiers consommateurs ne compilent qu'une fois tous mis à jour vers le nouvel import). Pas de nouveau comportement testable indépendamment ici — c'est un déplacement d'imports, la garantie de non-régression vient de la suite de tests complète à la fin.

- [ ] **Step 1: Ajouter la dépendance workspace**

Modifier `apps/api/package.json`, ajouter dans `"dependencies"` (ordre alphabétique déjà respecté par le fichier, insérer après `"class-validator"`) :

```json
    "class-validator": "^0.15.1",
    "financial-engine": "workspace:*",
```

Run: `pnpm install`
Expected: `apps/api/node_modules/financial-engine` est un lien symbolique vers `packages/financial-engine`.

- [ ] **Step 2: Réécrire `FinancialEngineService` en wrapper délégant au package**

Remplacer le contenu de `apps/api/src/financial-engine/financial-engine.service.ts` :

```typescript
import { Injectable } from "@nestjs/common";
import { computeResult, computeBreakEven } from "financial-engine";
import type { BreakEvenInput, BreakEvenResult, FinancialResult, Hypotheses } from "financial-engine";

@Injectable()
export class FinancialEngineService {
  computeResult(hypotheses: Hypotheses): FinancialResult {
    return computeResult(hypotheses);
  }

  computeBreakEven(input: BreakEvenInput): BreakEvenResult {
    return computeBreakEven(input);
  }
}
```

- [ ] **Step 3: Simplifier le test du service (la logique métier est déjà testée dans le package, Task 2)**

Remplacer le contenu de `apps/api/src/financial-engine/financial-engine.service.spec.ts` :

```typescript
import { Test } from "@nestjs/testing";
import { FinancialEngineService } from "./financial-engine.service.js";
import type { Hypotheses } from "financial-engine";

function hypotheses(overrides: Partial<Hypotheses> = {}): Hypotheses {
  return {
    currency: "XOF",
    price: 5000,
    variableCostPerUnit: 2000,
    fixedCosts: 100000,
    volume: 50,
    ...overrides,
  };
}

describe("FinancialEngineService", () => {
  let service: FinancialEngineService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [FinancialEngineService],
    }).compile();
    service = module.get(FinancialEngineService);
  });

  it("delegates computeResult to the financial-engine package", () => {
    expect(service.computeResult(hypotheses())).toEqual({
      currency: "XOF",
      revenue: 250000,
      grossMargin: 150000,
      estimatedResult: 50000,
    });
  });

  it("delegates computeBreakEven to the financial-engine package", () => {
    expect(service.computeBreakEven(hypotheses())).toEqual({ reachable: true, volumeUnits: 34 });
  });
});
```

Note : les 9 cas limites (prix zéro, coûts négatifs, marge nulle/négative, etc.) restent couverts par `packages/financial-engine/src/financial-engine.calculations.spec.ts` (Task 2) — les retester ici serait une duplication, pas une garantie supplémentaire (la logique est identique, appelée telle quelle).

- [ ] **Step 4: Mettre à jour les imports des 5 fichiers consommateurs**

Dans `apps/api/src/ideas/ideas.service.ts`, remplacer :
```typescript
import type { Hypotheses } from "../financial-engine/financial-engine.types.js";
```
par :
```typescript
import type { Hypotheses } from "financial-engine";
```

Dans `apps/api/src/ideas/dto/create-idea.dto.ts`, remplacer :
```typescript
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "../../financial-engine/financial-engine.types.js";
```
par :
```typescript
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "financial-engine";
```

Dans `apps/api/src/ai/ai-provider.port.ts`, remplacer :
```typescript
import type { CurrencyCode } from "../financial-engine/financial-engine.types.js";
```
par :
```typescript
import type { CurrencyCode } from "financial-engine";
```

Dans `apps/api/src/ai/dto/suggest-hypotheses.dto.ts`, remplacer :
```typescript
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "../../financial-engine/financial-engine.types.js";
```
par :
```typescript
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "financial-engine";
```

Dans `apps/api/src/ai/gemini.provider.ts`, remplacer :
```typescript
import type { CurrencyCode } from "../financial-engine/financial-engine.types.js";
```
par :
```typescript
import type { CurrencyCode } from "financial-engine";
```

- [ ] **Step 5: Supprimer les fichiers désormais dupliqués dans `apps/api`**

```bash
rm apps/api/src/financial-engine/financial-engine.types.ts
rm apps/api/src/financial-engine/financial-engine.errors.ts
rm apps/api/src/financial-engine/financial-engine.validation.ts
rm apps/api/src/financial-engine/financial-engine.validation.spec.ts
rm apps/api/src/financial-engine/scenarios.ts
rm apps/api/src/financial-engine/scenarios.spec.ts
```

`apps/api/src/financial-engine/` ne contient plus que `financial-engine.module.ts`, `financial-engine.module.spec.ts`, `financial-engine.service.ts`, `financial-engine.service.spec.ts` — le module NestJS redevient un pur wrapper d'intégration, la logique vit dans le package.

- [ ] **Step 6: Builder le package puis lancer toute la suite `apps/api`**

Run: `pnpm --filter financial-engine build && pnpm --filter api test`
Expected: PASS, 30 tests (57 précédents, moins les 11 de `financial-engine.validation.spec.ts` et les 9 de `scenarios.spec.ts` — supprimés, déplacés dans le package Task 1 — moins les 7 tests retirés en simplifiant `financial-engine.service.spec.ts` de 9 à 2 : 57 - 11 - 9 - 7 = 30), 0 échec.

- [ ] **Step 7: Build et lint complets**

Run: `pnpm --filter api build && pnpm --filter api lint`
Expected: build et lint sans erreur (le build `nest build` doit résoudre `financial-engine` depuis `node_modules/financial-engine` -> `packages/financial-engine/dist/index.js`, produit par le Step 6).

- [ ] **Step 8: Commit**

```bash
git add apps/api/package.json pnpm-lock.yaml apps/api/src/financial-engine apps/api/src/ideas/ideas.service.ts apps/api/src/ideas/dto/create-idea.dto.ts apps/api/src/ai/ai-provider.port.ts apps/api/src/ai/dto/suggest-hypotheses.dto.ts apps/api/src/ai/gemini.provider.ts
git commit -m "refactor(api): consomme le package financial-engine, supprime les fichiers dupliques"
```

---

## Task 4: `seasonality.ts` — projection annuelle avec saisonnalité

**Files:**
- Create: `packages/financial-engine/src/seasonality.ts`
- Create: `packages/financial-engine/src/seasonality.spec.ts`
- Modify: `packages/financial-engine/src/index.ts`

**Interfaces:**
- Consumes: `applyDelta` (`scenarios.ts`, Task 1), `computeResult` (`financial-engine.calculations.ts`, Task 2), `Hypotheses`/`FinancialResult` (`financial-engine.types.ts`, Task 1).
- Produces: type `SeasonalityProfileKey`, interface `MonthlyResult` (`{ month: number; result: FinancialResult }`), constante `SEASONALITY_PROFILES`, fonction `computeAnnualProjection(base: Hypotheses, profile: SeasonalityProfileKey): MonthlyResult[]`. Consommés par `FinancialEngineService.computeAnnualProjection` (Task 5) et par la Phase 5b (frontend, hors scope ici).

- [ ] **Step 1: Écrire le test (RED)**

Créer `packages/financial-engine/src/seasonality.spec.ts` :

```typescript
import { computeAnnualProjection, SEASONALITY_PROFILES } from "./seasonality.js";
import { computeResult } from "./financial-engine.calculations.js";
import { applyScenario } from "./scenarios.js";
import { FinancialEngineInputError } from "./financial-engine.errors.js";
import type { Hypotheses } from "./financial-engine.types.js";

function hypotheses(overrides: Partial<Hypotheses> = {}): Hypotheses {
  return {
    currency: "XOF",
    price: 5000,
    variableCostPerUnit: 2000,
    fixedCosts: 100000,
    volume: 50,
    ...overrides,
  };
}

describe("SEASONALITY_PROFILES", () => {
  it("exposes the four documented profile keys", () => {
    expect(Object.keys(SEASONALITY_PROFILES).sort()).toEqual(["ete", "fetes_fin_annee", "rentree_scolaire", "stable"]);
  });

  it("each profile has exactly 12 monthly percentages summing to zero", () => {
    for (const [key, percentages] of Object.entries(SEASONALITY_PROFILES)) {
      expect(percentages, `profile ${key} should have 12 months`).toHaveLength(12);
      const sum = percentages.reduce((total, value) => total + value, 0);
      expect(sum, `profile ${key} should average to zero`).toBe(0);
    }
  });
});

describe("computeAnnualProjection", () => {
  it("returns 12 monthly results numbered 1 to 12 in order", () => {
    const projection = computeAnnualProjection(hypotheses(), "stable");

    expect(projection).toHaveLength(12);
    expect(projection.map((m) => m.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("the stable profile matches the base result for all 12 months", () => {
    const projection = computeAnnualProjection(hypotheses(), "stable");
    const base = computeResult(hypotheses());

    for (const monthly of projection) {
      expect(monthly.result).toEqual(base);
    }
  });

  it("a non-stable profile redistributes volume: at least one month above and one below the base", () => {
    const projection = computeAnnualProjection(hypotheses(), "fetes_fin_annee");
    const base = computeResult(hypotheses());

    expect(projection.some((m) => m.result.revenue > base.revenue)).toBe(true);
    expect(projection.some((m) => m.result.revenue < base.revenue)).toBe(true);
  });

  it("composes with a scenario applied beforehand, not with the raw base", () => {
    const scenarioAdjusted = applyScenario(hypotheses(), "prudent");
    const projectionOnScenario = computeAnnualProjection(scenarioAdjusted, "fetes_fin_annee");
    const projectionOnRawBase = computeAnnualProjection(hypotheses(), "fetes_fin_annee");

    expect(projectionOnScenario).not.toEqual(projectionOnRawBase);
    // Le mois de decembre (index 11) du profil fetes_fin_annee a +30% de volume :
    // sur la base ajustee prudent (volume 40, cf. scenarios.spec.ts), 40 * 1.3 = 52.
    expect(projectionOnScenario[11]?.result.revenue).toBe(computeResult({ ...scenarioAdjusted, volume: 52 }).revenue);
  });

  it("rejects invalid base hypotheses regardless of profile", () => {
    expect(() => computeAnnualProjection(hypotheses({ price: 0 }), "stable")).toThrow(FinancialEngineInputError);
  });
});
```

- [ ] **Step 2: Vérifier l'échec (RED)**

Run: `pnpm --filter financial-engine exec vitest run src/seasonality.spec.ts`
Expected: FAIL, `Cannot find module './seasonality.js'`.

- [ ] **Step 3: Implémenter `seasonality.ts`**

Créer `packages/financial-engine/src/seasonality.ts` :

```typescript
import { applyDelta } from "./scenarios.js";
import { computeResult } from "./financial-engine.calculations.js";
import type { Hypotheses, FinancialResult } from "./financial-engine.types.js";

export type SeasonalityProfileKey = "stable" | "fetes_fin_annee" | "ete" | "rentree_scolaire";

export interface MonthlyResult {
  month: number; // 1 = janvier ... 12 = décembre
  result: FinancialResult;
}

// Pourcentages de variation du volume par mois (janvier -> decembre), somme = 0.
// Points de depart a calibrer avec des donnees reelles avant mise en production,
// meme statut que SCENARIO_DELTAS dans scenarios.ts ("un point de depart, a valider").
export const SEASONALITY_PROFILES: Record<SeasonalityProfileKey, number[]> = {
  stable: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  fetes_fin_annee: [-25, -20, -10, -5, 0, 0, 0, 0, 0, 5, 25, 30],
  ete: [-10, -10, -5, 0, 5, 20, 30, 20, -5, -15, -15, -15],
  rentree_scolaire: [-10, -10, -5, -5, -5, -10, -15, 0, 30, 35, 0, -5],
};

export function computeAnnualProjection(base: Hypotheses, profile: SeasonalityProfileKey): MonthlyResult[] {
  return SEASONALITY_PROFILES[profile].map((percent, index) => ({
    month: index + 1,
    result: computeResult(applyDelta(base, { volume: percent })),
  }));
}
```

- [ ] **Step 4: Vérifier le succès (GREEN)**

Run: `pnpm --filter financial-engine exec vitest run src/seasonality.spec.ts`
Expected: PASS, 7 tests (2 dans `describe("SEASONALITY_PROFILES")` + 5 dans `describe("computeAnnualProjection")`).

- [ ] **Step 5: Ajouter `seasonality.ts` au barrel**

Modifier `packages/financial-engine/src/index.ts`, ajouter une ligne :

```typescript
export { computeAnnualProjection, SEASONALITY_PROFILES, type SeasonalityProfileKey, type MonthlyResult } from "./seasonality.js";
```

- [ ] **Step 6: Lancer toute la suite du package et rebuilder**

Run: `pnpm --filter financial-engine test && pnpm --filter financial-engine build`
Expected: PASS, 36 tests (29 précédents + 7 nouveaux) ; build sans erreur.

- [ ] **Step 7: Commit**

```bash
git add packages/financial-engine/src/seasonality.ts packages/financial-engine/src/seasonality.spec.ts packages/financial-engine/src/index.ts
git commit -m "feat: projection annuelle avec saisonnalite (4 profils predefinis)"
```

---

## Task 5: `FinancialEngineService.computeAnnualProjection` + décision consignée + vérification finale

**Files:**
- Modify: `apps/api/src/financial-engine/financial-engine.service.ts`
- Modify: `apps/api/src/financial-engine/financial-engine.service.spec.ts`
- Modify: `docs/DECISIONS.md`
- Modify: `tasks/TODO.md`
- Modify: `tasks/CHANGELOG.md`

**Interfaces:**
- Consumes: `computeAnnualProjection`, `SeasonalityProfileKey`, `MonthlyResult` (package, Task 4).
- Produces: `FinancialEngineService.computeAnnualProjection(hypotheses: Hypotheses, profile: SeasonalityProfileKey): MonthlyResult[]`, disponible pour la Phase 5b (frontend) et pour un futur consommateur backend si besoin (aucun n'existe encore dans ce plan).

- [ ] **Step 1: Écrire le test (RED)**

Ajouter à `apps/api/src/financial-engine/financial-engine.service.spec.ts`, dans le bloc `describe("FinancialEngineService", ...)`, après le test `"delegates computeBreakEven..."` :

```typescript
  it("delegates computeAnnualProjection to the financial-engine package", () => {
    const projection = service.computeAnnualProjection(hypotheses(), "stable");

    expect(projection).toHaveLength(12);
    expect(projection[0]?.result).toEqual({
      currency: "XOF",
      revenue: 250000,
      grossMargin: 150000,
      estimatedResult: 50000,
    });
  });
```

- [ ] **Step 2: Vérifier l'échec (RED)**

Run: `pnpm --filter api exec vitest run src/financial-engine/financial-engine.service.spec.ts`
Expected: FAIL, `service.computeAnnualProjection is not a function`.

- [ ] **Step 3: Implémenter la méthode**

Modifier `apps/api/src/financial-engine/financial-engine.service.ts` :

```typescript
import { Injectable } from "@nestjs/common";
import { computeResult, computeBreakEven, computeAnnualProjection } from "financial-engine";
import type {
  BreakEvenInput,
  BreakEvenResult,
  FinancialResult,
  Hypotheses,
  MonthlyResult,
  SeasonalityProfileKey,
} from "financial-engine";

@Injectable()
export class FinancialEngineService {
  computeResult(hypotheses: Hypotheses): FinancialResult {
    return computeResult(hypotheses);
  }

  computeBreakEven(input: BreakEvenInput): BreakEvenResult {
    return computeBreakEven(input);
  }

  computeAnnualProjection(hypotheses: Hypotheses, profile: SeasonalityProfileKey): MonthlyResult[] {
    return computeAnnualProjection(hypotheses, profile);
  }
}
```

- [ ] **Step 4: Vérifier le succès (GREEN)**

Run: `pnpm --filter api exec vitest run src/financial-engine/financial-engine.service.spec.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Consigner la décision dans `docs/DECISIONS.md`**

Ajouter à la fin de `docs/DECISIONS.md`, avant la ligne `*(À compléter au fil du projet...)*` :

```markdown
- **[2026-09-20] Extraction du moteur financier en package partagé du monorepo (`packages/financial-engine`).** Nécessaire pour que la Phase 5b (module "Et si ?"/scénarios) recalcule côté navigateur sans aller-retour réseau à chaque interaction (connexions parfois lentes en Afrique de l'Ouest, `design/UX_PRINCIPLES.md`). Le package est consommé via un build `tsc` standard (`tsc -p tsconfig.build.json`, même mécanisme que `apps/api`), pas de step de build exotique. `apps/api/src/financial-engine/financial-engine.service.ts` reste le seul point d'entrée NestJS, désormais un fin wrapper délégant au package.
- **[2026-09-20] Projection annuelle avec saisonnalité : 4 profils prédéfinis, pas de saisie manuelle mois par mois.** Un porteur de projet pas encore lancé n'a pas de vraies données mensuelles ; les profils (`stable`, `fetes_fin_annee`, `ete`, `rentree_scolaire`) sont des points de départ à calibrer avec des données réelles avant mise en production, même statut d'incertitude assumée que `SCENARIO_DELTAS` (Phase 2). La saisonnalité n'affecte que le volume (jamais prix/coûts), via le même mécanisme `applyDelta` que les scénarios existants — composable avec eux, pas exclusif.
```

- [ ] **Step 6: Lancer toute la suite, build, lint (package + api)**

Run: `pnpm --filter financial-engine test && pnpm --filter financial-engine build && pnpm --filter api test && pnpm --filter api build && pnpm --filter api lint`
Expected: tout passe, 0 échec, build et lint sans erreur.

- [ ] **Step 7: Mettre à jour `tasks/TODO.md` et `tasks/CHANGELOG.md`**

Dans `tasks/TODO.md`, remplacer la ligne `## Phase 5 — Scénarios` et celle qui suit par :

```markdown
## Phase 5 — Scénarios
- [x] Phase 5a — moteur : projection annuelle avec saisonnalité (`packages/financial-engine/src/seasonality.ts`), package partagé du monorepo (`packages/financial-engine`), consommé par `apps/api` via `financial-engine.service.ts`. Voir `docs/superpowers/specs/2026-09-20-phase-5a-moteur-saisonnalite-design.md` et `docs/DECISIONS.md`.
- [ ] Phase 5b — écrans "Et si ?"/"Scénarios", graphiques (Recharts), recalcul temps réel côté navigateur, simplification du vocabulaire (regroupe la dette UX notée en Phase 4).
```

Dans `tasks/CHANGELOG.md`, ajouter en haut du fichier (après le titre `# CHANGELOG.md`) :

```markdown
## [Non versionné], Phase 5a : moteur financier partagé + projection annuelle
- Extraction du moteur financier (`financial-engine.types.ts`, `financial-engine.errors.ts`, `financial-engine.validation.ts`, `scenarios.ts`) en package partagé du monorepo (`packages/financial-engine`), consommé par `apps/api` via un build `tsc` standard. `computeResult`/`computeBreakEven` (auparavant méthodes NestJS uniquement) sont désormais des fonctions pures du package (`financial-engine.calculations.ts`), `FinancialEngineService` en reste le seul point d'entrée NestJS, désormais un fin wrapper.
- Nouveau : `computeAnnualProjection(hypotheses, profile)` (`packages/financial-engine/src/seasonality.ts`) — projection sur 12 mois avec 4 profils de saisonnalité prédéfinis (`stable`, `fetes_fin_annee`, `ete`, `rentree_scolaire`), même mécanique que les scénarios existants (`applyDelta` sur le volume, pourcentages sommant à zéro), composable avec les scénarios prudent/réaliste/ambitieux/crise. Aucune UI, aucune persistance, aucun nouvel endpoint HTTP — module backend pur, prêt pour la Phase 5b.
- 36 tests dans `packages/financial-engine` (20 déplacés inchangés + 9 sur les fonctions de calcul extraites + 7 sur la saisonnalité), suite `apps/api` simplifiée en conséquence (logique métier non dupliquée entre les deux couches).
```

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/financial-engine/financial-engine.service.ts apps/api/src/financial-engine/financial-engine.service.spec.ts docs/DECISIONS.md tasks/TODO.md tasks/CHANGELOG.md
git commit -m "feat(api): FinancialEngineService.computeAnnualProjection, cloture Phase 5a"
```

---

## Après ce plan

- Prochaine étape naturelle : Phase 5b (écrans "Et si ?"/"Scénarios", Recharts, recalcul temps réel côté navigateur consommant directement le package `financial-engine`, simplification du vocabulaire) — nouveau brainstorm dédié, spec et plan séparés.
- Les coefficients exacts de `SEASONALITY_PROFILES` (`fetes_fin_annee`, `ete`, `rentree_scolaire`) sont des points de départ non validés par un expert métier, à signaler explicitement si un humain avec une connaissance fine du marché visé souhaite les ajuster avant la mise en production.
