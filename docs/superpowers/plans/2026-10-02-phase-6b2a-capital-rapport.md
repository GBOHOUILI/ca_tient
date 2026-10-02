# Phase 6b-2a — Capital et rapport complet — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Après paiement, l'utilisateur saisit ses dépenses de départ et son capital disponible, puis consulte un rapport complet servi par l'API, imprimable depuis le navigateur.

**Architecture:** Trois fonctions pures dans `packages/financial-engine` (capital, sensibilité, points à surveiller). Côté API, un `ReportService` dans `IdeasModule` assemble le rapport à partir du moteur, des blocs du canvas et d'une synthèse IA encadrée (chaîne `FallbackAiProvider` existante, rejet de tout chiffre, repli sur un texte modèle). Deux routes protégées par le jeton et par un nouveau `PaidIdeaGuard`. Côté web, deux écrans ajoutés au parcours `/analyse/[id]` : `StepCapital` puis `ReportView`.

**Tech Stack:** TypeScript, vitest, NestJS 12, Prisma 7 (PostgreSQL), class-validator, Next.js 16 / React 19, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-10-02-phase-6b2a-capital-rapport-design.md`

## Global Constraints

- Tout chiffre affiché vient du moteur déterministe ; l'IA ne produit jamais un chiffre (`CLAUDE.md` #3).
- Montants : entiers dans la plus petite unité de la devise, aucune arithmétique flottante sur les montants.
- Réserve de trésorerie : `CASH_RESERVE_MONTHS = 3` × charges fixes mensuelles.
- Sensibilité : `SENSITIVITY_PERCENT = 10`.
- Marge faible : `THIN_MARGIN_PERCENT = 20` (marge brute < 20 % du CA).
- Montants du capital : `@IsInt() @Min(0) @Max(2_147_483_647)`.
- Synthèse IA rejetée si vide, > 1 200 caractères ou si elle contient un chiffre (`/\d/`).
- Aucune dépendance ajoutée. Uniquement les tokens et classes existants de `design/` / `globals.css`.
- Routes : `IdeaAccessGuard` (401 sans jeton, 404 mauvais jeton) puis `PaidIdeaGuard` (403 si non payée).
- Serveurs de vérification sur 3011 (API) / 3012 (web), arrêt par PID ; ne jamais lire `apps/api/.env`.

## Review Focus

1. Idée payée sans aucun bloc de canvas (parcours 6a sauté, idée créée par l'API) : le rapport doit s'afficher avec des blocs vides, pas planter.
2. Charges fixes à 0 et rien de saisi au capital : réserve 0, besoin 0, aucun point `financing_gap`.
3. Prix = coût variable (marge unitaire nulle) : sensibilité calculable, seuil « non atteignable », un seul point `non_positive_unit_margin` (pas aussi `thin_gross_margin`).
4. Hypothèses modifiées après une synthèse IA stockée : la synthèse doit être régénérée (empreinte différente), jamais servie périmée.
5. Rechargement de `/analyse/[id]` après saisie du capital : ouvre directement le rapport avec le capital pré-rempli dans « Modifier mon capital ».

Tests correspondants : (1) Task 7 « report without canvas blocks », (2) Task 1 « zero fixed costs » + Task 3 « no financing gap when covered », (3) Task 2 « zero unit margin » + Task 3 « zero unit margin only », (4) Task 7 « regenerates summary when facts change », (5) Task 8 vérification navigateur.

---

### Task 1: `computeCapitalNeed` (moteur)

**Files:**
- Create: `packages/financial-engine/src/capital.ts`
- Create: `packages/financial-engine/src/capital.spec.ts`
- Modify: `packages/financial-engine/src/financial-engine.validation.ts` (exporter `assertSafeNonNegativeInteger`)
- Modify: `packages/financial-engine/src/index.ts`

**Interfaces:**
- Produces:
  ```ts
  export const CASH_RESERVE_MONTHS = 3;
  export interface CapitalPlanInput { equipment: number; initialStock: number; openingCosts: number; other: number; availableCapital: number }
  export interface CapitalNeed { currency: CurrencyCode; startupCosts: number; cashReserve: number; capitalNeeded: number; availableCapital: number; financingGap: number; surplus: number }
  export function computeCapitalNeed(hypotheses: Hypotheses, capital: CapitalPlanInput): CapitalNeed
  ```

- [ ] **Step 1: Write the failing test** — `capital.spec.ts`

```ts
import { computeCapitalNeed, CASH_RESERVE_MONTHS, type CapitalPlanInput } from "./capital.js";
import { FinancialEngineInputError } from "./financial-engine.errors.js";
import type { Hypotheses } from "./financial-engine.types.js";

function hypotheses(overrides: Partial<Hypotheses> = {}): Hypotheses {
  return { currency: "XOF", price: 5000, variableCostPerUnit: 2000, fixedCosts: 100000, volume: 50, ...overrides };
}

function capital(overrides: Partial<CapitalPlanInput> = {}): CapitalPlanInput {
  return { equipment: 200000, initialStock: 150000, openingCosts: 50000, other: 0, availableCapital: 500000, ...overrides };
}

describe("computeCapitalNeed", () => {
  it("adds startup costs and a reserve of 3 months of fixed costs", () => {
    expect(CASH_RESERVE_MONTHS).toBe(3);
    expect(computeCapitalNeed(hypotheses(), capital())).toEqual({
      currency: "XOF",
      startupCosts: 400000,
      cashReserve: 300000,
      capitalNeeded: 700000,
      availableCapital: 500000,
      financingGap: 200000,
      surplus: 0,
    });
  });

  it("reports a surplus when the available capital exceeds the need", () => {
    const need = computeCapitalNeed(hypotheses(), capital({ availableCapital: 900000 }));
    expect(need.financingGap).toBe(0);
    expect(need.surplus).toBe(200000);
  });

  it("has neither gap nor surplus when capital matches the need exactly", () => {
    const need = computeCapitalNeed(hypotheses(), capital({ availableCapital: 700000 }));
    expect(need.financingGap).toBe(0);
    expect(need.surplus).toBe(0);
  });

  it("zero fixed costs and nothing entered gives a zero need", () => {
    const need = computeCapitalNeed(
      hypotheses({ fixedCosts: 0 }),
      { equipment: 0, initialStock: 0, openingCosts: 0, other: 0, availableCapital: 0 },
    );
    expect(need).toMatchObject({ startupCosts: 0, cashReserve: 0, capitalNeeded: 0, financingGap: 0, surplus: 0 });
  });

  it("rejects negative or non-integer amounts", () => {
    expect(() => computeCapitalNeed(hypotheses(), capital({ equipment: -1 }))).toThrow(FinancialEngineInputError);
    expect(() => computeCapitalNeed(hypotheses(), capital({ availableCapital: 1.5 }))).toThrow(FinancialEngineInputError);
  });

  it("rejects totals beyond the safe integer limit", () => {
    const huge = Number.MAX_SAFE_INTEGER;
    expect(() => computeCapitalNeed(hypotheses(), capital({ equipment: huge, initialStock: huge }))).toThrow(
      FinancialEngineInputError,
    );
  });

  it("validates the hypotheses too", () => {
    expect(() => computeCapitalNeed(hypotheses({ price: 0 }), capital())).toThrow(FinancialEngineInputError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter financial-engine test -- capital`
Expected: FAIL (module `./capital.js` introuvable).

- [ ] **Step 3: Write minimal implementation**

In `financial-engine.validation.ts`, change `function assertSafeNonNegativeInteger` to `export function assertSafeNonNegativeInteger` (not re-exported from `index.ts`).

`capital.ts`:
```ts
import { assertSafeNonNegativeInteger, assertValidHypotheses } from "./financial-engine.validation.js";
import type { CurrencyCode, Hypotheses } from "./financial-engine.types.js";

// Forfait de trésorerie : le moteur n'a pas de montée en charge mois par mois, un cumul
// des pertes jusqu'au point mort vaudrait 0 dès que le mois type est rentable.
export const CASH_RESERVE_MONTHS = 3;

export interface CapitalPlanInput {
  equipment: number;
  initialStock: number;
  openingCosts: number;
  other: number;
  availableCapital: number;
}

export interface CapitalNeed {
  currency: CurrencyCode;
  startupCosts: number;
  cashReserve: number;
  capitalNeeded: number;
  availableCapital: number;
  financingGap: number;
  surplus: number;
}

export function computeCapitalNeed(hypotheses: Hypotheses, capital: CapitalPlanInput): CapitalNeed {
  assertValidHypotheses(hypotheses);
  for (const field of ["equipment", "initialStock", "openingCosts", "other", "availableCapital"] as const) {
    assertSafeNonNegativeInteger(capital[field], field);
  }

  const startupCosts = capital.equipment + capital.initialStock + capital.openingCosts + capital.other;
  const cashReserve = CASH_RESERVE_MONTHS * hypotheses.fixedCosts;
  const capitalNeeded = startupCosts + cashReserve;
  assertSafeNonNegativeInteger(capitalNeeded, "capitalNeeded");

  return {
    currency: hypotheses.currency,
    startupCosts,
    cashReserve,
    capitalNeeded,
    availableCapital: capital.availableCapital,
    financingGap: Math.max(0, capitalNeeded - capital.availableCapital),
    surplus: Math.max(0, capital.availableCapital - capitalNeeded),
  };
}
```

`index.ts`: add `export { computeCapitalNeed, CASH_RESERVE_MONTHS, type CapitalPlanInput, type CapitalNeed } from "./capital.js";`

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter financial-engine test`
Expected: PASS (suite complète).

- [ ] **Step 5: Commit**

```bash
git add packages/financial-engine/src
git commit -m "feat(engine): capital necessaire et besoin de financement (Phase 6b-2a)"
```

### Task 2: `computeSensitivity` (moteur)

**Files:**
- Create: `packages/financial-engine/src/sensitivity.ts`, `packages/financial-engine/src/sensitivity.spec.ts`
- Modify: `packages/financial-engine/src/index.ts`

**Interfaces:**
- Consumes: `computeResult`, `applyDelta`.
- Produces:
  ```ts
  export const SENSITIVITY_PERCENT = 10;
  export type SensitivityKey = "price" | "volume" | "variableCostPerUnit" | "fixedCosts";
  export interface SensitivityEntry { key: SensitivityKey; resultIfUp: number; resultIfDown: number; impact: number }
  export function computeSensitivity(hypotheses: Hypotheses): SensitivityEntry[]
  ```

- [ ] **Step 1: Write the failing test** — `sensitivity.spec.ts`

```ts
import { computeSensitivity, SENSITIVITY_PERCENT } from "./sensitivity.js";
import type { Hypotheses } from "./financial-engine.types.js";

function hypotheses(overrides: Partial<Hypotheses> = {}): Hypotheses {
  return { currency: "XOF", price: 5000, variableCostPerUnit: 2000, fixedCosts: 100000, volume: 50, ...overrides };
}

describe("computeSensitivity", () => {
  it("measures +/-10 % on each hypothesis and sorts by impact", () => {
    expect(SENSITIVITY_PERCENT).toBe(10);
    // base result = 250000 - 100000 - 100000 = 50000
    expect(computeSensitivity(hypotheses())).toEqual([
      { key: "price", resultIfUp: 75000, resultIfDown: 25000, impact: 25000 },
      { key: "volume", resultIfUp: 65000, resultIfDown: 35000, impact: 15000 },
      { key: "variableCostPerUnit", resultIfUp: 40000, resultIfDown: 60000, impact: 10000 },
      { key: "fixedCosts", resultIfUp: 40000, resultIfDown: 60000, impact: 10000 },
    ]);
  });

  it("keeps the fixed key order on equal impacts", () => {
    const keys = computeSensitivity(hypotheses()).map((entry) => entry.key);
    expect(keys.indexOf("variableCostPerUnit")).toBeLessThan(keys.indexOf("fixedCosts"));
  });

  it("gives an impact of 0 to a hypothesis at 0 and keeps it in the list", () => {
    const entries = computeSensitivity(hypotheses({ fixedCosts: 0 }));
    expect(entries).toHaveLength(4);
    expect(entries.find((entry) => entry.key === "fixedCosts")?.impact).toBe(0);
  });

  it("works with a zero unit margin", () => {
    const entries = computeSensitivity(hypotheses({ price: 2000 }));
    expect(entries).toHaveLength(4);
    expect(entries[0].impact).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter financial-engine test -- sensitivity`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Write minimal implementation** — `sensitivity.ts`

```ts
import { computeResult } from "./financial-engine.calculations.js";
import { applyDelta } from "./scenarios.js";
import type { Hypotheses } from "./financial-engine.types.js";

export const SENSITIVITY_PERCENT = 10;

export type SensitivityKey = "price" | "volume" | "variableCostPerUnit" | "fixedCosts";

export interface SensitivityEntry {
  key: SensitivityKey;
  resultIfUp: number;
  resultIfDown: number;
  impact: number;
}

const KEYS: readonly SensitivityKey[] = ["price", "volume", "variableCostPerUnit", "fixedCosts"];

export function computeSensitivity(hypotheses: Hypotheses): SensitivityEntry[] {
  const base = computeResult(hypotheses).estimatedResult;

  const entries = KEYS.map((key) => {
    const resultIfUp = computeResult(applyDelta(hypotheses, { [key]: SENSITIVITY_PERCENT })).estimatedResult;
    const resultIfDown = computeResult(applyDelta(hypotheses, { [key]: -SENSITIVITY_PERCENT })).estimatedResult;
    const impact = Math.max(Math.abs(resultIfUp - base), Math.abs(resultIfDown - base));
    return { key, resultIfUp, resultIfDown, impact };
  });

  // Array.prototype.sort is stable: equal impacts keep the KEYS order.
  return entries.sort((a, b) => b.impact - a.impact);
}
```

`index.ts`: add `export { computeSensitivity, SENSITIVITY_PERCENT, type SensitivityKey, type SensitivityEntry } from "./sensitivity.js";`

- [ ] **Step 4: Run tests** — `pnpm --filter financial-engine test` → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(engine): variables sensibles a +/-10 % (Phase 6b-2a)"`

### Task 3: `computeWatchPoints` (moteur) + doc moteur

**Files:**
- Create: `packages/financial-engine/src/watch-points.ts`, `packages/financial-engine/src/watch-points.spec.ts`
- Modify: `packages/financial-engine/src/index.ts`, `docs/FINANCIAL_ENGINE.md`

**Interfaces:**
- Consumes: `computeResult`, `computeBreakEven`, `applyScenario`, `CapitalNeed`.
- Produces:
  ```ts
  export const THIN_MARGIN_PERCENT = 20;
  export type WatchPointCode = "non_positive_unit_margin" | "below_break_even" | "thin_gross_margin" | "prudent_scenario_loss" | "financing_gap" | "no_cash_reserve";
  export function computeWatchPoints(hypotheses: Hypotheses, capitalNeed: CapitalNeed | null): WatchPointCode[]
  ```

- [ ] **Step 1: Write the failing test** — `watch-points.spec.ts`

```ts
import { computeWatchPoints, THIN_MARGIN_PERCENT } from "./watch-points.js";
import { computeCapitalNeed } from "./capital.js";
import type { Hypotheses } from "./financial-engine.types.js";

function hypotheses(overrides: Partial<Hypotheses> = {}): Hypotheses {
  return { currency: "XOF", price: 5000, variableCostPerUnit: 2000, fixedCosts: 100000, volume: 50, ...overrides };
}

describe("computeWatchPoints", () => {
  it("returns nothing for a healthy idea without capital", () => {
    expect(THIN_MARGIN_PERCENT).toBe(20);
    expect(computeWatchPoints(hypotheses({ volume: 100 }), null)).toEqual([]);
  });

  it("zero unit margin only flags non_positive_unit_margin", () => {
    expect(computeWatchPoints(hypotheses({ price: 2000 }), null)).toEqual(["non_positive_unit_margin"]);
  });

  it("flags a volume below the break-even point", () => {
    // break-even = ceil(100000 / 3000) = 34
    expect(computeWatchPoints(hypotheses({ volume: 33 }), null)).toContain("below_break_even");
    expect(computeWatchPoints(hypotheses({ volume: 34 }), null)).not.toContain("below_break_even");
  });

  it("flags a gross margin under 20 % of revenue, not at exactly 20 %", () => {
    expect(computeWatchPoints(hypotheses({ price: 1000, variableCostPerUnit: 801, fixedCosts: 0 }), null)).toContain(
      "thin_gross_margin",
    );
    expect(computeWatchPoints(hypotheses({ price: 1000, variableCostPerUnit: 800, fixedCosts: 0 }), null)).not.toContain(
      "thin_gross_margin",
    );
  });

  it("flags a profitable idea whose prudent scenario loses money", () => {
    // base 50000 >= 0 ; prudent: volume 40, cv 2200, fixed 110000 -> 40*2800 - 110000 = 2000 >= 0
    expect(computeWatchPoints(hypotheses(), null)).not.toContain("prudent_scenario_loss");
    // volume 36: base 8000 ; prudent volume 29 -> 29*2800 - 110000 = -28800
    expect(computeWatchPoints(hypotheses({ volume: 36 }), null)).toContain("prudent_scenario_loss");
  });

  it("does not flag the prudent scenario when the base already loses money", () => {
    expect(computeWatchPoints(hypotheses({ volume: 10 }), null)).not.toContain("prudent_scenario_loss");
  });

  it("flags a financing gap and a missing cash reserve from the capital need", () => {
    const h = hypotheses({ volume: 100 });
    const short = computeCapitalNeed(h, { equipment: 400000, initialStock: 0, openingCosts: 0, other: 0, availableCapital: 300000 });
    expect(computeWatchPoints(h, short)).toEqual(["financing_gap", "no_cash_reserve"]);

    const reserveOnly = computeCapitalNeed(h, { equipment: 400000, initialStock: 0, openingCosts: 0, other: 0, availableCapital: 500000 });
    expect(computeWatchPoints(h, reserveOnly)).toEqual(["financing_gap"]);
  });

  it("no financing gap when covered", () => {
    const h = hypotheses({ volume: 100 });
    const covered = computeCapitalNeed(h, { equipment: 0, initialStock: 0, openingCosts: 0, other: 0, availableCapital: 300000 });
    expect(computeWatchPoints(h, covered)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run** — `pnpm --filter financial-engine test -- watch-points` → FAIL.

- [ ] **Step 3: Implement** — `watch-points.ts`

```ts
import { computeBreakEven, computeResult } from "./financial-engine.calculations.js";
import { applyScenario } from "./scenarios.js";
import type { CapitalNeed } from "./capital.js";
import type { Hypotheses } from "./financial-engine.types.js";

export const THIN_MARGIN_PERCENT = 20;

export type WatchPointCode =
  | "non_positive_unit_margin"
  | "below_break_even"
  | "thin_gross_margin"
  | "prudent_scenario_loss"
  | "financing_gap"
  | "no_cash_reserve";

export function computeWatchPoints(hypotheses: Hypotheses, capitalNeed: CapitalNeed | null): WatchPointCode[] {
  const codes: WatchPointCode[] = [];
  const result = computeResult(hypotheses);
  const breakEven = computeBreakEven(hypotheses);

  if (!breakEven.reachable) {
    codes.push("non_positive_unit_margin");
  } else {
    if (hypotheses.volume < breakEven.volumeUnits) codes.push("below_break_even");
    // Integer comparison (no float): grossMargin / revenue < 20 %.
    if (result.revenue > 0 && result.grossMargin * 100 < result.revenue * THIN_MARGIN_PERCENT) {
      codes.push("thin_gross_margin");
    }
  }

  if (result.estimatedResult >= 0 && computeResult(applyScenario(hypotheses, "prudent")).estimatedResult < 0) {
    codes.push("prudent_scenario_loss");
  }

  if (capitalNeed) {
    if (capitalNeed.financingGap > 0) codes.push("financing_gap");
    if (capitalNeed.availableCapital < capitalNeed.startupCosts) codes.push("no_cash_reserve");
  }

  return codes;
}
```

`index.ts`: add `export { computeWatchPoints, THIN_MARGIN_PERCENT, type WatchPointCode } from "./watch-points.js";`

- [ ] **Step 4: Run** — `pnpm --filter financial-engine test && pnpm --filter financial-engine build` → PASS.

- [ ] **Step 5: Doc** — add a section « Capital, sensibilité, points à surveiller (Phase 6b-2a) » to `docs/FINANCIAL_ENGINE.md` listing the formulas and the three constants (3 mois, 10 %, 20 %) and the 6 codes with their rule (copy of the spec table).

- [ ] **Step 6: Commit** — `git commit -m "feat(engine): points a surveiller deterministes (Phase 6b-2a)"`

### Task 4: Schéma Prisma `CapitalPlan` / `ReportSummary`

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_add_capital_plan_and_report_summary/migration.sql` (généré)

- [ ] **Step 1:** Ajouter à `model Idea` : `capitalPlan CapitalPlan?` et `reportSummary ReportSummary?`, puis les deux modèles :

```prisma
model CapitalPlan {
  id               String   @id @default(cuid())
  ideaId           String   @unique
  idea             Idea     @relation(fields: [ideaId], references: [id], onDelete: Cascade)
  equipment        Int
  initialStock     Int
  openingCosts     Int
  other            Int
  availableCapital Int
  updatedAt        DateTime @updatedAt
}

model ReportSummary {
  id        String   @id @default(cuid())
  ideaId    String   @unique
  idea      Idea     @relation(fields: [ideaId], references: [id], onDelete: Cascade)
  text      String
  factsHash String
  createdAt DateTime @default(now())
}
```

- [ ] **Step 2:** `cd apps/api && pnpm exec prisma migrate dev --name add_capital_plan_and_report_summary` (base de dev, migration additive) puis `pnpm db:test:migrate`.
Expected: migration créée et appliquée, client régénéré.

- [ ] **Step 3: Commit** — `git commit -m "feat(api): modeles CapitalPlan et ReportSummary (Phase 6b-2a)"`

### Task 5: Synthèse IA (`writeReportSummary`)

**Files:**
- Modify: `apps/api/src/ai/ai-provider.port.ts`, `apps/api/src/ai/ai-prompts.ts`, `apps/api/src/ai/fallback-ai.provider.ts`, `apps/api/src/ai/ai.controller.spec.ts` (fakes)
- Test: `apps/api/src/ai/ai-prompts.spec.ts`, `apps/api/src/ai/fallback-ai.provider.spec.ts`

**Interfaces:**
- Produces (dans `ai-provider.port.ts`) :
  ```ts
  export interface ReportSummaryFacts {
    businessModel: BusinessModel;
    holds: boolean;                         // estimatedResult >= 0
    breakEvenReachable: boolean;
    watchPoints: readonly string[];         // WatchPointCode
    mostSensitive: readonly string[];       // 2 premières SensitivityKey
    financing: "gap" | "covered" | "unknown";
    valueProposition: string | null;
    customerSegments: string | null;
  }
  // AiProvider gains:
  writeReportSummary(facts: ReportSummaryFacts): Promise<string | null>;
  ```
- Produces (dans `ai-prompts.ts`) : `REPORT_SUMMARY_JSON_SCHEMA`, `buildReportSummaryPrompt(facts)`, `parseReportSummary(text): string | null`, `MAX_SUMMARY_LENGTH = 1200`.

- [ ] **Step 1: Failing tests** — append to `ai-prompts.spec.ts`:

```ts
describe("parseReportSummary", () => {
  it("accepts a plain summary and trims it", () => {
    expect(parseReportSummary('{"summary": "  Ton idee tient sur le papier.  "}')).toBe("Ton idee tient sur le papier.");
  });

  it("rejects a summary containing a digit", () => {
    expect(parseReportSummary('{"summary": "Tu gagnes 50 000 FCFA par mois."}')).toBeNull();
  });

  it("rejects empty, too long or malformed answers", () => {
    expect(parseReportSummary('{"summary": "   "}')).toBeNull();
    expect(parseReportSummary(JSON.stringify({ summary: "a".repeat(1201) }))).toBeNull();
    expect(parseReportSummary("pas du json")).toBeNull();
  });
});

describe("buildReportSummaryPrompt", () => {
  it("passes qualitative facts only and forbids numbers", () => {
    const prompt = buildReportSummaryPrompt({
      businessModel: "SERVICE",
      holds: false,
      breakEvenReachable: true,
      watchPoints: ["below_break_even", "financing_gap"],
      mostSensitive: ["price", "volume"],
      financing: "gap",
      valueProposition: "Cours a domicile",
      customerSegments: "Parents d'eleves",
    });
    expect(prompt).toContain("ne couvre pas encore ses couts");
    expect(prompt).toContain("aucun chiffre");
    expect(prompt).toContain("Cours a domicile");
  });
});
```

Append to `fallback-ai.provider.spec.ts` a test following the file's existing fake-backend pattern: a backend whose `generateJson` returns `'{"summary": "Tu gagnes 50 000 FCFA."}'` then a second backend returning `'{"summary": "Ton idee tient."}'` → `writeReportSummary(facts)` resolves to `"Ton idee tient."` (invalid answer moves to the next backend).

- [ ] **Step 2: Run** — `pnpm --filter api exec vitest run src/ai` → FAIL.

- [ ] **Step 3: Implement**

`ai-provider.port.ts`: add `ReportSummaryFacts` and the method on `AiProvider` (as above).

`ai-prompts.ts`:
```ts
export const MAX_SUMMARY_LENGTH = 1200;

export const REPORT_SUMMARY_JSON_SCHEMA: JsonSchema = {
  properties: { summary: "string" },
  required: ["summary"],
};

const WATCH_POINT_FACTS: Record<string, string> = {
  non_positive_unit_margin: "chaque vente coute autant ou plus qu'elle ne rapporte",
  below_break_even: "le volume de ventes prevu est sous le seuil de rentabilite",
  thin_gross_margin: "la marge sur chaque vente est faible",
  prudent_scenario_loss: "dans un scenario prudent, l'idee perdrait de l'argent",
  financing_gap: "le capital disponible ne couvre pas le lancement et la reserve de securite",
  no_cash_reserve: "le capital disponible ne couvre meme pas les depenses de depart",
};

const SENSITIVITY_FACTS: Record<string, string> = {
  price: "le prix de vente",
  volume: "le volume de ventes",
  variableCostPerUnit: "le cout de chaque unite",
  fixedCosts: "les charges fixes",
};

const FINANCING_FACTS: Record<ReportSummaryFacts["financing"], string> = {
  gap: "il manque du capital pour se lancer",
  covered: "le capital disponible couvre le lancement et une reserve de securite",
  unknown: "le capital n'a pas encore ete renseigne",
};

export function buildReportSummaryPrompt(facts: ReportSummaryFacts): string {
  const points = facts.watchPoints.map((code) => WATCH_POINT_FACTS[code]).filter(Boolean);
  return [
    "Tu rediges la synthese d'un rapport qui teste la viabilite d'une idee de business, pour un entrepreneur sans bagage financier.",
    `Modele de business : ${BUSINESS_MODEL_LABELS[facts.businessModel]}.`,
    facts.valueProposition ? `Proposition de valeur : "${facts.valueProposition}"` : "",
    facts.customerSegments ? `Clients vises : "${facts.customerSegments}"` : "",
    `Verdict du calcul : ${facts.holds ? "l'idee degage un resultat positif chaque mois" : "l'idee ne couvre pas encore ses couts chaque mois"}.`,
    `Seuil de rentabilite : ${facts.breakEvenReachable ? "atteignable" : "inatteignable tant que le prix ne depasse pas le cout de chaque unite"}.`,
    points.length > 0 ? `Points a surveiller : ${points.join(" ; ")}.` : "Aucun point d'alerte particulier.",
    `Variables qui pesent le plus sur le resultat : ${facts.mostSensitive.map((key) => SENSITIVITY_FACTS[key]).join(", ")}.`,
    `Capital : ${FINANCING_FACTS[facts.financing]}.`,
    "Ecris 3 a 5 phrases simples, en tutoyant, sans jargon. N'ecris aucun chiffre ni montant ni pourcentage. Ne promets jamais la rentabilite : c'est une aide a la decision.",
    `Reponds uniquement avec un objet JSON de la forme ${jsonShape(REPORT_SUMMARY_JSON_SCHEMA)}.`,
  ]
    .filter((line) => line.length > 0)
    .join("\n");
}

// Rule CLAUDE.md #3: no figure may come from the AI, so any digit rejects the answer.
export function parseReportSummary(text: string | undefined): string | null {
  const record = parseJsonObject(text);
  const summary = record?.summary;
  if (typeof summary !== "string") return null;
  const trimmed = summary.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_SUMMARY_LENGTH || /\d/.test(trimmed)) return null;
  return trimmed;
}
```
(import `ReportSummaryFacts` from `./ai-provider.port.js`.)

`fallback-ai.provider.ts`: add
```ts
  writeReportSummary(facts: ReportSummaryFacts): Promise<string | null> {
    return this.run({
      label: "synthese",
      prompt: buildReportSummaryPrompt(facts),
      schema: REPORT_SUMMARY_JSON_SCHEMA,
      parse: parseReportSummary,
    });
  }
```

`ai.controller.spec.ts`: add `writeReportSummary: vi.fn()` to the three fake `AiProvider` objects.

- [ ] **Step 4: Run** — `pnpm --filter api exec vitest run src/ai` → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(api): synthese IA du rapport, sans aucun chiffre (Phase 6b-2a)"`

### Task 6: Faits, empreinte et synthèse modèle (pur)

**Files:**
- Create: `apps/api/src/ideas/report-summary.ts`, `apps/api/src/ideas/report-summary.spec.ts`

**Interfaces:**
- Consumes: `ReportSummaryFacts` (Task 5), `WatchPointCode`, `SensitivityEntry`, `CapitalNeed`.
- Produces:
  ```ts
  export function buildReportFacts(input: { businessModel: BusinessModel; estimatedResult: number; breakEvenReachable: boolean; watchPoints: WatchPointCode[]; sensitivity: SensitivityEntry[]; capitalNeed: CapitalNeed | null; valueProposition: string | null; customerSegments: string | null }): ReportSummaryFacts
  export function factsHash(facts: ReportSummaryFacts): string   // sha256 hex
  export function templateSummary(facts: ReportSummaryFacts): string
  ```

- [ ] **Step 1: Failing test** — `report-summary.spec.ts`

```ts
import { describe, expect, it } from "vitest";
import { buildReportFacts, factsHash, templateSummary } from "./report-summary.js";

const baseInput = {
  businessModel: "SERVICE" as const,
  estimatedResult: 50000,
  breakEvenReachable: true,
  watchPoints: [] as never[],
  sensitivity: [
    { key: "price" as const, resultIfUp: 0, resultIfDown: 0, impact: 3 },
    { key: "volume" as const, resultIfUp: 0, resultIfDown: 0, impact: 2 },
    { key: "fixedCosts" as const, resultIfUp: 0, resultIfDown: 0, impact: 1 },
  ],
  capitalNeed: null,
  valueProposition: "Cours a domicile",
  customerSegments: null,
};

describe("buildReportFacts", () => {
  it("keeps only qualitative facts", () => {
    expect(buildReportFacts(baseInput)).toEqual({
      businessModel: "SERVICE",
      holds: true,
      breakEvenReachable: true,
      watchPoints: [],
      mostSensitive: ["price", "volume"],
      financing: "unknown",
      valueProposition: "Cours a domicile",
      customerSegments: null,
    });
  });

  it("derives the financing status from the capital need", () => {
    const need = { currency: "XOF" as const, startupCosts: 0, cashReserve: 0, capitalNeeded: 10, availableCapital: 5, financingGap: 5, surplus: 0 };
    expect(buildReportFacts({ ...baseInput, capitalNeed: need }).financing).toBe("gap");
    expect(buildReportFacts({ ...baseInput, capitalNeed: { ...need, financingGap: 0 } }).financing).toBe("covered");
  });
});

describe("factsHash", () => {
  it("is stable for equal facts and changes when a fact changes", () => {
    const facts = buildReportFacts(baseInput);
    expect(factsHash(facts)).toBe(factsHash(buildReportFacts(baseInput)));
    expect(factsHash(facts)).not.toBe(factsHash(buildReportFacts({ ...baseInput, estimatedResult: -1 })));
  });
});

describe("templateSummary", () => {
  it("contains no digit and always reminds it is not a guarantee", () => {
    for (const estimatedResult of [50000, -1]) {
      const text = templateSummary(buildReportFacts({ ...baseInput, estimatedResult, watchPoints: ["financing_gap"] }));
      expect(text).not.toMatch(/\d/);
      expect(text).toContain("pas une garantie");
    }
  });
});
```

- [ ] **Step 2: Run** — `pnpm --filter api exec vitest run src/ideas/report-summary.spec.ts` → FAIL.

- [ ] **Step 3: Implement** — `report-summary.ts`

```ts
import { createHash } from "node:crypto";
import type { BusinessModel } from "@prisma/client";
import type { CapitalNeed, SensitivityEntry, WatchPointCode } from "financial-engine";
import type { ReportSummaryFacts } from "../ai/ai-provider.port.js";

const SENSITIVITY_LABELS: Record<string, string> = {
  price: "ton prix de vente",
  volume: "ton volume de ventes",
  variableCostPerUnit: "ce que te coute chaque unite",
  fixedCosts: "tes charges fixes",
};

export function buildReportFacts(input: {
  businessModel: BusinessModel;
  estimatedResult: number;
  breakEvenReachable: boolean;
  watchPoints: WatchPointCode[];
  sensitivity: SensitivityEntry[];
  capitalNeed: CapitalNeed | null;
  valueProposition: string | null;
  customerSegments: string | null;
}): ReportSummaryFacts {
  // Built in a fixed key order: factsHash relies on JSON.stringify being stable.
  return {
    businessModel: input.businessModel,
    holds: input.estimatedResult >= 0,
    breakEvenReachable: input.breakEvenReachable,
    watchPoints: [...input.watchPoints],
    mostSensitive: input.sensitivity.slice(0, 2).map((entry) => entry.key),
    financing: input.capitalNeed === null ? "unknown" : input.capitalNeed.financingGap > 0 ? "gap" : "covered",
    valueProposition: input.valueProposition,
    customerSegments: input.customerSegments,
  };
}

export function factsHash(facts: ReportSummaryFacts): string {
  return createHash("sha256").update(JSON.stringify(facts)).digest("hex");
}

export function templateSummary(facts: ReportSummaryFacts): string {
  const sentences = [
    facts.holds
      ? "Avec tes hypotheses, ton idee degage un resultat positif chaque mois : elle tient sur le papier."
      : "Avec tes hypotheses, ton idee ne couvre pas encore ses couts chaque mois : elle ne tient pas encore.",
  ];
  if (facts.mostSensitive.length > 0) {
    sentences.push(
      `Ce qui pese le plus sur ton resultat, c'est ${SENSITIVITY_LABELS[facts.mostSensitive[0]]} : c'est la premiere chose a verifier sur le terrain.`,
    );
  }
  if (facts.financing === "gap") {
    sentences.push("Ton capital actuel ne suffit pas encore pour te lancer avec une reserve de securite.");
  } else if (facts.financing === "covered") {
    sentences.push("Ton capital couvre le lancement et une reserve de securite.");
  }
  sentences.push("Ce rapport est une aide a la decision, pas une garantie de rentabilite.");
  return sentences.join(" ");
}
```

- [ ] **Step 4: Run** → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(api): faits, empreinte et synthese modele du rapport (Phase 6b-2a)"`

### Task 7: Routes capital et rapport

**Files:**
- Create: `apps/api/src/ideas/paid-idea.guard.ts`, `apps/api/src/ideas/dto/capital-plan.dto.ts`, `apps/api/src/ideas/report.service.ts`, `apps/api/src/ideas/report.http.spec.ts`
- Modify: `apps/api/src/ideas/ideas.controller.ts`, `apps/api/src/ideas/ideas.module.ts`

**Interfaces:**
- Consumes: Tasks 1–6, `AI_PROVIDER` (exporté par `AiModule`), `IdeaAccessGuard`.
- Produces (HTTP) :
  - `PUT /ideas/:id/capital` body `{ equipment, initialStock, openingCosts, other, availableCapital }` → 200 `{ capitalNeed: CapitalNeed }`
  - `GET /ideas/:id/report` → 200 `IdeaReport`:
  ```ts
  export interface IdeaReport {
    idea: { id: string; businessModel: BusinessModel; rawDescription: string; currency: CurrencyCode };
    hypotheses: Hypotheses;
    result: FinancialResult;
    breakEven: BreakEvenResult;
    scenarios: { key: ScenarioKey; result: FinancialResult }[];
    capital: { plan: CapitalPlanInput; need: CapitalNeed } | null;
    sensitivity: SensitivityEntry[];
    watchPoints: WatchPointCode[];
    canvas: {
      blocks: Partial<Record<CanvasBlockKey, string>>;
      costStructure: { variableCostPerUnit: number; fixedCosts: number; startupCosts: number | null };
      revenueStreams: { price: number; volume: number; revenue: number };
    };
    summary: { text: string; source: "ai" | "template" };
  }
  ```

- [ ] **Step 1: Failing HTTP test** — `report.http.spec.ts`

```ts
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { AI_PROVIDER, type AiProvider } from "../ai/ai-provider.port.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { IdeasModule } from "./ideas.module.js";

const CAPITAL = { equipment: 200000, initialStock: 150000, openingCosts: 50000, other: 0, availableCapital: 500000 };

const ai = {
  suggestHypotheses: vi.fn(),
  suggestCanvasBlocks: vi.fn(),
  writeReportSummary: vi.fn<AiProvider["writeReportSummary"]>(),
} satisfies AiProvider;

describe("Capital and report", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [IdeasModule] })
      .overrideProvider(AI_PROVIDER)
      .useValue(ai)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
    prisma = moduleRef.get(PrismaService);
  });

  afterEach(async () => {
    await prisma.idea.deleteMany();
    ai.writeReportSummary.mockReset();
  });

  afterAll(async () => {
    await app.close();
  });

  async function createIdea(paid: boolean): Promise<{ id: string; auth: [string, string] }> {
    const response = await request(app.getHttpServer())
      .post("/ideas")
      .send({
        businessModel: "SERVICE",
        rawDescription: "Cours de soutien scolaire a domicile.",
        currency: "XOF",
        hypotheses: { price: 5000, volume: 50, variableCostPerUnit: 2000, fixedCosts: 100000 },
      })
      .expect(201);
    const id = response.body.ideaId as string;
    if (paid) await prisma.idea.update({ where: { id }, data: { paidAt: new Date() } });
    return { id, auth: ["Authorization", `Bearer ${response.body.accessToken}`] };
  }

  it("requires the access token", async () => {
    const { id } = await createIdea(true);
    await request(app.getHttpServer()).put(`/ideas/${id}/capital`).send(CAPITAL).expect(401);
    await request(app.getHttpServer()).get(`/ideas/${id}/report`).expect(401);
  });

  it("refuses an unpaid idea with 403", async () => {
    const { id, auth } = await createIdea(false);
    await request(app.getHttpServer()).put(`/ideas/${id}/capital`).set(...auth).send(CAPITAL).expect(403);
    await request(app.getHttpServer()).get(`/ideas/${id}/report`).set(...auth).expect(403);
  });

  it("validates the capital plan", async () => {
    const { id, auth } = await createIdea(true);
    await request(app.getHttpServer()).put(`/ideas/${id}/capital`).set(...auth).send({ ...CAPITAL, equipment: -1 }).expect(400);
    await request(app.getHttpServer()).put(`/ideas/${id}/capital`).set(...auth).send({ ...CAPITAL, other: 2_147_483_648 }).expect(400);
    await request(app.getHttpServer()).put(`/ideas/${id}/capital`).set(...auth).send({ ...CAPITAL, other: 1.5 }).expect(400);
  });

  it("saves the capital plan (upsert) and returns the need", async () => {
    const { id, auth } = await createIdea(true);
    const first = await request(app.getHttpServer()).put(`/ideas/${id}/capital`).set(...auth).send(CAPITAL).expect(200);
    expect(first.body.capitalNeed).toMatchObject({ capitalNeeded: 700000, financingGap: 200000 });

    await request(app.getHttpServer()).put(`/ideas/${id}/capital`).set(...auth).send({ ...CAPITAL, availableCapital: 900000 }).expect(200);
    expect(await prisma.capitalPlan.count({ where: { ideaId: id } })).toBe(1);
  });

  it("report without canvas blocks and without capital", async () => {
    ai.writeReportSummary.mockResolvedValue(null);
    const { id, auth } = await createIdea(true);

    const { body } = await request(app.getHttpServer()).get(`/ideas/${id}/report`).set(...auth).expect(200);

    expect(body.result).toEqual({ currency: "XOF", revenue: 250000, grossMargin: 150000, estimatedResult: 50000 });
    expect(body.breakEven).toEqual({ reachable: true, volumeUnits: 34 });
    expect(body.scenarios.map((s: { key: string }) => s.key)).toEqual(["prudent", "realiste", "ambitieux", "crise"]);
    expect(body.capital).toBeNull();
    expect(body.sensitivity[0].key).toBe("price");
    expect(body.canvas.blocks).toEqual({});
    expect(body.canvas.costStructure).toEqual({ variableCostPerUnit: 2000, fixedCosts: 100000, startupCosts: null });
    expect(body.canvas.revenueStreams).toEqual({ price: 5000, volume: 50, revenue: 250000 });
    expect(body.summary.source).toBe("template");
    expect(body.summary.text).not.toMatch(/\d/);
    expect(await prisma.reportSummary.count()).toBe(0);
  });

  it("includes the capital, canvas blocks and watch points", async () => {
    ai.writeReportSummary.mockResolvedValue(null);
    const { id, auth } = await createIdea(true);
    await request(app.getHttpServer())
      .patch(`/ideas/${id}/canvas-blocks`)
      .set(...auth)
      .send({
        source: "utilisateur_edite",
        blocks: ["valueProposition", "customerSegments", "channels", "customerRelationships", "keyResources", "keyActivities", "keyPartners"].map(
          (key) => ({ key, content: `Texte ${key}` }),
        ),
      })
      .expect(200);
    await request(app.getHttpServer()).put(`/ideas/${id}/capital`).set(...auth).send(CAPITAL).expect(200);

    const { body } = await request(app.getHttpServer()).get(`/ideas/${id}/report`).set(...auth).expect(200);

    expect(body.capital.plan).toEqual(CAPITAL);
    expect(body.capital.need.financingGap).toBe(200000);
    expect(body.watchPoints).toContain("financing_gap");
    expect(body.canvas.blocks.valueProposition).toBe("Texte valueProposition");
    expect(body.canvas.costStructure.startupCosts).toBe(400000);
  });

  it("stores the AI summary and reuses it while the facts are unchanged", async () => {
    ai.writeReportSummary.mockResolvedValue("Ton idee tient sur le papier.");
    const { id, auth } = await createIdea(true);

    const first = await request(app.getHttpServer()).get(`/ideas/${id}/report`).set(...auth).expect(200);
    const second = await request(app.getHttpServer()).get(`/ideas/${id}/report`).set(...auth).expect(200);

    expect(first.body.summary).toEqual({ text: "Ton idee tient sur le papier.", source: "ai" });
    expect(second.body.summary).toEqual({ text: "Ton idee tient sur le papier.", source: "ai" });
    expect(ai.writeReportSummary).toHaveBeenCalledTimes(1);
  });

  it("regenerates summary when facts change", async () => {
    ai.writeReportSummary.mockResolvedValueOnce("Premiere synthese.").mockResolvedValueOnce("Seconde synthese.");
    const { id, auth } = await createIdea(true);
    await request(app.getHttpServer()).get(`/ideas/${id}/report`).set(...auth).expect(200);

    await request(app.getHttpServer()).put(`/ideas/${id}/capital`).set(...auth).send(CAPITAL).expect(200);
    const { body } = await request(app.getHttpServer()).get(`/ideas/${id}/report`).set(...auth).expect(200);

    expect(body.summary.text).toBe("Seconde synthese.");
    expect(ai.writeReportSummary).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run** — `pnpm --filter api exec vitest run src/ideas/report.http.spec.ts` → FAIL (404 sur les routes).

- [ ] **Step 3: Implement**

`paid-idea.guard.ts`:
```ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { PrismaService } from "../prisma/prisma.service.js";

// Runs after IdeaAccessGuard: the idea exists and the token matched.
@Injectable()
export class PaidIdeaGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request<{ id?: string }>>();
    const idea = await this.prisma.idea.findUnique({ where: { id: request.params.id ?? "" }, select: { paidAt: true } });
    if (!idea?.paidAt) {
      throw new ForbiddenException("L'analyse complete n'est pas encore payee.");
    }
    return true;
  }
}
```

`dto/capital-plan.dto.ts`:
```ts
import { IsInt, Max, Min } from "class-validator";

// Ceiling of a Postgres `Int` column.
const MAX_DB_INT = 2_147_483_647;

export class CapitalPlanDto {
  @IsInt() @Min(0) @Max(MAX_DB_INT) equipment!: number;
  @IsInt() @Min(0) @Max(MAX_DB_INT) initialStock!: number;
  @IsInt() @Min(0) @Max(MAX_DB_INT) openingCosts!: number;
  @IsInt() @Min(0) @Max(MAX_DB_INT) other!: number;
  @IsInt() @Min(0) @Max(MAX_DB_INT) availableCapital!: number;
}
```

`report.service.ts`:
```ts
import { Inject, Injectable } from "@nestjs/common";
import type { BusinessModel } from "@prisma/client";
import {
  applyScenario,
  computeBreakEven,
  computeCapitalNeed,
  computeResult,
  computeSensitivity,
  computeWatchPoints,
  type BreakEvenResult,
  type CapitalNeed,
  type CapitalPlanInput,
  type CurrencyCode,
  type FinancialResult,
  type Hypotheses,
  type ScenarioKey,
  type SensitivityEntry,
  type WatchPointCode,
} from "financial-engine";
import { AI_PROVIDER, type AiProvider, type CanvasBlockKey, type ReportSummaryFacts } from "../ai/ai-provider.port.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { CapitalPlanDto } from "./dto/capital-plan.dto.js";
import { buildReportFacts, factsHash, templateSummary } from "./report-summary.js";

const SCENARIOS: readonly ScenarioKey[] = ["prudent", "realiste", "ambitieux", "crise"];

export interface IdeaReport { /* exactly the interface in this task's Interfaces block */ }

@Injectable()
export class ReportService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AI_PROVIDER) private readonly ai: AiProvider,
  ) {}

  async saveCapital(ideaId: string, dto: CapitalPlanDto): Promise<{ capitalNeed: CapitalNeed }> {
    const idea = await this.prisma.idea.findUniqueOrThrow({ where: { id: ideaId }, include: { hypotheses: true } });
    const plan = toPlan(dto);
    // Computed before writing: the engine validates the totals.
    const capitalNeed = computeCapitalNeed(toHypotheses(idea.currency, idea.hypotheses), plan);
    await this.prisma.capitalPlan.upsert({ where: { ideaId }, create: { ideaId, ...plan }, update: plan });
    return { capitalNeed };
  }

  async getReport(ideaId: string): Promise<IdeaReport> {
    const idea = await this.prisma.idea.findUniqueOrThrow({
      where: { id: ideaId },
      include: { hypotheses: true, canvasBlocks: true, capitalPlan: true, reportSummary: true },
    });
    const currency = idea.currency as CurrencyCode;
    const hypotheses = toHypotheses(currency, idea.hypotheses);
    const result = computeResult(hypotheses);
    const breakEven = computeBreakEven(hypotheses);
    const plan = idea.capitalPlan ? toPlan(idea.capitalPlan) : null;
    const need = plan ? computeCapitalNeed(hypotheses, plan) : null;
    const sensitivity = computeSensitivity(hypotheses);
    const watchPoints = computeWatchPoints(hypotheses, need);
    const blocks = Object.fromEntries(idea.canvasBlocks.map((block) => [block.key, block.content])) as Partial<
      Record<CanvasBlockKey, string>
    >;

    const facts = buildReportFacts({
      businessModel: idea.businessModel,
      estimatedResult: result.estimatedResult,
      breakEvenReachable: breakEven.reachable,
      watchPoints,
      sensitivity,
      capitalNeed: need,
      valueProposition: blocks.valueProposition ?? null,
      customerSegments: blocks.customerSegments ?? null,
    });

    return {
      idea: { id: idea.id, businessModel: idea.businessModel, rawDescription: idea.rawDescription, currency },
      hypotheses,
      result,
      breakEven,
      scenarios: SCENARIOS.map((key) => ({ key, result: computeResult(applyScenario(hypotheses, key)) })),
      capital: plan && need ? { plan, need } : null,
      sensitivity,
      watchPoints,
      canvas: {
        blocks,
        costStructure: {
          variableCostPerUnit: hypotheses.variableCostPerUnit,
          fixedCosts: hypotheses.fixedCosts,
          startupCosts: need?.startupCosts ?? null,
        },
        revenueStreams: { price: hypotheses.price, volume: hypotheses.volume, revenue: result.revenue },
      },
      summary: await this.resolveSummary(ideaId, facts, idea.reportSummary),
    };
  }

  // Only an AI summary is stored: a template fallback is rebuilt on each request so the AI
  // gets another chance next time.
  private async resolveSummary(
    ideaId: string,
    facts: ReportSummaryFacts,
    stored: { text: string; factsHash: string } | null,
  ): Promise<IdeaReport["summary"]> {
    const hash = factsHash(facts);
    if (stored?.factsHash === hash) return { text: stored.text, source: "ai" };

    const text = await this.ai.writeReportSummary(facts);
    if (!text) return { text: templateSummary(facts), source: "template" };

    await this.prisma.reportSummary.upsert({
      where: { ideaId },
      create: { ideaId, text, factsHash: hash },
      update: { text, factsHash: hash },
    });
    return { text, source: "ai" };
  }
}

function toHypotheses(currency: string, rows: { key: string; value: number }[]): Hypotheses {
  const value = (key: string) => rows.find((row) => row.key === key)?.value ?? 0;
  return {
    currency: currency as CurrencyCode,
    price: value("price"),
    volume: value("volume"),
    variableCostPerUnit: value("variableCostPerUnit"),
    fixedCosts: value("fixedCosts"),
  };
}

function toPlan(source: CapitalPlanInput): CapitalPlanInput {
  return {
    equipment: source.equipment,
    initialStock: source.initialStock,
    openingCosts: source.openingCosts,
    other: source.other,
    availableCapital: source.availableCapital,
  };
}
```

`ideas.controller.ts`: inject `ReportService`, add:
```ts
  @Put(":id/capital")
  @UseGuards(IdeaAccessGuard, PaidIdeaGuard)
  saveCapital(@Param("id") id: string, @Body() dto: CapitalPlanDto) {
    return this.reportService.saveCapital(id, dto);
  }

  @Get(":id/report")
  @UseGuards(IdeaAccessGuard, PaidIdeaGuard)
  getReport(@Param("id") id: string) {
    return this.reportService.getReport(id);
  }
```
(`@Put` returns 200 by default in Nest.)

`ideas.module.ts`: `imports: [PrismaModule, FinancialEngineModule, AiModule]`, `providers: [IdeasService, ReportService]`.

- [ ] **Step 4: Run** — `pnpm --filter api test` (toute la suite API, base de test) → PASS ; `pnpm --filter api build && pnpm --filter api lint` → OK.

- [ ] **Step 5: Commit** — `git commit -m "feat(api): routes capital et rapport complet, reservees aux idees payees (Phase 6b-2a)"`

### Task 8: Écrans capital et rapport (web)

**Files:**
- Modify: `apps/web/src/lib/ideas-api.ts` (`saveCapital`, `fetchReport`, types), `apps/web/src/app/analyse/[ideaId]/page.tsx`, `apps/web/src/components/wizard/StepScenarios.tsx` (prop `onNext`), `apps/web/src/components/wizard/StepOffer.tsx`, `apps/web/src/app/globals.css` (règles `@media print`)
- Create: `apps/web/src/components/analyse/StepCapital.tsx`, `apps/web/src/components/analyse/ReportView.tsx`, `apps/web/src/components/analyse/report-copy.ts`

**Interfaces:**
- Consumes: `PUT /ideas/:id/capital`, `GET /ideas/:id/report` (Task 7), `computeCapitalNeed` (Task 1, côté navigateur pour le récapitulatif).
- Produces:
  ```ts
  // ideas-api.ts
  export interface CapitalPlanInput { equipment: number; initialStock: number; openingCosts: number; other: number; availableCapital: number }
  export async function saveCapital(ideaId: string, plan: CapitalPlanInput): Promise<void>
  export async function fetchReport(ideaId: string): Promise<IdeaReport>   // IdeaReport mirrors Task 7, imported types from "financial-engine"
  ```

- [ ] **Step 1: API client** — in `ideas-api.ts`, add `CapitalPlanInput`, `IdeaReport` (reuse `FinancialResult`, `BreakEvenResult`, `CanvasBlockKey`; import `CapitalNeed`, `SensitivityEntry`, `WatchPointCode`, `ScenarioKey` types from `"financial-engine"`), and:

```ts
export async function saveCapital(ideaId: string, plan: CapitalPlanInput): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/ideas/${ideaId}/capital`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders(ideaId) },
    body: JSON.stringify(plan),
  });
  if (response.status === 401 || response.status === 404) throw new AccessDeniedError();
  if (!response.ok) throw new Error(`L'enregistrement du capital a echoue (${response.status}).`);
}

export async function fetchReport(ideaId: string): Promise<IdeaReport> {
  const response = await fetch(`${API_BASE_URL}/ideas/${ideaId}/report`, { headers: authHeaders(ideaId) });
  if (response.status === 401 || response.status === 404) throw new AccessDeniedError();
  if (!response.ok) throw new Error(`Le rapport est indisponible (${response.status}).`);
  return (await response.json()) as IdeaReport;
}
```

- [ ] **Step 2: `report-copy.ts`** — French copy for watch points and sensitivity keys:

```ts
import type { SensitivityKey, WatchPointCode } from "financial-engine";

export const WATCH_POINT_COPY: Record<WatchPointCode, string> = {
  non_positive_unit_margin: "Chaque vente te coute autant ou plus qu'elle ne te rapporte : augmente ton prix ou baisse ton cout par unite avant tout.",
  below_break_even: "Le nombre de ventes que tu prevois est sous ton seuil de rentabilite : tu ne couvres pas encore tes charges.",
  thin_gross_margin: "Ta marge sur chaque vente est faible : une petite hausse de tes couts peut faire basculer ton resultat.",
  prudent_scenario_loss: "Si tes ventes sont un peu moins bonnes que prevu (scenario prudent), tu perds de l'argent.",
  financing_gap: "Ton capital ne couvre pas tes depenses de depart et trois mois de charges : prevois un financement ou un lancement plus petit.",
  no_cash_reserve: "Ton capital ne couvre meme pas tes depenses de depart : tu n'aurais aucune reserve pour les premiers mois.",
};

export const SENSITIVITY_COPY: Record<SensitivityKey, { label: string; up: string; down: string }> = {
  price: { label: "Prix de vente", up: "Si ton prix monte de 10 %", down: "S'il baisse de 10 %" },
  volume: { label: "Ventes par mois", up: "Si tu vends 10 % de plus", down: "Si tu vends 10 % de moins" },
  variableCostPerUnit: { label: "Cout par unite", up: "Si ce cout monte de 10 %", down: "S'il baisse de 10 %" },
  fixedCosts: { label: "Charges fixes", up: "Si tes charges montent de 10 %", down: "Si elles baissent de 10 %" },
};

export const CANVAS_LABELS = {
  keyPartners: "Partenaires cles",
  keyActivities: "Activites cles",
  keyResources: "Ressources cles",
  valueProposition: "Proposition de valeur",
  customerRelationships: "Relations clients",
  channels: "Canaux",
  customerSegments: "Segments de clients",
  costStructure: "Structure de couts",
  revenueStreams: "Flux de revenus",
} as const;
```

- [ ] **Step 3: `StepCapital.tsx`** — client component, props `{ currency, fixedCosts, initialPlan: CapitalPlanInput | null, saving, error, onSubmit(plan), onBack }`. Five number inputs styled exactly like `StepHypotheses` inputs (labels from the spec), state initialised from `initialPlan ?? zeros`. Live recap computed with `computeCapitalNeed({ currency, price: 1, volume: 0, variableCostPerUnit: 0, fixedCosts }, plan)` inside `useMemo` + `try/catch` (invalid input → recap hidden): rows « Depenses de depart », « Reserve (3 mois de charges) », « Capital necessaire », « Capital disponible », then « Il te manque X » (`text-error`) or « Tu as X de marge » (`text-accent-emerald`). Buttons « Retour » / « Voir mon rapport » (gradient primary, `disabled={saving}`). Amounts via `formatAmount`.

- [ ] **Step 4: `ReportView.tsx`** — client component, props `{ report: IdeaReport, onEditCapital, onBackToAnalysis }`. Sections in spec order, each a `<section className="report-section rounded-2xl border border-border bg-surface p-6">` with an `h2`:
  1. « Synthese » : `report.summary.text` + disclaimer « Ca tient ? est une aide a la decision, pas une garantie de rentabilite : les resultats dependent des hypotheses que tu fournis. »
  2. « Chiffres cles » : CA, marge brute, resultat estime (mensuel), seuil (« X ventes par mois » or « inatteignable tant que ton prix ne depasse pas ton cout par unite »).
  3. « Capital et besoin financier » : the five recap rows from `report.capital.need`, or, if `capital === null`, a paragraph + button « Completer mon capital » → `onEditCapital`.
  4. « Scenarios » : table Scenario / Resultat estime par mois (labels Prudent, Realiste, Ambitieux, Crise).
  5. « Variables sensibles » : one row per entry: label, `up` → `formatAmount(resultIfUp)`, `down` → `formatAmount(resultIfDown)`.
  6. « Points a surveiller » : list of `WATCH_POINT_COPY[code]`, or « Aucun point d'alerte avec tes hypotheses actuelles. »
  7. « Ton business model » : grid `grid gap-3 md:grid-cols-3 print:grid-cols-1` of the 9 blocks in `CANVAS_LABELS` order; stored blocks show their text or « Non renseigne »; costStructure renders « Cout par unite : X · Charges fixes : X/mois · Depenses de depart : X » (last part only if not null); revenueStreams renders « X ventes par mois a X, soit X de chiffre d'affaires mensuel ».
  Header row (class `no-print`): « Modifier mon capital », « Revenir a Et si ? », « Imprimer / Enregistrer en PDF » (`window.print()`).

- [ ] **Step 5: Print CSS** — append to `globals.css`:
```css
@media print {
  header, footer, .no-print { display: none !important; }
  .report-section { break-inside: avoid; }
}
```
and force light tokens for print by repeating the light-theme `:root` variable values inside `@media print { :root, :root.dark { … } }` (copy the light values already defined in `globals.css`, no new colour).

- [ ] **Step 6: Wire `/analyse/[ideaId]/page.tsx`** — `screen` becomes `"et-si" | "scenarios" | "capital" | "report"`; state `report: IdeaReport | null`, `savingCapital`, `capitalError`. On `paid`, also call `fetchReport(ideaId)`: if `report.capital` is not null, start on `"report"`; keep the report in state. `StepScenarios` gets `onNext={() => setScreen("capital")}` and a « Continuer » primary button next to « Retour ». `StepCapital` `onSubmit` → `saveCapital` → `fetchReport` → `setReport` + `setScreen("report")`; error → `capitalError` message, input kept. A `fetchReport` failure shows the existing `error` view.

- [ ] **Step 7: `StepOffer.tsx`** — replace « Bientot inclus : ton rapport complet, avec ton business model et le capital dont tu as besoin. » by « Ton rapport complet a imprimer : synthese, capital et besoin financier, variables sensibles, points a surveiller et business model. »

- [ ] **Step 8: Verify** — `pnpm --filter web exec tsc --noEmit && pnpm --filter web lint` → OK.

- [ ] **Step 9: Commit** — `git commit -m "feat(web): ecrans Ton capital et Ton rapport imprimable (Phase 6b-2a)"`

### Task 9: Documentation et vérification de bout en bout

**Files:** `docs/DECISIONS.md`, `docs/API.md`, `docs/USER_FLOWS.md`, `docs/AI_ENGINE.md`, `tasks/TODO.md`, `tasks/CHANGELOG.md`

- [ ] **Step 1: Docs** — DECISIONS (2026-10-02 : formule du capital, seuils, garde-fou « aucun chiffre », synthèse stockée par empreinte) ; API.md (deux routes, codes 401/404/403/400) ; USER_FLOWS #11 (Capital → Rapport) ; AI_ENGINE (synthèse) ; TODO (6b-2a cochée, dette `HypothesesDto` sans `@Max`) ; CHANGELOG.

- [ ] **Step 2: Full checks** — `pnpm --filter financial-engine test && pnpm --filter api test && pnpm --filter api build && pnpm --filter web exec tsc --noEmit && pnpm --filter web lint`.

- [ ] **Step 3: Browser E2E** — API on 3011 (`PAYMENT_PROVIDER=test`, `WEB_APP_URL=http://localhost:3012`), web on 3012 (`NEXT_PUBLIC_API_URL=http://localhost:3011`): wizard → offer → test payment → Et si ? → Scénarios → Continuer → capital (live recap) → rapport (7 sections) → reload `/analyse/<id>` opens the report → print preview. If no browser tool is available, verify the API flow with curl and say so explicitly.

- [ ] **Step 4: Commit** — `git commit -m "docs: Phase 6b-2a (capital et rapport complet)"`
