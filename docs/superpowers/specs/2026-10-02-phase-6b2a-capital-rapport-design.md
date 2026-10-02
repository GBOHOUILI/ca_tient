# Phase 6b-2a — Capital et rapport complet — Design

Date : 2026-10-02
Statut : à relire avant plan d'implémentation.
Précédent : Phase 6b-1 (`2026-09-26-phase-6b1-acces-paiement-design.md`). Suite : Phase 6b-2b (analytics), spec séparée.

## Contexte et objectif

La 6b-1 a mis l'analyse payante (« Et si ? », « Scénarios ») derrière un paiement confirmé par le serveur. La décision du 2026-09-20 (`docs/DECISIONS.md`) prévoit d'y ajouter un **écran capital** et un **rapport complet** : synthèse, capital et besoin financier, business model canvas en 9 blocs, variables sensibles, points à surveiller (`docs/USER_FLOWS.md` #11, `docs/MVP_SCOPE.md`, `docs/SPECIFICATIONS.md` « Rapport final »).

Objectif de la 6b-2a : après paiement, l'utilisateur saisit ses dépenses de départ et le capital dont il dispose, puis consulte un rapport complet servi par l'API, qu'il peut imprimer ou enregistrer en PDF depuis son navigateur.

Critères de succès :
- tout chiffre du rapport vient du moteur déterministe (`CLAUDE.md` #3), y compris le capital nécessaire et le besoin de financement ;
- sans paiement confirmé, l'API ne renvoie ni le rapport ni n'accepte la saisie du capital ;
- une panne ou une réponse non conforme de l'IA ne bloque jamais le rapport ;
- le rapport s'imprime proprement (une colonne, thème clair, pas de bouton ni de navigation, pas de bloc coupé entre deux pages).

## Décisions

| Sujet | Décision |
|---|---|
| Découpage | 6b-2a = capital + rapport complet (cette spec). 6b-2b = analytics, spec séparée. |
| Capital nécessaire | **Investissement de départ + réserve de trésorerie de 3 mois de charges fixes.** Besoin de financement = max(0, capital nécessaire − capital disponible) ; sinon excédent = capital disponible − capital nécessaire. Le moteur n'a pas de montée en charge : un cumul des pertes jusqu'au point mort vaudrait 0 dès que le mois type est rentable, d'où une réserve forfaitaire, simple à expliquer. |
| Saisie | **4 postes fixes** (matériel/équipement, stock de départ, frais d'ouverture, autres) + **capital déjà disponible**. Pas de lignes libres. |
| Forme du rapport | **Page web imprimable** dans `/analyse/[id]`, `window.print()` + feuille de style `@media print`. Pas de génération PDF côté serveur, aucune dépendance ajoutée. |
| Variables sensibles | Calculées : ±10 % sur chacune des 4 hypothèses, classées par impact sur le résultat mensuel. |
| Points à surveiller | Règles déterministes renvoyant des codes ; le texte français est côté web. |
| Synthèse | **Rédigée par l'IA à partir de faits qualitatifs issus du moteur**, rejetée si elle contient un chiffre, repli sur une synthèse modèle. Seule une synthèse IA est stockée. |

## Moteur financier (`packages/financial-engine`)

Trois fonctions pures, nouveaux fichiers `capital.ts`, `sensitivity.ts`, `watch-points.ts`, exportées par `index.ts`. Montants : entiers dans la plus petite unité de la devise, comme le reste du package.

### `computeCapitalNeed(hypotheses, capital)`

Entrée `capital` : `{ equipment, initialStock, openingCosts, other, availableCapital }` (entiers ≥ 0).

Sortie :
```ts
{
  currency,
  startupCosts,        // equipment + initialStock + openingCosts + other
  cashReserve,         // CASH_RESERVE_MONTHS (= 3) × hypotheses.fixedCosts
  capitalNeeded,       // startupCosts + cashReserve
  availableCapital,
  financingGap,        // max(0, capitalNeeded − availableCapital)
  surplus,             // max(0, availableCapital − capitalNeeded)
}
```
Validation : même politique que `assertValidHypotheses` (entiers, ≥ 0, pas au-delà de `Number.MAX_SAFE_INTEGER` après addition), erreur typée du package sinon.

### `computeSensitivity(hypotheses)`

Pour chaque hypothèse `price`, `volume`, `variableCostPerUnit`, `fixedCosts` : résultat estimé avec `applyDelta(+10)` et `applyDelta(−10)` (fonction existante), écart avec le résultat de base.

Sortie : tableau de 4 éléments `{ key, resultIfUp, resultIfDown, impact }`, où `impact = max(|resultIfUp − base|, |resultIfDown − base|)`, trié par `impact` décroissant (à égalité, ordre fixe : price, volume, variableCostPerUnit, fixedCosts). Une hypothèse à 0 a un impact de 0 et reste dans la liste.

### `computeWatchPoints(hypotheses, capitalNeed | null)`

Renvoie la liste des codes déclenchés, dans cet ordre :

| Code | Règle |
|---|---|
| `non_positive_unit_margin` | prix − coût variable unitaire ≤ 0 |
| `below_break_even` | marge unitaire > 0 et volume < seuil de rentabilité |
| `thin_gross_margin` | CA > 0 et marge brute < 20 % du CA (`THIN_MARGIN_PERCENT`) |
| `prudent_scenario_loss` | résultat estimé du scénario prudent < 0 et résultat de base ≥ 0 |
| `financing_gap` | `capitalNeed` fourni et `financingGap` > 0 |
| `no_cash_reserve` | `capitalNeed` fourni, `availableCapital` < `startupCosts` (le capital ne couvre même pas l'investissement, donc aucune réserve) |

Les comparaisons de pourcentage se font en entiers (`grossMargin × 100 < revenue × 20`), sans flottant. Constantes et seuils documentés dans `docs/FINANCIAL_ENGINE.md`.

### Blocs calculés du canvas

« Structure de coûts » et « Flux de revenus » ne sont pas stockés : le rapport les construit à partir des hypothèses et de `computeResult` (coût variable unitaire, charges fixes mensuelles, investissement de départ si saisi ; prix, volume, CA mensuel).

## Données (Prisma)

Deux modèles reliés à `Idea` (relation 1-1, `ideaId` unique, `onDelete: Cascade`), migration dédiée :

```prisma
model CapitalPlan {
  id               String   @id @default(cuid())
  ideaId           String   @unique
  equipment        Int
  initialStock     Int
  openingCosts     Int
  other            Int
  availableCapital Int
  updatedAt        DateTime @updatedAt
  idea             Idea     @relation(fields: [ideaId], references: [id], onDelete: Cascade)
}

model ReportSummary {
  id          String   @id @default(cuid())
  ideaId      String   @unique
  text        String
  factsHash   String   // SHA-256 des faits envoyés à l'IA
  createdAt   DateTime @default(now())
  idea        Idea     @relation(fields: [ideaId], references: [id], onDelete: Cascade)
}
```
Montants en `Int`, comme `Hypothesis.value` : en Postgres, plafond de 2 147 483 647 (plus de 2 milliards de FCFA), d'où le `@Max` du DTO ci-dessous.

## API

Toutes les routes passent par `IdeaAccessGuard` (jeton d'accès, 401 sinon). Un nouveau garde `PaidIdeaGuard` (dans `IdeasModule`) renvoie **403** si `Idea.paidAt` est nul.

### `PUT /ideas/:id/capital`
- Corps : `CapitalPlanDto` `{ equipment, initialStock, openingCosts, other, availableCapital }`, chaque champ `@IsInt() @Min(0) @Max(2_147_483_647)` (plafond de la colonne `Int`). `HypothesesDto` n'a pas de `@Max` aujourd'hui : dette notée dans `tasks/TODO.md`, hors scope ici.
- `upsert` du `CapitalPlan`, réponse `{ capitalNeed }` (sortie de `computeCapitalNeed`).
- Nouveau `ReportService` (dans `IdeasModule`) qui porte la logique ; `IdeasController` reste fin.

### `GET /ideas/:id/report`
Assemble le rapport côté serveur :
```ts
{
  idea: { id, businessModel, rawDescription, currency },
  hypotheses,                    // prix, volume, coût variable, charges fixes
  result, breakEven,             // computeResult / computeBreakEven
  scenarios,                     // 4 × { key, result } via applyScenario
  capital: { plan, need } | null,
  sensitivity,                   // computeSensitivity
  watchPoints,                   // codes, computeWatchPoints
  canvas: { valueProposition, …7 blocs stockés, costStructure, revenueStreams },
  summary: { text, source: "ai" | "template" },
}
```
Les deux blocs calculés du canvas sont renvoyés sous forme de données (montants + libellés de clé), mis en phrase côté web.

### Synthèse
- Faits envoyés à l'IA (aucun montant) : modèle de business, verdict (`estimatedResult ≥ 0`), seuil atteignable ou non, codes des points à surveiller, clés des 2 variables les plus sensibles, besoin de financement oui/non/non renseigné, extraits des blocs « proposition de valeur » et « segments clients ».
- `factsHash` = SHA-256 de ces faits sérialisés de façon stable. Si un `ReportSummary` existe avec le même hash, il est réutilisé ; sinon l'IA est appelée.
- Nouvelle méthode `writeReportSummary(facts): Promise<string | null>` sur le port `AiProvider`, implémentée par la chaîne existante (`FallbackAiProvider`, Gemini → Groq → Mistral, prompts dans `ai-prompts.ts`). Consigne : 3 à 5 phrases, tutoiement, vocabulaire simple, aucun chiffre, aucune promesse de rentabilité.
- Garde-fou : réponse rejetée (traitée comme `null`) si vide, > 1 200 caractères, ou si elle contient un chiffre (`/\d/`). `null` → synthèse modèle assemblée côté API à partir du verdict et des points à surveiller, **non stockée**, `source: "template"`.
- La génération se fait au `GET /report` (paresseuse) ; le délai par tentative IA existant (8 s) s'applique.

## Frontend (`apps/web`)

### Parcours `/analyse/[id]`
Et si ? → Scénarios → **Ton capital** → **Ton rapport**. Le bouton de l'écran Scénarios mène au capital. À une nouvelle visite d'une idée payée qui a déjà un `CapitalPlan`, la page ouvre directement le rapport ; le rapport a un lien « Modifier mon capital » et un lien vers « Et si ? ».

### `StepCapital.tsx`
- Cinq champs montant (mêmes composants et formatage que `StepHypotheses`), pré-remplis à 0 ou avec le plan existant :
  - « Combien pour le matériel ou l'équipement ? »
  - « Combien pour ton stock de départ ? »
  - « Combien pour ouvrir (local, démarches, site) ? »
  - « Autres dépenses de départ ? »
  - « Combien as-tu déjà de côté pour ce projet ? »
- Récapitulatif en direct (via `computeCapitalNeed` du package, comme « Et si ? ») : investissement + réserve de 3 mois de charges = capital nécessaire ; puis « Il te manque X » ou « Tu as X de marge ».
- « Voir mon rapport » → `PUT /ideas/:id/capital` → rapport. Échec → message + nouvel essai, saisie conservée.

### `ReportView.tsx`
Une page, dans cet ordre :
1. Synthèse + rappel « Ca tient ? est une aide à la décision, pas une garantie de rentabilité ».
2. Chiffres clés : CA, marge brute, résultat estimé, seuil de rentabilité.
3. Capital et besoin financier (ou encart « Complète ton capital » si `capital` est `null`).
4. Scénarios en tableau (résultat estimé par scénario).
5. Variables sensibles, classées, avec phrase type « Si ton prix baisse de 10 %, ton résultat passe à X ».
6. Points à surveiller (texte par code, `report-copy.ts`).
7. Business model canvas en 9 blocs (grille, 1 colonne en mobile et à l'impression).

Bouton « Imprimer / Enregistrer en PDF » → `window.print()`. Feuille `@media print` : masque en-tête, pied, boutons et navigation ; force les tokens du thème clair ; `break-inside: avoid` sur chaque section et bloc. Uniquement les tokens et composants de `design/` (`CLAUDE.md` #8).

### Autres
- `ideas-api.ts` : `saveCapital()`, `fetchReport()`, types de réponse.
- `StepOffer.tsx` : « Bientôt inclus : ton rapport complet… » devient « Inclus ».

## Gestion des erreurs

| Cas | Comportement |
|---|---|
| Rapport demandé sans capital saisi | Rapport affiché, section 3 remplacée par l'encart « Complète ton capital ». |
| Idée non payée | 403 ; le front ne montre de toute façon ces écrans qu'après `paid` (vue paiement existante). |
| IA en panne, lente ou réponse rejetée | Synthèse modèle, aucun message d'erreur côté utilisateur. |
| Échec du `PUT` capital | Message + nouvel essai, rien n'est perdu. |
| Échec du `GET` rapport | Vue « Service momentanément indisponible » existante, bouton « Réessayer ». |

## Tests

- **Moteur (vitest, TDD)** : `computeCapitalNeed` (tout à 0, charges fixes à 0, besoin, excédent, égalité exacte, dépassement de `MAX_SAFE_INTEGER`, valeur négative/non entière rejetée) ; `computeSensitivity` (classement, égalités, hypothèse à 0, marge nulle) ; `computeWatchPoints` (chaque règle déclenchée et non déclenchée, `capitalNeed` nul, seuil de 20 % pile).
- **API (base de test dédiée)** : 401 sans jeton, 403 sans paiement sur les deux routes, validation de `CapitalPlanDto`, upsert du capital, contenu du rapport avec et sans capital, synthèse IA stockée puis réutilisée, régénérée si les faits changent.
- **Synthèse** : réponse IA contenant un chiffre → modèle ; IA `null` → modèle non stocké ; prompt sans montant.
- **Bout en bout (navigateur, serveurs de vérification 3011/3012)** : paiement avec `PAYMENT_PROVIDER=test`, capital, rapport, aperçu d'impression, 0 erreur console.

## Documentation à mettre à jour

`docs/DECISIONS.md` (formule du capital, seuils des points à surveiller, garde-fou « aucun chiffre » de la synthèse), `docs/FINANCIAL_ENGINE.md`, `docs/API.md`, `docs/USER_FLOWS.md`, `docs/AI_ENGINE.md`, `tasks/TODO.md`, `tasks/CHANGELOG.md`.

## Hors scope

Analytics (6b-2b), plan de lancement post-analyse (V2), PDF généré côté serveur, historique multi-analyses, montée en charge mois par mois, lignes de dépenses libres, i18n.
