# Phase 5a, moteur financier — projection annuelle avec saisonnalité

Statut : validé en discussion, en attente de relecture du document avant plan d'implémentation.

## Contexte

`docs/USER_FLOWS.md` écrans 6-7 ("Et si… ?" et "Scénarios") et `docs/MVP_SCOPE.md` placent ce module juste avant l'offre de paiement (écran 8) — c'est le moment du parcours censé produire l'« effet wouh » qui donne envie de payer 1 000 FCFA. `docs/SPECIFICATIONS.md` liste "publicité" et "saisonnalité" parmi les leviers du module "Et si ?", aux côtés de prix/volume/coûts déjà couverts par le moteur (Phase 2).

Le moteur financier (`apps/api/src/financial-engine/`) calcule aujourd'hui un instantané mensuel unique (`computeResult`, `computeBreakEven`) et supporte 4 scénarios + deltas personnalisés (`scenarios.ts`, `applyScenario`/`applyDelta`, 31 tests, livré Phase 2). Il ne modélise aucune variation dans le temps.

Cette phase est scindée en deux (décision prise en brainstorming) :
- **Phase 5a (ce document)** : extension pure du moteur pour une projection annuelle avec saisonnalité, sans aucune UI. Livrable indépendant et testable seul, comme la Phase 2 l'a été avant la Phase 3.
- **Phase 5b (à venir)** : écrans "Et si ?"/"Scénarios", graphiques (Recharts), recalcul temps réel, simplification du vocabulaire — construite sur ce que produit la Phase 5a.

## Décisions actées dans cette session

- **La saisonnalité est un levier de plus sur le volume, avec la mécanique déjà existante des scénarios** (`applyDelta`, pourcentage de variation), pas une nouvelle abstraction de calcul. Le prix et les coûts restent constants sur les 12 mois — seul le volume varie mois par mois. Rejeté : redéfinir prix/coûts par mois (non demandé par `docs/SPECIFICATIONS.md`, complexité inutile).
- **Saisie par profils prédéfinis, pas par 12 curseurs manuels.** Un porteur de projet pas encore lancé n'a pas de vraies données mensuelles ; des profils nommés (voir section Profils) restent compréhensibles sans jargon et cohérents avec le rôle du produit ("aide à la décision", `docs/SPECIFICATIONS.md` § Rapport final).
- **Chaque profil est un tableau de 12 pourcentages de variation dont la moyenne fait 0.** La saisonnalité redistribue dans l'année le volume mensuel déjà renseigné par l'utilisateur (écran 4), elle ne change pas silencieusement le total annuel implicite.
- **Composable avec les scénarios, pas exclusif.** Un scénario (prudent/réaliste/ambitieux/crise) ajuste d'abord la base comme aujourd'hui (`applyScenario`), puis la saisonnalité s'applique par-dessus, mois par mois, sur cette base déjà ajustée.
- **Le seuil de rentabilité reste calculé une fois sur les hypothèses de base (éventuellement ajustées par le scénario), jamais dérivé de la courbe mensuelle.** Pas de notion de "seuil cumulé" — non demandée, ajouterait de la complexité (gestion de trésorerie cumulée sur l'année) hors du périmètre actuel du moteur (`docs/FINANCIAL_ENGINE.md` ne définit le seuil qu'en instantané mensuel).
- **Aucune persistance, aucun nouvel endpoint HTTP.** Comme le reste du moteur, la fonction est pure (pas d'I/O). L'exploration "Et si ?"/Scénarios est éphémère côté utilisateur (Phase 5b) ; ce qui est payé et conservé, c'est le rapport final (Phase 6-7), hors scope ici.
- **Extraction du moteur en package partagé du monorepo** (`packages/financial-engine`), consommé en TypeScript source directement (pas de step de build séparé à maintenir pour un package interne jamais publié). Nécessaire pour que la Phase 5b recalcule côté navigateur sans aller-retour réseau (déjà justifié en brainstorming par `design/UX_PRINCIPLES.md` : "connexions parfois lentes" en Afrique de l'Ouest). Décision structurante consignée dans `docs/DECISIONS.md`.
  **Correction par rapport à la spec** : cette décision a été inversée pendant le planning — le build `tsc` d'`apps/api` ne peut pas résoudre/émettre le `.ts` source brut d'un package workspace externe sans un vrai step de build. Le package se construit finalement via `tsc -p tsconfig.build.json` (même mécanisme qu'`apps/api`), voir `docs/DECISIONS.md`.

## Architecture

### Déplacement vers `packages/financial-engine` (nom de package : `financial-engine`)

Fichiers déplacés tels quels (déjà 100% purs, zéro dépendance NestJS) :
- `financial-engine.types.ts`
- `financial-engine.errors.ts`
- `financial-engine.validation.ts`
- `scenarios.ts`

**Correction importante par rapport à une première lecture rapide du code existant** : `computeResult`/`computeBreakEven` ne sont *pas* des fonctions pures autonomes aujourd'hui — ce sont des méthodes de la classe `@Injectable() FinancialEngineService` (`apps/api/src/financial-engine/financial-engine.service.ts`), qui n'a jamais été conçue pour être importée hors NestJS. Pour que `computeAnnualProjection` (pure) puisse les appeler, et pour que la Phase 5b les importe côté navigateur, leurs corps sont extraits tels quels dans un nouveau fichier pur du package :

- **Nouveau** `financial-engine.calculations.ts` (package) : exporte `computeResult(hypotheses): FinancialResult` et `computeBreakEven(input): BreakEvenResult`, corps identiques à ceux actuellement dans `FinancialEngineService`, aucun changement de logique.

`apps/api/src/financial-engine/financial-engine.service.ts` devient un fin wrapper NestJS délégant au package (`computeResult`/`computeBreakEven` gardent leur signature actuelle pour ne rien casser côté `IdeasService`, plus une nouvelle méthode déléguant à `computeAnnualProjection`) :

```typescript
import { Injectable } from "@nestjs/common";
import { computeResult, computeBreakEven, computeAnnualProjection } from "financial-engine";
import type { BreakEvenResult, FinancialResult, Hypotheses, SeasonalityProfileKey, MonthlyResult } from "financial-engine";

type BreakEvenInput = Pick<Hypotheses, "currency" | "price" | "variableCostPerUnit" | "fixedCosts">;

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

`apps/web` importera `financial-engine` directement en Phase 5b — aucun usage frontend dans cette phase 5a.

### Nouveau fichier `packages/financial-engine/src/seasonality.ts`

```typescript
import { applyDelta } from "./scenarios.js";
import { computeResult } from "./financial-engine.calculations.js";
import type { Hypotheses, FinancialResult } from "./financial-engine.types.js";

export type SeasonalityProfileKey = "stable" | "fetes_fin_annee" | "ete" | "rentree_scolaire";

export interface MonthlyResult {
  month: number; // 1 = janvier ... 12 = décembre
  result: FinancialResult;
}

// Pourcentages de variation du volume par mois (moyenne = 0), points de départ
// à calibrer précisément dans le plan d'implémentation — même statut que
// SCENARIO_DELTAS dans scenarios.ts ("un point de départ, à valider").
export const SEASONALITY_PROFILES: Record<SeasonalityProfileKey, number[]> = {
  stable: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  fetes_fin_annee: [/* creux janvier-fevrier, pic novembre-decembre, moyenne 0 */],
  ete: [/* pic juin-aout, creux reste de l'annee, moyenne 0 */],
  rentree_scolaire: [/* pic septembre-octobre, creux reste de l'annee, moyenne 0 */],
};

export function computeAnnualProjection(base: Hypotheses, profile: SeasonalityProfileKey): MonthlyResult[] {
  return SEASONALITY_PROFILES[profile].map((percent, index) => ({
    month: index + 1,
    result: computeResult(applyDelta(base, { volume: percent })),
  }));
}
```

Note : `applyDelta` valide déjà chaque mois via `assertValidHypotheses` (hérité, aucun changement) — un profil qui pousserait un mois à un volume invalide (négatif, non entier) lève la même `FinancialEngineInputError` qu'aujourd'hui pour un scénario invalide, gérée par l'appelant (Phase 5b). La méthode `FinancialEngineService.computeAnnualProjection` correspondante est déjà montrée dans le bloc `FinancialEngineService` complet ci-dessus.

## Hors scope (rappel)

- Écrans "Et si ?"/"Scénarios", graphiques, recalcul temps réel côté navigateur → Phase 5b.
- Nouvel endpoint HTTP exposant la projection annuelle → pas nécessaire, le package est consommé directement par le frontend en Phase 5b (voir décision "recalcul temps réel" du brainstorming).
- Seuil de rentabilité cumulé sur l'année.
- Saisie manuelle d'un profil de saisonnalité personnalisé (12 curseurs) — seulement les 4 profils prédéfinis.
- Persistance des explorations "Et si ?"/scénarios en base.
- Modélisation de la publicité comme levier séparé (déjà absorbable dans coûts fixes/variables existants, cf. `docs/superpowers/specs/2026-09-19-phase-3-parcours-utilisateur-design.md`).

## Tests

TDD, même exigence que le reste du moteur (`skills/testing.md`, aucun mock — fonctions pures) :
- `computeAnnualProjection` retourne bien 12 `MonthlyResult`, mois 1 à 12 dans l'ordre.
- Profil `stable` : les 12 mois sont identiques au résultat de base (`computeResult(base)`).
- Un profil non-stable : vérifier qu'au moins un mois est au-dessus et un mois en dessous du résultat de base (la saisonnalité redistribue bien, ne se contente pas d'ajouter).
- Composition avec un scénario : `computeAnnualProjection(applyScenario(base, "prudent"), "fetes_fin_annee")` correspond à appliquer la saisonnalité sur la base déjà ajustée par le scénario prudent (pas sur la base brute).
- Cas limite : un profil dont un mois pousserait le volume à une valeur invalide lève `FinancialEngineInputError`, comme un scénario invalide aujourd'hui.
- Non-régression : les 31 tests existants du moteur passent toujours après le déplacement vers `packages/financial-engine` (import paths mis à jour, comportement inchangé).

## Risques / points d'attention

- Les coefficients exacts des 3 profils non-stables (`fetes_fin_annee`, `ete`, `rentree_scolaire`) sont des points de départ à calibrer dans le plan, pas des données validées par un expert métier — même statut d'incertitude assumée que `SCENARIO_DELTAS` (`scenarios.ts` le documente déjà explicitement).
- Extraire `apps/api/src/financial-engine/` vers un package pnpm workspace est une opération mécanique bien connue dans ce type de monorepo, mais touche la configuration TypeScript des deux apps (`tsconfig.json`, résolution de modules) — à vérifier avec `pnpm --filter api build` et `pnpm --filter web build` après le déplacement, pas seulement les tests unitaires.
