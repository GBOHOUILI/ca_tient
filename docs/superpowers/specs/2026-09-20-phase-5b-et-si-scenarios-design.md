# Phase 5b, écrans "Et si ?" / "Scénarios"

Statut : validé en discussion, en attente de relecture du document avant plan d'implémentation.

## Contexte

`docs/USER_FLOWS.md` écrans 6 ("Et si… ?") et 7 ("Scénarios") arrivent juste après l'aperçu (écran 5, livré Phase 3-4) et juste avant l'offre de paiement (écran 8, Phase 6-7, hors scope ici). `docs/MVP_SCOPE.md` les liste explicitement dans le périmètre MVP. C'est le moment du parcours censé produire l'« effet wouh » qui donne envie de payer 1 000 FCFA — objectif explicite de cette session.

Phase 5a (livrée, mergée) a extrait le moteur financier dans un package partagé du monorepo (`packages/financial-engine`, JS compilé, zéro dépendance NestJS) et lui a ajouté `computeAnnualProjection` (projection sur 12 mois avec 4 profils de saisonnalité prédéfinis). Cette phase construit l'UI qui consomme ce package **directement côté navigateur**, sans aucun aller-retour réseau — décision déjà actée en Phase 5a, justifiée par `design/UX_PRINCIPLES.md` ("connexions parfois lentes" en Afrique de l'Ouest).

Cette session regroupe aussi la dette UX notée dans `tasks/TODO.md` depuis la Phase 4 : le vocabulaire de l'écran Hypothèses (`StepHypotheses.tsx`) est trop jargonneux pour `design/UX_PRINCIPLES.md` ("le vocabulaire est simple, jamais jargonneux").

## Décisions actées dans cette session

- **Deux écrans séparés et séquentiels**, pas un écran combiné — colle à `docs/USER_FLOWS.md`, garde chaque écran simple et focalisé (objectif d'accessibilité explicite de l'utilisateur).
- **Navigation** : Résultats (5, inchangé) → bouton « Explorer "Et si ?" » → **Et si ?** (6) → bouton « Voir les scénarios » → **Scénarios** (7, fin du scope Phase 5b). Bouton Retour sur chaque nouvel écran, comme le reste du wizard.
- **Les 4 sliders de "Et si ?" sont des pourcentages de variation**, pas des valeurs absolues — réutilise exactement `applyDelta`/`SensitivityDelta` du package (même mécanique que les scénarios), pas une nouvelle notion de calcul.
- **La saisonnalité est un levier de plus dans "Et si ?"**, pas reportée à un futur lot : sélecteur des 4 profils du package, à côté des 4 sliders chiffrés.
- **Deux graphiques distincts sur "Et si ?"**, pas un seul :
  - Graphique de seuil de rentabilité (revenu vs coûts totaux en fonction du volume, marqueur "tu es ici"), toujours visible, réagit en direct aux 4 sliders — correspond exactement à l'exemple déjà décrit dans `design/COMPONENTS.md` § Graphiques.
  - Graphique mensuel compact (revenu par mois, `computeAnnualProjection`), affiché uniquement quand un profil de saisonnalité **non-stable** est choisi (masqué pour "stable", où il serait une ligne plate sans intérêt).
- **Le scénario "Personnalisé" de l'écran "Scénarios" réutilise l'état de l'écran "Et si ?"**, sans dupliquer d'UI de saisie. Correspond littéralement à `docs/SPECIFICATIONS.md` ("scénario personnalisé : l'utilisateur définit ses propres variations") — l'écran "Et si ?" EST la définition du scénario personnalisé.
- **Le scénario "Personnalisé" n'inclut jamais la saisonnalité** : il compare des instantanés mensuels (comme les 4 scénarios prédéfinis), pas une moyenne ou un total annuel. Cohérent avec la décision Phase 5a : le seuil de rentabilité et les comparaisons de scénarios restent des instantanés, jamais dérivés de la courbe mensuelle.
- **Librairie de graphiques : Recharts** (déjà décidé, cohérent avec l'écosystème React 19 du projet).
- **Aucun nouvel appel réseau, aucune nouvelle route API, aucune persistance.** Tout se calcule depuis `state.hypotheses`/`state.currency` déjà en mémoire dans le wizard, via `financial-engine` importé directement dans `apps/web`.
- **Vocabulaire des 4 champs de `StepHypotheses.tsx` reformulé** (dette Phase 4), voir section dédiée.
- **Vérification manuelle par navigateur (Playwright) : le contrôleur de cette session la fait lui-même**, ne se contente pas du rapport d'un sub-agent délégué — leçon retenue de la Phase 4/5a.

## Architecture

### Nouvelle dépendance `apps/web`

`apps/web/package.json` ajoute `"financial-engine": "workspace:*"`. Le package est déjà compilé en JS (`dist/index.js` + `.d.ts`, Phase 5a) — consommation identique à n'importe quelle dépendance `node_modules`, aucune config Next.js particulière nécessaire (pas de `transpilePackages`, ce n'est pas du TypeScript source brut).

Note sur une apparente incohérence avec l'existant : `apps/web/src/lib/ideas-api.ts` redéfinit localement `BusinessModel`/`CurrencyCode` plutôt que de les importer du backend (décision Phase 3, `docs/DECISIONS.md`) — mais ce n'est *pas* le même cas ici. Cette redéfinition existait parce que le type source (`BusinessModel` généré par Prisma) est couplé à `@prisma/client`, impossible à importer dans le frontend sans y traîner une dépendance backend entière. `financial-engine` est justement un package pur, framework-agnostic, conçu pour être partagé tel quel : `apps/web` importe directement ses types (`SeasonalityProfileKey`, `Hypotheses`) et ses fonctions (`applyDelta`, `computeResult`, `applyScenario`, `computeAnnualProjection`) sans redéfinition — c'est exactement le but pour lequel la Phase 5a a été construite.

### État du wizard (`wizard-reducer.ts`)

Nouveaux types/champs, additifs à l'existant (rien de retiré) :

```typescript
export type WizardStep = "business-type" | "description" | "hypotheses" | "results" | "et-si" | "scenarios";

export interface WhatIfDeltas {
  price: number;
  volume: number;
  variableCostPerUnit: number;
  fixedCosts: number;
}

// Réexporté du package financial-engine, pas redéfini localement.
import type { SeasonalityProfileKey } from "financial-engine";

export interface WizardState {
  // ...champs existants inchangés...
  whatIfDeltas: WhatIfDeltas;       // pourcentages, défaut { price: 0, volume: 0, variableCostPerUnit: 0, fixedCosts: 0 }
  seasonalityProfile: SeasonalityProfileKey; // défaut "stable"
}

export type WizardAction =
  // ...actions existantes inchangées...
  | { type: "SET_WHAT_IF_DELTA"; key: keyof WhatIfDeltas; value: number }
  | { type: "SET_SEASONALITY_PROFILE"; profile: SeasonalityProfileKey };
```

Bornes des sliders (pourcentages), choisies pour ne jamais produire d'hypothèses invalides (le prix ne peut jamais atteindre 0, cf. `assertValidHypotheses`) :
- `price` : -50 % à +100 %
- `volume`, `variableCostPerUnit`, `fixedCosts` : -100 % à +200 % (0 est une valeur valide pour ces trois champs)

### Calcul (client-side, package `financial-engine`)

**Correction par rapport à la première rédaction de cette spec** : le graphique de seuil était décrit comme deux lignes (revenu + coût total). En chargeant le skill `dataviz` avant l'implémentation, ça viole sa règle "légende obligatoire dès 2 séries" pour un graphique qui n'en a pas besoin — et surtout, `design/COMPONENTS.md` décrit en réalité **une seule courbe** ("la courbe principale") avec des zones colorées au-dessus/en dessous du seuil, pas deux lignes distinctes. Corrigé en une seule série : la **marge à ce volume** (`margin(volume) = (price - variableCostPerUnit) * volume - fixedCosts`, soit revenu moins coût total), qui vaut exactement `-fixedCosts` à volume 0 et croise zéro très exactement à `breakEven.volumeUnits`. Une seule série → pas de légende nécessaire, direct sur le design system.

Sur l'écran "Et si ?", à chaque changement de slider ou de profil :
1. `const adjusted = applyDelta(baseHypotheses, state.whatIfDeltas)` — recalcul instantané, synchrone.
2. Graphique de seuil : une série `margin` échantillonnée sur un intervalle de volume `[0, domainMax]` (`domainMax = Math.max(adjusted.volume, breakEven.volumeUnits ?? 0) * 2`, plancher à 10 pour rester lisible à faible volume), colorée en deux tons (succès au-dessus de zéro, erreur en dessous) via un dégradé SVG dont le point de bascule est calculé depuis le min/max de la série échantillonnée. `computeBreakEven(adjusted)` donne le point de croisement (`ReferenceLine` verticale, si atteignable) et `adjusted.volume` le marqueur "tu es ici" (autre `ReferenceLine` verticale). Une `ReferenceLine` horizontale à `y=0` sert de ligne de base.
3. Si `state.seasonalityProfile !== "stable"` : `computeAnnualProjection(adjusted, state.seasonalityProfile)` alimente le graphique mensuel compact (une seule série là aussi : revenu par mois).

Sur l'écran "Scénarios" :
- 4 barres depuis `computeResult(applyScenario(baseHypotheses, scenarioKey))` pour chaque `scenarioKey` (`prudent`/`realiste`/`ambitieux`/`crise`).
- 1 barre "Personnalisé" depuis `computeResult(applyDelta(baseHypotheses, state.whatIfDeltas))` (même calcul que le graphique de seuil de l'écran précédent, sans saisonnalité).

`baseHypotheses` = les 4 valeurs de `state.hypotheses` (déjà en mémoire, saisies/confirmées à l'écran Hypothèses) + `state.currency`, jamais modifiées en place — `state.whatIfDeltas`/`state.seasonalityProfile` restent des ajustements appliqués à la volée, jamais persistés dans `state.hypotheses`.

Toute erreur de validation levée par le package (`FinancialEngineInputError`, cas limite non couvert par les bornes de sliders ci-dessus) est attrapée localement dans le composant et affiche un message discret plutôt que de faire planter l'écran — même philosophie de robustesse que le reste du wizard (Phase 4 : une panne ne bloque jamais le parcours).

### Composants

- `apps/web/src/components/wizard/StepEtSi.tsx` — 4 sliders + sélecteur de saisonnalité + les 2 graphiques.
- `apps/web/src/components/wizard/StepScenarios.tsx` — graphique en barres à 5 entrées.
- `apps/web/src/components/wizard/charts/BreakEvenChart.tsx` — Recharts `AreaChart`, une seule série (marge estimée en fonction du volume), remplissage en dégradé `success`/`error` de part et d'autre de zéro, `ReferenceLine` verticale au volume courant ("tu es ici") et au seuil de rentabilité si atteignable, `ReferenceLine` horizontale à zéro, grille discrète (`design/COMPONENTS.md`).
- `apps/web/src/components/wizard/charts/MonthlyRevenueChart.tsx` — Recharts, 12 barres (Jan-Déc), une seule série (revenu mensuel), remplissage `cyan-400` uniforme sur toutes les barres (« highlights de données », usage documenté tel quel dans `design/COLORS.md`) — pas de dégradé par barre, inutilement complexe pour une seule série de données.
- `apps/web/src/components/wizard/charts/ScenarioComparisonChart.tsx` — Recharts, 5 barres (résultat estimé par scénario), couleur par barre selon signe (`success` si ≥ 0, `error` sinon), même logique que les cards de `StepResults.tsx`.

Tokens de couleur réutilisés tels quels depuis `design/COLORS.md`/le CSS existant (`--color-success`, `--color-error`, `--color-accent-emerald`, `--color-accent-cyan`, `--color-border`) — aucune couleur inventée (règle non négociable `CLAUDE.md` #8).

Chaque graphique a un `<Tooltip>` Recharts (survol/point actif) et un texte alternatif porteur de sens (`aria-label` ou légende visible résumant ce que montre le graphique) — exigence déjà documentée dans `design/UX_PRINCIPLES.md` ("textes alternatifs sur tout élément graphique porteur de sens"). Pas de vue tableau alternative pour chaque graphique : les chiffres qu'ils visualisent sont déjà affichés en texte ailleurs dans l'écran (cohérent avec `StepResults.tsx` existant, qui combine déjà cards chiffrées + narration), une double représentation systématique serait de la sur-ingénierie pour la taille de cette fonctionnalité.

## Vocabulaire (dette Phase 4)

Reformulation proposée pour `StepHypotheses.tsx` (les hints par modèle de business, déjà accessibles, restent inchangés) :

| Actuel | Proposé |
|---|---|
| "Prix de vente unitaire" | "À combien tu vends une unité ?" |
| "Volume de ventes par mois" | "Combien tu penses en vendre par mois ?" |
| "Cout variable par unite" | "Combien ça te coûte de produire ou fournir une unité ?" |
| "Couts fixes par mois" | "Tes charges fixes chaque mois (loyer, salaires, abonnements...)" |

Formulations en questions directes plutôt qu'en termes comptables, cohérent avec `design/UX_PRINCIPLES.md` ("on parle à quelqu'un qui a une vraie idée... pas un jargon financier"). Le libellé exact final est confirmé dans le plan d'implémentation, pas figé ici.

## Hors scope (rappel)

- Écran d'offre de paiement (écran 8, Phase 6-7).
- Saisie manuelle d'un profil de saisonnalité personnalisé (12 curseurs) — seulement les 4 profils prédéfinis du package (Phase 5a).
- Seuil de rentabilité cumulé sur l'année.
- Persistance des explorations "Et si ?"/scénarios en base.
- Reparler avec l'IA en langage naturel pour ajuster les hypothèses — décision séparée, à traiter plus tard.
- Modification du levier "publicité" comme champ distinct (déjà absorbable dans coûts fixes/variables, décision actée Phase 3).

## Tests

- Pas de suite de tests automatisée sur `apps/web` (précédent établi depuis la Phase 3) — vérification manuelle uniquement.
- Vérification manuelle par navigateur (Playwright), **faite par le contrôleur de la session lui-même** (pas seulement rapportée par un sub-agent délégué) :
  1. Parcours complet jusqu'à Résultats, clic "Explorer Et si ?".
  2. Écran "Et si ?" : bouger chaque slider, vérifier que le graphique de seuil se met à jour en direct et que le marqueur "tu es ici" bouge.
  3. Choisir un profil de saisonnalité non-stable, vérifier l'apparition du graphique mensuel avec des valeurs cohérentes (recalculées à la main pour un cas simple).
  4. Choisir "stable", vérifier la disparition du graphique mensuel.
  5. Naviguer vers "Scénarios", vérifier les 5 barres (4 fixes + Personnalisé cohérent avec les réglages de l'écran précédent).
  6. Vérifier 0 erreur console sur l'ensemble du parcours, y compris aux valeurs extrêmes des sliders (bornes basses/hautes).
- `pnpm --filter web lint && pnpm --filter web build` doivent rester clean à chaque étape du plan.

## Risques / points d'attention

- Les bornes de sliders (-50%/+100% pour le prix, -100%/+200% pour le reste) sont un choix de confort d'exploration, pas une contrainte du moteur — à ajuster si l'expérience manuelle révèle des valeurs peu réalistes en pratique.
- `MonthlyRevenueChart` masqué/affiché conditionnellement (profil stable vs non-stable) introduit un layout shift sur l'écran "Et si ?" — à vérifier visuellement pendant l'implémentation (transition douce plutôt qu'un saut brutal, sans sur-ingénierie une animation complexe).
