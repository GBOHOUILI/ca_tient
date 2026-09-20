# Phase 5b, écrans "Et si ?" / "Scénarios", Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire les écrans "Et si ?" (sliders + saisonnalité + graphiques temps réel) et "Scénarios" (comparaison en barres) du wizard, juste après l'écran Résultats, en consommant directement le package `financial-engine` côté navigateur.

**Architecture:** `apps/web` dépend directement du package `financial-engine` (Phase 5a, JS compilé) — aucun appel réseau, tout se calcule dans le navigateur. Deux nouveaux composants d'écran (`StepEtSi`, `StepScenarios`) et trois composants de graphique purs (Recharts) réutilisables, câblés dans `commencer/page.tsx` via deux nouvelles valeurs de `WizardStep`. Le vocabulaire de `StepHypotheses.tsx` est reformulé au passage (dette Phase 4).

**Tech Stack:** Recharts (^3.10.1), `financial-engine` (package interne, `workspace:*`), Next.js 16, React 19, aucune suite de tests automatisée sur `apps/web` (précédent établi).

**Spec:** `docs/superpowers/specs/2026-09-20-phase-5b-et-si-scenarios-design.md`

## Global Constraints

- Aucun calcul financier ne repasse par le réseau : tout passe par `applyDelta`/`applyScenario`/`computeResult`/`computeBreakEven`/`computeAnnualProjection` importés directement de `"financial-engine"`.
- Les 4 sliders de "Et si ?" sont des **pourcentages de variation**, jamais des valeurs absolues. Bornes : `price` -50 % à +100 % ; `volume`/`variableCostPerUnit`/`fixedCosts` -100 % à +200 %.
- Le graphique de seuil de rentabilité est **une seule série** (la marge en fonction du volume), jamais deux lignes — évite une légende inutile, colle à `design/COMPONENTS.md`.
- Le graphique mensuel de saisonnalité n'apparaît que si `seasonalityProfile !== "stable"`.
- Le scénario "Personnalisé" de l'écran Scénarios réutilise `state.whatIfDeltas` de l'écran "Et si ?", sans saisie dupliquée, et n'inclut jamais la saisonnalité.
- Toute erreur levée par le moteur (`FinancialEngineInputError`) est attrapée localement, jamais un écran qui plante.
- Aucune couleur inventée : uniquement les tokens CSS déjà définis (`--color-success`, `--color-error`, `--color-accent-emerald`, `--color-accent-cyan`, `--color-border`, `--color-text-primary`, `--color-text-secondary`, `--color-surface`).
- Chaque graphique a un `<Tooltip>` et un `aria-label` résumant son contenu (`design/UX_PRINCIPLES.md`) — pas de vue tableau alternative (sur-ingénierie pour cette taille de fonctionnalité).
- Pas de suite de tests automatisée sur `apps/web` (précédent établi Phase 3) : `pnpm --filter web lint && pnpm --filter web build` à chaque tâche, vérification manuelle par navigateur (Playwright) en fin de plan.
- **La vérification Playwright finale est faite par le contrôleur de la session lui-même**, pas seulement rapportée par un sub-agent délégué — décision explicite de cette session.
- Les tâches doivent être faites dans l'ordre (1 → 6), chaque tâche laisse le dépôt dans un état qui compile (`lint`/`build` verts) — jamais de commit intermédiaire cassé.

---

## Task 1: Dépendances `apps/web` (`financial-engine` + Recharts) + décision consignée

**Files:**
- Modify: `apps/web/package.json`
- Modify: `docs/DECISIONS.md`

**Interfaces:**
- Produces: `financial-engine` et `recharts` installés et importables depuis n'importe quel composant `apps/web`.

Config, pas de cycle TDD (aucun comportement nouveau, exception explicite de la skill test-driven-development, même pattern que les Task 1 précédentes).

- [ ] **Step 1: Installer les dépendances**

Run: `cd apps/web && pnpm add financial-engine@workspace:* recharts@^3.10.1`
Expected: `apps/web/package.json` liste `financial-engine` (`workspace:*`) et `recharts` (`^3.10.1`) en dependencies.

- [ ] **Step 2: Consigner la décision dans `docs/DECISIONS.md`**

Ajouter à la fin de `docs/DECISIONS.md`, avant la ligne `*(À compléter au fil du projet...)*` :

```markdown
- **[2026-09-20] Librairie de graphiques : Recharts (Phase 5b).** Composants React déclaratifs, bon support tooltips/responsive, facile à styler avec les tokens CSS existants (`design/COLORS.md`). `apps/web` importe aussi directement le package `financial-engine` (Phase 5a) pour recalculer côté navigateur sans aller-retour réseau à chaque interaction des écrans "Et si ?"/"Scénarios" — contrairement à `BusinessModel`/`CurrencyCode` (redéfinis localement depuis la Phase 3 car couplés à `@prisma/client`), `financial-engine` est un package pur conçu pour être partagé tel quel entre `apps/api` et `apps/web`.
```

- [ ] **Step 3: Vérifier que le projet compile toujours**

Run: `pnpm --filter web lint && pnpm --filter web build`
Expected: succès (les nouvelles dépendances ne sont pas encore utilisées, doivent juste s'installer sans casser le build).

- [ ] **Step 4: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml docs/DECISIONS.md
git commit -m "chore(web): ajoute financial-engine et recharts pour la Phase 5b"
```

---

## Task 2: État du wizard — `WhatIfDeltas`, saisonnalité, nouveaux steps

**Files:**
- Modify: `apps/web/src/components/wizard/wizard-reducer.ts`

**Interfaces:**
- Consumes: `SeasonalityProfileKey` (package `financial-engine`, Phase 5a).
- Produces: `WizardStep` étendu (`"et-si"`, `"scenarios"`), interface `WhatIfDeltas`, champs `WizardState.whatIfDeltas`/`WizardState.seasonalityProfile`, actions `SET_WHAT_IF_DELTA`/`SET_SEASONALITY_PROFILE`. Consommés par `StepEtSi`/`StepScenarios` (Tasks 4-5) et `commencer/page.tsx` (Task 6).

- [ ] **Step 1: Étendre `wizard-reducer.ts`**

Remplacer le contenu de `apps/web/src/components/wizard/wizard-reducer.ts` :

```typescript
import type { BusinessModel, CurrencyCode, HypothesesInput } from "@/lib/ideas-api";
import type { SeasonalityProfileKey } from "financial-engine";

export type WizardStep =
  | "business-type"
  | "description"
  | "hypotheses"
  | "results"
  | "et-si"
  | "scenarios";

export interface WhatIfDeltas {
  price: number;
  volume: number;
  variableCostPerUnit: number;
  fixedCosts: number;
}

export interface WizardState {
  step: WizardStep;
  businessModel: BusinessModel | null;
  rawDescription: string;
  currency: CurrencyCode;
  hypotheses: HypothesesInput;
  wasSuggested: boolean;
  whatIfDeltas: WhatIfDeltas;
  seasonalityProfile: SeasonalityProfileKey;
}

export type WizardAction =
  | { type: "SELECT_BUSINESS_MODEL"; businessModel: BusinessModel }
  | { type: "SET_DESCRIPTION"; rawDescription: string }
  | { type: "SET_CURRENCY"; currency: CurrencyCode }
  | { type: "SET_HYPOTHESIS"; key: keyof HypothesesInput; value: number }
  | { type: "SET_HYPOTHESES"; hypotheses: HypothesesInput }
  | { type: "SET_WHAT_IF_DELTA"; key: keyof WhatIfDeltas; value: number }
  | { type: "SET_SEASONALITY_PROFILE"; profile: SeasonalityProfileKey }
  | { type: "GO_TO_STEP"; step: WizardStep };

export const initialWizardState: WizardState = {
  step: "business-type",
  businessModel: null,
  rawDescription: "",
  currency: "XOF",
  hypotheses: { price: 0, volume: 0, variableCostPerUnit: 0, fixedCosts: 0 },
  wasSuggested: false,
  whatIfDeltas: { price: 0, volume: 0, variableCostPerUnit: 0, fixedCosts: 0 },
  seasonalityProfile: "stable",
};

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "SELECT_BUSINESS_MODEL":
      return { ...state, businessModel: action.businessModel, step: "description" };
    case "SET_DESCRIPTION":
      return { ...state, rawDescription: action.rawDescription };
    case "SET_CURRENCY":
      return { ...state, currency: action.currency, wasSuggested: false };
    case "SET_HYPOTHESIS":
      return { ...state, hypotheses: { ...state.hypotheses, [action.key]: action.value }, wasSuggested: false };
    case "SET_HYPOTHESES":
      return { ...state, hypotheses: action.hypotheses, wasSuggested: true };
    case "SET_WHAT_IF_DELTA":
      return { ...state, whatIfDeltas: { ...state.whatIfDeltas, [action.key]: action.value } };
    case "SET_SEASONALITY_PROFILE":
      return { ...state, seasonalityProfile: action.profile };
    case "GO_TO_STEP":
      return { ...state, step: action.step };
    default:
      return state;
  }
}
```

- [ ] **Step 2: Vérifier que le projet compile toujours**

Run: `pnpm --filter web lint && pnpm --filter web build`
Expected: succès (nouveaux champs/actions pas encore consommés ailleurs, doivent juste être syntaxiquement/typiquement valides — `commencer/page.tsx` ne référence pas encore `"et-si"`/`"scenarios"`, ce qui est cohérent puisque `WizardStep` est un sur-ensemble strict de l'ancien type).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/wizard/wizard-reducer.ts
git commit -m "feat(web): etat du wizard pour Et si ? et Scenarios (deltas, saisonnalite)"
```

---

## Task 3: Composants de graphique (Recharts)

**Files:**
- Create: `apps/web/src/components/wizard/charts/BreakEvenChart.tsx`
- Create: `apps/web/src/components/wizard/charts/MonthlyRevenueChart.tsx`
- Create: `apps/web/src/components/wizard/charts/ScenarioComparisonChart.tsx`

**Interfaces:**
- Consumes: `MonthlyResult` (package `financial-engine`, Phase 5a).
- Produces: `BreakEvenChart({ price, variableCostPerUnit, fixedCosts, currentVolume, breakEvenVolume, currency })`, `MonthlyRevenueChart({ projection, currency })`, `ScenarioComparisonChart({ bars, currency })` + type `ScenarioBar` (`{ label: string; estimatedResult: number }`). Consommés par `StepEtSi` (Task 4) et `StepScenarios` (Task 5).

Composants purs, présentation uniquement — ne connaissent pas `WizardState`, prennent des données déjà calculées en props (isolation, testabilité indépendante).

**Correction par rapport à la première rédaction de ce plan** : le `formatter` de `<Tooltip>` était initialement typé `(value: number) => ...`, mais `recharts@3.10.1` type ce paramètre en `ValueType` (`number | string | ReadonlyArray<...> | undefined`), pas `number` directement — vérifié dans `node_modules/recharts/types/component/DefaultTooltipContent.d.ts` pendant l'implémentation. Corrigé dans les 3 fichiers en `(value) => formatAmount(Number(value), currency)` (inférence contextuelle + coercition explicite), sans changement de comportement visuel.

- [ ] **Step 1: `BreakEvenChart`**

Créer `apps/web/src/components/wizard/charts/BreakEvenChart.tsx` :

```typescript
"use client";

import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const SAMPLE_POINTS = 20;

function formatAmount(value: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export function BreakEvenChart({
  price,
  variableCostPerUnit,
  fixedCosts,
  currentVolume,
  breakEvenVolume,
  currency,
}: {
  price: number;
  variableCostPerUnit: number;
  fixedCosts: number;
  currentVolume: number;
  breakEvenVolume: number | null;
  currency: string;
}) {
  const domainMax = Math.max(currentVolume, breakEvenVolume ?? 0, 10) * 2;
  const unitMargin = price - variableCostPerUnit;

  const data = Array.from({ length: SAMPLE_POINTS + 1 }, (_, i) => {
    const volume = Math.round((domainMax / SAMPLE_POINTS) * i);
    return { volume, margin: unitMargin * volume - fixedCosts };
  });

  const margins = data.map((point) => point.margin);
  const maxMargin = Math.max(...margins);
  const minMargin = Math.min(...margins);
  const range = maxMargin - minMargin;
  const zeroOffset = range === 0 ? 0.5 : maxMargin / range;
  const clampedOffset = Math.min(Math.max(zeroOffset, 0), 1);

  return (
    <div aria-label={`Graphique de seuil de rentabilite : marge estimee selon le volume de ventes, de 0 a ${domainMax} unites par mois.`}>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
          <defs>
            <linearGradient id="breakEvenSplitColor" x1="0" y1="0" x2="0" y2="1">
              <stop offset={clampedOffset} stopColor="var(--color-success)" stopOpacity={0.85} />
              <stop offset={clampedOffset} stopColor="var(--color-error)" stopOpacity={0.85} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="volume"
            type="number"
            domain={[0, domainMax]}
            tick={{ fontSize: 12 }}
            label={{ value: "Volume vendu / mois", position: "insideBottom", offset: -10, fontSize: 12 }}
          />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(value: number) => formatAmount(value, currency)} width={90} />
          <Tooltip
            formatter={(value) => formatAmount(Number(value), currency)}
            labelFormatter={(label) => `${label} unites/mois`}
          />
          <ReferenceLine y={0} stroke="var(--color-text-secondary)" />
          <ReferenceLine
            x={currentVolume}
            stroke="var(--color-text-primary)"
            strokeDasharray="4 4"
            label={{ value: "Tu es ici", position: "top", fontSize: 12 }}
          />
          {breakEvenVolume !== null && (
            <ReferenceLine x={breakEvenVolume} stroke="var(--color-accent-emerald)" strokeDasharray="2 2" />
          )}
          <Area type="monotone" dataKey="margin" stroke="var(--color-text-primary)" fill="url(#breakEvenSplitColor)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: `MonthlyRevenueChart`**

Créer `apps/web/src/components/wizard/charts/MonthlyRevenueChart.tsx` :

```typescript
"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MonthlyResult } from "financial-engine";

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Avr", "Mai", "Jun", "Jul", "Aou", "Sep", "Oct", "Nov", "Dec"];

function formatAmount(value: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export function MonthlyRevenueChart({ projection, currency }: { projection: MonthlyResult[]; currency: string }) {
  const data = projection.map((monthly) => ({
    month: MONTH_LABELS[monthly.month - 1],
    revenue: monthly.result.revenue,
  }));

  return (
    <div aria-label="Graphique du chiffre d'affaires estime pour chacun des 12 mois de l'annee, selon le profil de saisonnalite choisi.">
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(value: number) => formatAmount(value, currency)} width={90} />
          <Tooltip formatter={(value) => formatAmount(Number(value), currency)} />
          <Bar dataKey="revenue" fill="var(--color-accent-cyan)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3: `ScenarioComparisonChart`**

Créer `apps/web/src/components/wizard/charts/ScenarioComparisonChart.tsx` :

```typescript
"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface ScenarioBar {
  label: string;
  estimatedResult: number;
}

function formatAmount(value: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export function ScenarioComparisonChart({ bars, currency }: { bars: ScenarioBar[]; currency: string }) {
  return (
    <div aria-label="Graphique comparant le resultat estime pour chaque scenario : prudent, realiste, ambitieux, crise et personnalise.">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={bars} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(value: number) => formatAmount(value, currency)} width={90} />
          <Tooltip formatter={(value) => formatAmount(Number(value), currency)} />
          <Bar dataKey="estimatedResult" radius={[4, 4, 0, 0]}>
            {bars.map((bar) => (
              <Cell key={bar.label} fill={bar.estimatedResult >= 0 ? "var(--color-success)" : "var(--color-error)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 4: Vérifier que le projet compile toujours**

Run: `pnpm --filter web lint && pnpm --filter web build`
Expected: succès (composants pas encore utilisés ailleurs, doivent juste être syntaxiquement/typiquement valides).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/wizard/charts
git commit -m "feat(web): composants de graphiques Recharts (seuil, mensuel, scenarios)"
```

---

## Task 4: `StepEtSi`

**Files:**
- Create: `apps/web/src/components/wizard/StepEtSi.tsx`

**Interfaces:**
- Consumes: `WhatIfDeltas` (Task 2), `BreakEvenChart`/`MonthlyRevenueChart` (Task 3), `applyDelta`/`computeBreakEven`/`computeAnnualProjection`/`Hypotheses`/`SeasonalityProfileKey` (package `financial-engine`).
- Produces: `StepEtSi({ hypotheses, currency, whatIfDeltas, seasonalityProfile, onDeltaChange, onSeasonalityChange, onNext, onBack })`. Consommé par `commencer/page.tsx` (Task 6).

- [ ] **Step 1: Implémenter `StepEtSi`**

Créer `apps/web/src/components/wizard/StepEtSi.tsx` :

```typescript
"use client";

import { useMemo } from "react";
import { applyDelta, computeAnnualProjection, computeBreakEven, type Hypotheses, type SeasonalityProfileKey } from "financial-engine";
import type { CurrencyCode, HypothesesInput } from "@/lib/ideas-api";
import type { WhatIfDeltas } from "./wizard-reducer";
import { BreakEvenChart } from "./charts/BreakEvenChart";
import { MonthlyRevenueChart } from "./charts/MonthlyRevenueChart";

const SEASONALITY_OPTIONS: { value: SeasonalityProfileKey; label: string }[] = [
  { value: "stable", label: "Stable toute l'annee" },
  { value: "fetes_fin_annee", label: "Pic en fin d'annee (fetes)" },
  { value: "ete", label: "Pic en ete" },
  { value: "rentree_scolaire", label: "Pic a la rentree scolaire" },
];

const SLIDER_CONFIG: { key: keyof WhatIfDeltas; label: string; min: number; max: number }[] = [
  { key: "price", label: "Prix de vente", min: -50, max: 100 },
  { key: "volume", label: "Volume de ventes", min: -100, max: 200 },
  { key: "variableCostPerUnit", label: "Cout variable par unite", min: -100, max: 200 },
  { key: "fixedCosts", label: "Couts fixes", min: -100, max: 200 },
];

export function StepEtSi({
  hypotheses,
  currency,
  whatIfDeltas,
  seasonalityProfile,
  onDeltaChange,
  onSeasonalityChange,
  onNext,
  onBack,
}: {
  hypotheses: HypothesesInput;
  currency: CurrencyCode;
  whatIfDeltas: WhatIfDeltas;
  seasonalityProfile: SeasonalityProfileKey;
  onDeltaChange: (key: keyof WhatIfDeltas, value: number) => void;
  onSeasonalityChange: (profile: SeasonalityProfileKey) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { adjusted, breakEvenVolume, error } = useMemo(() => {
    const base: Hypotheses = { currency, ...hypotheses };
    try {
      const adjusted = applyDelta(base, whatIfDeltas);
      const breakEven = computeBreakEven(adjusted);
      return {
        adjusted,
        breakEvenVolume: breakEven.reachable ? breakEven.volumeUnits : null,
        error: null as string | null,
      };
    } catch {
      return {
        adjusted: null,
        breakEvenVolume: null,
        error: "Ces reglages donnent des valeurs impossibles (prix ou couts a zero). Ajuste un curseur.",
      };
    }
  }, [currency, hypotheses, whatIfDeltas]);

  const projection = useMemo(() => {
    if (!adjusted || seasonalityProfile === "stable") return null;
    return computeAnnualProjection(adjusted, seasonalityProfile);
  }, [adjusted, seasonalityProfile]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <h1 className="text-center text-h2-mobile font-semibold md:text-h2">Et si... ?</h1>
      <p className="text-center text-body text-text-secondary">
        Bouge les curseurs pour voir l&apos;impact sur ta rentabilite, en temps reel.
      </p>

      <div className="grid gap-4">
        {SLIDER_CONFIG.map((field) => (
          <label key={field.key} className="flex flex-col gap-2 text-small text-text-secondary">
            <span className="flex justify-between">
              <span>{field.label}</span>
              <span className="tabular-nums text-text-primary">
                {whatIfDeltas[field.key] > 0 ? "+" : ""}
                {whatIfDeltas[field.key]}%
              </span>
            </span>
            <input
              type="range"
              min={field.min}
              max={field.max}
              value={whatIfDeltas[field.key]}
              onChange={(e) => onDeltaChange(field.key, Number(e.target.value))}
            />
          </label>
        ))}
      </div>

      <label className="flex flex-col gap-2 text-small text-text-secondary">
        Saisonnalite
        <select
          value={seasonalityProfile}
          onChange={(e) => onSeasonalityChange(e.target.value as SeasonalityProfileKey)}
          className="rounded-lg border border-border bg-surface p-3 text-body text-text-primary"
        >
          {SEASONALITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {error ? (
        <p className="text-small text-error">{error}</p>
      ) : (
        adjusted && (
          <>
            <div className="rounded-2xl border border-border bg-surface p-4">
              <BreakEvenChart
                price={adjusted.price}
                variableCostPerUnit={adjusted.variableCostPerUnit}
                fixedCosts={adjusted.fixedCosts}
                currentVolume={adjusted.volume}
                breakEvenVolume={breakEvenVolume}
                currency={currency}
              />
            </div>
            {projection && (
              <div className="rounded-2xl border border-border bg-surface p-4">
                <MonthlyRevenueChart projection={projection} currency={currency} />
              </div>
            )}
          </>
        )
      )}

      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="text-body font-medium text-text-secondary">
          Retour
        </button>
        <button
          type="button"
          onClick={onNext}
          className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-6 py-3 text-body font-semibold text-white"
        >
          Voir les scenarios
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Vérifier que le projet compile toujours**

Run: `pnpm --filter web lint && pnpm --filter web build`
Expected: succès.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/wizard/StepEtSi.tsx
git commit -m "feat(web): ecran Et si ? avec sliders, saisonnalite et graphiques temps reel"
```

---

## Task 5: `StepScenarios`

**Files:**
- Create: `apps/web/src/components/wizard/StepScenarios.tsx`

**Interfaces:**
- Consumes: `WhatIfDeltas` (Task 2), `ScenarioComparisonChart`/`ScenarioBar` (Task 3), `applyDelta`/`applyScenario`/`computeResult`/`Hypotheses` (package `financial-engine`).
- Produces: `StepScenarios({ hypotheses, currency, whatIfDeltas, onBack })`. Consommé par `commencer/page.tsx` (Task 6).

- [ ] **Step 1: Implémenter `StepScenarios`**

Créer `apps/web/src/components/wizard/StepScenarios.tsx` :

```typescript
"use client";

import { useMemo } from "react";
import { applyDelta, applyScenario, computeResult, type Hypotheses, type ScenarioKey } from "financial-engine";
import type { CurrencyCode, HypothesesInput } from "@/lib/ideas-api";
import type { WhatIfDeltas } from "./wizard-reducer";
import { ScenarioComparisonChart, type ScenarioBar } from "./charts/ScenarioComparisonChart";

const SCENARIO_LABELS: { key: ScenarioKey; label: string }[] = [
  { key: "prudent", label: "Prudent" },
  { key: "realiste", label: "Realiste" },
  { key: "ambitieux", label: "Ambitieux" },
  { key: "crise", label: "Crise" },
];

export function StepScenarios({
  hypotheses,
  currency,
  whatIfDeltas,
  onBack,
}: {
  hypotheses: HypothesesInput;
  currency: CurrencyCode;
  whatIfDeltas: WhatIfDeltas;
  onBack: () => void;
}) {
  const { bars, error } = useMemo(() => {
    const base: Hypotheses = { currency, ...hypotheses };
    try {
      const fixedBars: ScenarioBar[] = SCENARIO_LABELS.map(({ key, label }) => ({
        label,
        estimatedResult: computeResult(applyScenario(base, key)).estimatedResult,
      }));
      const customBar: ScenarioBar = {
        label: "Personnalise",
        estimatedResult: computeResult(applyDelta(base, whatIfDeltas)).estimatedResult,
      };
      return { bars: [...fixedBars, customBar], error: null as string | null };
    } catch {
      return { bars: null, error: "Impossible de calculer les scenarios avec ces reglages." };
    }
  }, [currency, hypotheses, whatIfDeltas]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <h1 className="text-center text-h2-mobile font-semibold md:text-h2">Tes scenarios</h1>
      <p className="text-center text-body text-text-secondary">
        Comment ton idee tient dans differentes situations, y compris tes propres reglages.
      </p>
      {error ? (
        <p className="text-small text-error">{error}</p>
      ) : (
        bars && (
          <div className="rounded-2xl border border-border bg-surface p-4">
            <ScenarioComparisonChart bars={bars} currency={currency} />
          </div>
        )
      )}
      <div className="flex justify-start">
        <button type="button" onClick={onBack} className="text-body font-medium text-text-secondary">
          Retour
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Vérifier que le projet compile toujours**

Run: `pnpm --filter web lint && pnpm --filter web build`
Expected: succès.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/wizard/StepScenarios.tsx
git commit -m "feat(web): ecran Scenarios avec comparaison en barres"
```

---

## Task 6: Câblage final, vocabulaire, vérification bout en bout

**Files:**
- Modify: `apps/web/src/app/commencer/page.tsx`
- Modify: `apps/web/src/components/wizard/WizardProgress.tsx`
- Modify: `apps/web/src/components/wizard/StepHypotheses.tsx`
- Modify: `tasks/TODO.md`
- Modify: `tasks/CHANGELOG.md`

**Interfaces:**
- Consumes: `StepEtSi` (Task 4), `StepScenarios` (Task 5), actions du reducer (Task 2).
- Produces: parcours complet fonctionnel de l'écran Résultats jusqu'à l'écran Scénarios.

Tous les fichiers de cette tâche changent ensemble (le bouton ajouté à l'écran Résultats, le rendu des deux nouveaux écrans, et la mise à jour de l'indicateur de progression forment un seul flux cohérent — un découpage laisserait un état intermédiaire incomplet, par exemple un indicateur de progression qui ne connaît pas les nouveaux écrans).

- [ ] **Step 1: Mettre à jour `WizardProgress.tsx`**

**Piège identifié en écrivant ce plan** : `WizardProgress` utilise `STEPS.findIndex((s) => s.key === currentStep)`. Sans cette mise à jour, `currentStep` valant `"et-si"` ou `"scenarios"` donnerait `findIndex` = -1, et **tous** les indicateurs resteraient affichés comme "non atteints" — un bug silencieux, pas une erreur de compilation.

Modifier `apps/web/src/components/wizard/WizardProgress.tsx` :

```typescript
import type { WizardStep } from "./wizard-reducer";

const STEPS: { key: WizardStep; label: string }[] = [
  { key: "business-type", label: "Type" },
  { key: "description", label: "Description" },
  { key: "hypotheses", label: "Hypotheses" },
  { key: "results", label: "Resultats" },
  { key: "et-si", label: "Et si ?" },
  { key: "scenarios", label: "Scenarios" },
];

export function WizardProgress({ currentStep }: { currentStep: WizardStep }) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <ol className="flex flex-wrap items-center justify-center gap-2 text-micro font-medium tracking-micro text-text-secondary">
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

Seul changement de logique : `flex` → `flex flex-wrap` sur le `<ol>`, pour que 6 étapes ne débordent pas sur mobile (à vérifier visuellement à l'étape 6 de cette tâche).

- [ ] **Step 2: Reformuler le vocabulaire de `StepHypotheses.tsx`**

Modifier `apps/web/src/components/wizard/StepHypotheses.tsx`, remplacer le tableau `FIELDS` :

```typescript
const FIELDS: { key: keyof HypothesesInput; label: string }[] = [
  { key: "price", label: "A combien tu vends une unite ?" },
  { key: "volume", label: "Combien tu penses en vendre par mois ?" },
  { key: "variableCostPerUnit", label: "Combien ca te coute de produire ou fournir une unite ?" },
  { key: "fixedCosts", label: "Tes charges fixes chaque mois (loyer, salaires, abonnements...)" },
];
```

(Le reste du fichier, y compris `HINTS` par modèle de business, ne change pas.)

- [ ] **Step 3: Câbler les deux nouveaux écrans dans `commencer/page.tsx`**

Modifier `apps/web/src/app/commencer/page.tsx` :

```typescript
"use client";

import { useReducer, useState } from "react";
import { WizardProgress } from "@/components/wizard/WizardProgress";
import { StepBusinessType } from "@/components/wizard/StepBusinessType";
import { StepDescription } from "@/components/wizard/StepDescription";
import { StepHypotheses } from "@/components/wizard/StepHypotheses";
import { StepResults } from "@/components/wizard/StepResults";
import { StepEtSi } from "@/components/wizard/StepEtSi";
import { StepScenarios } from "@/components/wizard/StepScenarios";
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
        <div className="flex flex-col items-center gap-8">
          <StepResults result={response.result} breakEven={response.breakEven} />
          <button
            type="button"
            onClick={() => dispatch({ type: "GO_TO_STEP", step: "et-si" })}
            className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-6 py-3 text-body font-semibold text-white"
          >
            Explorer &quot;Et si ?&quot;
          </button>
        </div>
      )}

      {state.step === "et-si" && (
        <StepEtSi
          hypotheses={state.hypotheses}
          currency={state.currency}
          whatIfDeltas={state.whatIfDeltas}
          seasonalityProfile={state.seasonalityProfile}
          onDeltaChange={(key, value) => dispatch({ type: "SET_WHAT_IF_DELTA", key, value })}
          onSeasonalityChange={(profile) => dispatch({ type: "SET_SEASONALITY_PROFILE", profile })}
          onNext={() => dispatch({ type: "GO_TO_STEP", step: "scenarios" })}
          onBack={() => dispatch({ type: "GO_TO_STEP", step: "results" })}
        />
      )}

      {state.step === "scenarios" && (
        <StepScenarios
          hypotheses={state.hypotheses}
          currency={state.currency}
          whatIfDeltas={state.whatIfDeltas}
          onBack={() => dispatch({ type: "GO_TO_STEP", step: "et-si" })}
        />
      )}
    </main>
  );
}
```

- [ ] **Step 4: Vérifier lint + build**

Run: `pnpm --filter web lint && pnpm --filter web build`
Expected: succès.

- [ ] **Step 5: Vérification manuelle bout en bout (Playwright, faite par le contrôleur lui-même)**

Prérequis : `docker compose up -d`, API et web démarrés (l'utilisateur peut déjà avoir ces serveurs actifs — vérifier avec `curl` avant d'en relancer d'autres sur les mêmes ports).

1. Parcours complet jusqu'à Résultats (type, description, hypothèses avec des valeurs simples type prix 5000/volume 50/coût variable 2000/coûts fixes 100000, XOF).
2. Clic "Explorer Et si ?" → vérifier l'écran "Et si ?" avec les 4 sliders à 0%, le sélecteur "Stable toute l'année", et le graphique de seuil affichant une marge de -100000 à volume 0 remontant à travers zéro vers le volume courant (50).
3. Bouger le slider prix vers le haut → vérifier que le graphique se met à jour immédiatement (pas de latence réseau visible).
4. Choisir un profil de saisonnalité non-stable (ex. "Pic en fin d'année") → vérifier l'apparition du graphique mensuel, avec des valeurs de revenu qui varient mois par mois.
5. Repasser à "Stable" → vérifier la disparition du graphique mensuel.
6. Clic "Voir les scénarios" → vérifier les 5 barres (Prudent/Réaliste/Ambitieux/Crise/Personnalisé), la barre Personnalisé doit correspondre aux réglages laissés sur l'écran précédent.
7. Vérifier `console --errors` : 0 erreur sur tout le parcours, y compris en poussant les sliders à leurs bornes min/max.
8. Vérifier visuellement l'indicateur de progression (6 étapes) sur mobile (largeur réduite) : pas de débordement grâce à `flex-wrap`.

- [ ] **Step 6: Mettre à jour `tasks/TODO.md` et `tasks/CHANGELOG.md`**

Dans `tasks/TODO.md`, remplacer la ligne Phase 5b (actuellement `- [ ] Phase 5b — écrans...`) par :

```markdown
- [x] Phase 5b — écrans "Et si ?"/"Scénarios" (`apps/web/src/components/wizard/StepEtSi.tsx`, `StepScenarios.tsx`), graphiques Recharts (`apps/web/src/components/wizard/charts/`), recalcul temps réel côté navigateur via le package `financial-engine` (Phase 5a). Vocabulaire de l'écran Hypothèses reformulé (dette Phase 4 close). Voir `docs/superpowers/specs/2026-09-20-phase-5b-et-si-scenarios-design.md`.
```

Dans `tasks/CHANGELOG.md`, ajouter en haut du fichier (après le titre `# CHANGELOG.md`) :

```markdown
## [Non versionné], Phase 5b : écrans "Et si ?" / "Scénarios"
- Deux nouveaux écrans du wizard, juste après l'aperçu : "Et si ?" (4 sliders en pourcentage + sélecteur de saisonnalité + graphique de seuil de rentabilité en temps réel + graphique mensuel conditionnel) et "Scénarios" (comparaison en barres des 4 scénarios prédéfinis + un scénario "Personnalisé" qui reprend les réglages de l'écran précédent).
- `apps/web` consomme directement le package `financial-engine` (Phase 5a) : aucun aller-retour réseau, recalcul instantané à chaque interaction.
- Graphiques Recharts (`apps/web/src/components/wizard/charts/`) : palette et grille reprises telles quelles de `design/COLORS.md`/`design/COMPONENTS.md`, tooltips + texte alternatif sur chaque graphique.
- Vocabulaire de l'écran Hypothèses reformulé en questions directes plutôt qu'en termes comptables (dette notée depuis la Phase 4, `design/UX_PRINCIPLES.md`).
- Vérification bout en bout manuelle (Playwright) : recalcul en direct des sliders, apparition/disparition du graphique mensuel selon la saisonnalité, cohérence du scénario "Personnalisé", 0 erreur console.
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/commencer/page.tsx apps/web/src/components/wizard/WizardProgress.tsx apps/web/src/components/wizard/StepHypotheses.tsx tasks/TODO.md tasks/CHANGELOG.md
git commit -m "feat(web): cable Et si ?/Scenarios, reformule le vocabulaire des Hypotheses"
```

---

## Après ce plan

- Prochaine étape naturelle : Phase 6-7 (écran d'offre à 1 000 FCFA, intégration FedaPay, rapport final) — nouveau brainstorm dédié.
- Décision séparée à traiter plus tard, explicitement hors scope ici : reparler avec l'IA en langage naturel pour ajuster les hypothèses.
- Si l'expérience manuelle (Task 6, Step 5) révèle des bornes de sliders peu réalistes, les ajuster est un changement d'une ligne dans `SLIDER_CONFIG` (`StepEtSi.tsx`), pas une nouvelle décision structurante.
