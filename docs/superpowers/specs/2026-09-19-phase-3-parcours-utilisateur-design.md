# Phase 3, parcours utilisateur (formulaire guidé + résultats)

Statut : validé en discussion, en attente de relecture du document avant plan d'implémentation.

## Contexte

`docs/ROADMAP.md` place la Phase 3 après le moteur financier (Phase 2, livré) : "Formulaire guidé + résultats". `docs/USER_FLOWS.md` décrit 10 écrans, dont les écrans 2 à 5 (type de business, description, hypothèses, aperçu) relèvent de cette phase. L'écran 4 (hypothèses) est documenté comme piloté par l'IA (`docs/SPECIFICATIONS.md`), mais l'IA est Phase 4 (non construite). Cette phase construit donc le parcours en saisie manuelle, que la Phase 4 viendra enrichir plus tard sans changer le schéma de données.

`docs/DATABASE.md` fournit une "proposition initiale, pas un schéma figé" que ce document affine et acte pour la partie utile à la Phase 3 (Idea, Hypothesis, Simulation ; User, Payment, Report restent hors scope ici).

## Décisions actées dans cette session

- **Pas de compte utilisateur.** Session anonyme liée à l'id de l'idée. Rien dans `docs/MVP_SCOPE.md` ne mentionne de fonctionnalité de compte ; l'ajouter maintenant serait de la sur-ingénierie non demandée.
- **Formulaire à 4 champs génériques** (prix, volume, coût variable par unité, coûts fixes) pour les 6 modèles de business, plutôt que 6 formulaires détaillés avec agrégation. Les libellés/placeholders s'adaptent au modèle choisi (texte d'aide uniquement, pas de champs supplémentaires). Correspond exactement aux entrées du moteur financier (`apps/api/src/financial-engine/`). La richesse par modèle décrite dans `docs/SPECIFICATIONS.md` (ex. livraison, commissions pour l'e-commerce) est le travail de l'IA en Phase 4, qui remplira ces mêmes 4 champs à partir d'une extraction plus fine, sans changer le contrat.
- **Un seul appel réseau** à la transition hypothèses -> résultats, pas de sauvegarde incrémentale entre les étapes du wizard (état en mémoire côté client). Aucune exigence de reprise de brouillon entre deux visites dans le MVP actuel.

## Schéma de données (Prisma)

```prisma
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
  id      String @id @default(cuid())
  ideaId  String
  idea    Idea   @relation(fields: [ideaId], references: [id], onDelete: Cascade)
  key     String
  label   String
  value   Int
  unit    String?
  source  String

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

Notes :
- `Hypothesis.key` prend l'une des 4 valeurs `price | volume | variableCostPerUnit | fixedCosts` pour l'instant. Reste en clé/valeur (pas 4 colonnes fixes sur `Idea`) pour absorber sans migration les variables libres que l'IA ajoutera en Phase 4 (`docs/FINANCIAL_ENGINE.md`, règle sur les variables non standard).
- `Hypothesis.source` vaut toujours `"utilisateur_saisi"` en Phase 3 (les autres valeurs du `docs/DATABASE.md` original, `ia_suggéré` / `utilisateur_ajouté`, arrivent avec l'IA).
- `Simulation.type` vaut toujours `"apercu"` en Phase 3 (`"analyse_complete"` arrive en Phase 6-7, protégée par le paiement).
- `Simulation.result`/`breakEven` stockent directement la sortie JSON du moteur (`FinancialResult`, `BreakEvenResult`), pas de colonnes typées séparées : évite une resynchronisation manuelle si le moteur évolue.
- Migration Prisma Migrate créée et appliquée contre le Postgres de dev (voir section Infra).

## API (`apps/api/src/ideas/`)

Nouveau module `IdeasModule` (controller + service + DTOs), dépend de `PrismaService` et `FinancialEngineService`.

- `POST /ideas`
  - Body : `{ businessModel: BusinessModel; rawDescription: string; currency: CurrencyCode; hypotheses: { price: number; volume: number; variableCostPerUnit: number; fixedCosts: number } }`
  - Validation stricte (`class-validator`) : enum pour `businessModel`/`currency`, bornes numériques (entiers, `price > 0`, reste `>= 0`), `rawDescription` non vide et bornée en longueur.
  - Effet : crée l'`Idea`, les 4 `Hypothesis`, appelle `FinancialEngineService.computeResult` + `computeBreakEven`, crée la `Simulation` (`type: "apercu"`).
  - Réponse : `{ ideaId: string; result: FinancialResult; breakEven: BreakEvenResult }`.
- `GET /ideas/:id`
  - Réponse : idée, hypothèses, dernière simulation aperçu. 404 si id inconnu.
  - Usage : recharger l'écran résultats après un refresh, ou partager un lien.

Pas de route `/hypotheses/suggest` (Phase 4) ni `/scenarios` (Phase 5) ni `/payment/*` (Phase 6-7) dans ce lot.

## Infrastructure

- `PrismaService` (`apps/api/src/prisma/prisma.service.ts`) : étend `PrismaClient` avec l'adapter `@prisma/adapter-pg` (Prisma 7 ne lit plus `DATABASE_URL` directement dans le client runtime), `OnModuleInit`/`OnModuleDestroy` pour `$connect`/`$disconnect`. `PrismaModule` global, exporté.
- `docker-compose.yml` à la racine : un service `postgres` (image officielle, variables alignées sur `apps/api/.env.example`), pour le développement local. Rien de plus (pas de redis, pas de service applicatif conteneurisé : hors scope de cette phase).
- Nouvelles dépendances `apps/api` : `@prisma/adapter-pg`, `pg`, `@types/pg` (dev), `class-validator`, `class-transformer`.

## Frontend (`apps/web/src/app/commencer/`)

Le CTA de la landing pointe déjà vers `/commencer` (actuellement 404).

- Une page, wizard à 4 étapes en état client (`useReducer`), indicateur de progression discret (`design/UX_PRINCIPLES.md`) :
  1. Type de business (6 choix)
  2. Description libre (texte, stocké, pas encore traité)
  3. Hypothèses (4 champs : prix, volume, coût variable/unité, coûts fixes, devise), libellés adaptés au modèle choisi
  4. Résultats (CA, marge brute, résultat estimé, seuil de rentabilité) après le `POST /ideas`
- Aucun calcul financier côté frontend : les chiffres affichés viennent exclusivement de la réponse API (`docs/FINANCIAL_ENGINE.md`).
- Design system existant réutilisé (tokens `design/COLORS.md`/`TYPOGRAPHY.md` déjà en place, composants `rounded-2xl border border-border bg-surface` du style déjà utilisé sur la landing).

## Tests

- Backend : TDD (vitest) sur `IdeasService` (validation, orchestration moteur, persistance) avec une base Postgres de test réelle (pas de mock Prisma, cohérent avec `skills/testing.md` qui priorise la fiabilité du moteur et du tunnel critique). Tests DTO (rejet des entrées invalides).
- Frontend : pas de suite de tests automatisée pour l'instant (aucune n'existe encore dans `apps/web`), vérification manuelle via le dev server + captures d'écran comme sur la landing.

## Hors scope (rappel)

- Compte utilisateur / authentification.
- Extraction IA des hypothèses (Phase 4).
- Module "Et si ?" et scénarios prudent/réaliste/ambitieux/crise dans l'UI (le moteur les supporte déjà, l'UI arrive Phase 5).
- Paiement, analyse complète, rapport (Phase 6-7).
- Déploiement, i18n (reportés, voir `tasks/TODO.md`).

## Risques / points d'attention

- Le champ `businessModel` "Autre" n'a pas de variables spécifiques dans `docs/SPECIFICATIONS.md` au-delà "définies progressivement par l'IA" : en Phase 3 il utilise les mêmes 4 champs génériques que les autres modèles, sans texte d'aide différencié.
- `docker-compose.yml` suppose Docker disponible sur la machine de dev (confirmé disponible dans cet environnement).
