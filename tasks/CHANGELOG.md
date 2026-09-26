# CHANGELOG.md

## [Non versionné], Suivi Phase 6a : correctifs
- Revenir en arrière dans le wizard puis re-soumettre met à jour la même idée (`PUT /ideas/:id`) au lieu d'en créer une nouvelle : plus d'idée orpheline, les blocs de canvas sont conservés.
- "Voir mes resultats" est désactivé tant que le prix de vente est à 0 (cas où la suggestion IA des hypothèses échoue), avec un message explicite au lieu d'une erreur générique.
- `CanvasBlock.source` passe en enum Prisma (`CanvasBlockSource`), migration par cast sans perte ; les clés de blocs en double sont rejetées (`@ArrayUnique`).
- L'indice du coût variable n'apparaît plus sous le champ des charges fixes.

## [Non versionné], Phase 6a : capture du canvas
- Nouvel écran "Ton business model" dans le wizard, entre "Hypothèses" et "Résultats" : 7 blocs qualitatifs du business model canvas (proposition de valeur, segments clients, canaux, relations clients, ressources clés, activités clés, partenaires clés), suggérés par l'IA (`GeminiProvider.suggestCanvasBlocks`, même mécanique que la Phase 4) depuis la description libre, validés/édités par l'utilisateur.
- Nouveau modèle Prisma `CanvasBlock` (pattern identique à `Hypothesis`), persisté via `PATCH /ideas/:id/canvas-blocks` (`upsert`, tolère un retour en arrière puis re-soumission). Suggestion IA et création de l'idée lancées en parallèle (`Promise.all`) pour ne pas cumuler les latences.
- Préparation de contenu pour le rapport final enrichi (Phase 6b, hors scope ici) : les 2 blocs restants du canvas (structure de coûts, flux de revenus) resteront calculés en direct par `financial-engine`, jamais stockés comme texte.

## [Non versionné], Phase 5b : écrans "Et si ?" / "Scénarios"
- Deux nouveaux écrans du wizard, juste après l'aperçu : "Et si ?" (4 sliders en pourcentage + sélecteur de saisonnalité + graphique de seuil de rentabilité en temps réel + graphique mensuel conditionnel) et "Scénarios" (comparaison en barres des 4 scénarios prédéfinis + un scénario "Personnalisé" qui reprend les réglages de l'écran précédent).
- `apps/web` consomme directement le package `financial-engine` (Phase 5a) : aucun aller-retour réseau, recalcul instantané à chaque interaction.
- Graphiques Recharts (`apps/web/src/components/wizard/charts/`) : palette et grille reprises telles quelles de `design/COLORS.md`/`design/COMPONENTS.md`, tooltips + texte alternatif sur chaque graphique.
- Vocabulaire de l'écran Hypothèses reformulé en questions directes plutôt qu'en termes comptables (dette notée depuis la Phase 4, `design/UX_PRINCIPLES.md`).
- Vérification bout en bout manuelle (Playwright) : recalcul en direct des sliders, apparition/disparition du graphique mensuel selon la saisonnalité, cohérence du scénario "Personnalisé", 0 erreur console.

## [Non versionné], Phase 5a : moteur financier partagé + projection annuelle
- Extraction du moteur financier (`financial-engine.types.ts`, `financial-engine.errors.ts`, `financial-engine.validation.ts`, `scenarios.ts`) en package partagé du monorepo (`packages/financial-engine`), consommé par `apps/api` via un build `tsc` standard. `computeResult`/`computeBreakEven` (auparavant méthodes NestJS uniquement) sont désormais des fonctions pures du package (`financial-engine.calculations.ts`), `FinancialEngineService` en reste le seul point d'entrée NestJS, désormais un fin wrapper.
- Nouveau : `computeAnnualProjection(hypotheses, profile)` (`packages/financial-engine/src/seasonality.ts`) — projection sur 12 mois avec 4 profils de saisonnalité prédéfinis (`stable`, `fetes_fin_annee`, `ete`, `rentree_scolaire`), même mécanique que les scénarios existants (`applyDelta` sur le volume, pourcentages sommant à zéro), composable avec les scénarios prudent/réaliste/ambitieux/crise. Aucune UI, aucune persistance, aucun nouvel endpoint HTTP — module backend pur, prêt pour la Phase 5b.
- 36 tests dans `packages/financial-engine` (20 déplacés inchangés + 9 sur les fonctions de calcul extraites + 7 sur la saisonnalité), suite `apps/api` simplifiée en conséquence (logique métier non dupliquée entre les deux couches).

## [Non versionné], Phase 4 : extraction IA des hypothèses
- Nouveau module `AiModule` (`apps/api/src/ai/`), isolé d'`IdeasModule` : port `AiProvider` (`ai-provider.port.ts`), implémentation `GeminiProvider` (SDK officiel `@google/genai`, mode structured output pour forcer un JSON conforme, timeout 8s), `SuggestHypothesesDto`. Fournisseur choisi et consigné dans `docs/DECISIONS.md`.
- `POST /ideas/suggest-hypotheses` (`AiController`, stateless, aucune persistance) : renvoie `{ available: true, hypotheses }` ou `{ available: false }`, toujours HTTP 200 (jamais 500 sur une panne IA), rate-limité à 10 req/min/IP (`@nestjs/throttler`, scopé à ce seul endpoint via `ThrottlerModule.forRoot` importé dans `AiModule` uniquement). Aucun changement au contrat `POST /ideas`/`GET /ideas/:id` ni au schéma Prisma.
- Wizard frontend : le passage Description -> Hypothèses (`apps/web/src/app/commencer/page.tsx`) appelle désormais `suggestHypotheses()` et préremplit les 4 champs si une suggestion est disponible, avec repli silencieux (champs à 0, comportement Phase 3 inchangé) sur tout échec IA (réseau, timeout, JSON hors schéma, valeurs hors bornes) — jamais de blocage du parcours. Indice visuel « Suggéré par l'IA » sur l'écran Hypothèses (`StepHypotheses.tsx`), qui disparaît dès que l'utilisateur modifie un champ ou la devise.
- Deux corrections apportées en cours d'implémentation, actées dans le plan : bug de mock vitest (fonction fléchée non constructible sous vitest 4.1.11) et `@HttpCode(HttpStatus.OK)` manquant (Nest renvoie 201 par défaut sur un POST, la spec exige 200).
- Revue finale de branche : deux corrections supplémentaires avant merge — lecture de `GEMINI_MODEL` déplacée du chargement du module (jamais effective à cause de l'ordre d'évaluation ESM vs `process.loadEnvFile()`) vers l'instanciation du provider ; reset de `wasSuggested` sur changement de devise (l'indice IA pouvait rester affiché après un changement invalidant la suggestion).
- Vérification bout en bout manuelle (Playwright) : chemin succès avec une vraie clé Gemini (hypothèses préremplies, résultats cohérents) et chemin dégradé (panne réseau simulée -> champs à 0, aucune erreur JS non gérée).

## [Non versionné], Phase 3 : parcours utilisateur
- Persistance Postgres locale via Docker Compose (`docker-compose.yml`, port hôte 5433) et schéma Prisma `Idea`/`Hypothesis`/`Simulation` + enum `BusinessModel` (`apps/api/prisma/schema.prisma`), `PrismaService`/`PrismaModule` avec le driver adapter `@prisma/adapter-pg` (Prisma 7).
- `IdeasModule` (`apps/api/src/ideas/`) : `CreateIdeaDto`/`HypothesesDto` validés (class-validator/class-transformer), `IdeasService.create()` orchestrant `FinancialEngineModule` (Phase 2) et persistant idée + hypothèses + simulation "apercu", `IdeasService.findOne()`, `IdeasController` exposant `POST /ideas` et `GET /ideas/:id`.
- Wizard frontend `/commencer` (`apps/web/src/app/commencer/page.tsx`) : 4 étapes (type de business -> description libre -> hypothèses chiffrées -> résultats), machine à états `useReducer`, aucun calcul financier côté frontend (tout vient de la réponse API, conforme `CLAUDE.md`).
- Corrige deux gaps de configuration latents découverts en implémentant les premiers tests contre Postgres réel et le premier DTO décoré : `DATABASE_URL`/`.env` n'était chargé nulle part au runtime (ni tests, ni app démarrée), et `reflect-metadata` (déjà en dépendance) n'était importé nulle part — bloquant pour tout décorateur `class-transformer` (`@Type`). Ajoute `app.enableCors()` côté API (`WEB_APP_URL`), sans quoi aucun appel navigateur cross-origin vers l'API n'aboutit.
- Vérification bout en bout manuelle (Playwright) : parcours complet, résultats cohérents avec le moteur financier (250 000 / 150 000 / 50 000 XOF, seuil 34 unités), persistance en base confirmée, 0 erreur console.

## [Non versionné], Phase 2 : moteur financier
- Module pur `apps/api/src/financial-engine/` (aucune dépendance HTTP/IA) : `computeResult` (CA, marge brute, résultat estimé), `computeBreakEven` (seuil de rentabilité, gère explicitement marge unitaire nulle/négative sans division par zéro), `applyScenario`/`applyDelta` (prudent, réaliste, ambitieux, crise, et deltas personnalisés pour "Et si… ?").
- Montants en entiers dans la plus petite unité de la devise choisie par l'utilisateur (`XOF`, `EUR`, `USD`, `GBP`, `NGN`, `GHS`), aucune arithmétique flottante, aucune dépendance de calcul décimal, voir `docs/DECISIONS.md`.
- 31 tests unitaires (vitest, TDD) : cas nominal, cas limite (marge nulle, coûts fixes nuls, division par zéro évitée), cas extrême (montant au-delà de `Number.MAX_SAFE_INTEGER`, valeurs négatives/non entières rejetées).
- `FinancialEngineModule` câblé dans `AppModule`, sans controller pour l'instant (route `/ideas/:id/simulate` reportée, dépend de la persistance des idées en Phase 3+).

## [Non versionné], Phase 1 : landing page + hero Three.js
- Landing page (`apps/web/src/app/page.tsx`) : hero avec promesse/CTA/prix visible, types de business, étapes du parcours, rappel tarif.
- Hero 3D (`components/landing/HeroScene.tsx`) : nuage de particules `@react-three/fiber`/`drei`, dégradé emerald→cyan, parallax doux au pointeur, chargé en dynamique (`ssr:false`) avec fallback CSS si WebGL absent ou `prefers-reduced-motion` actif. Positions générées par un PRNG déterministe (pas de `Math.random()` pendant le render, conforme aux règles de pureté React 19 activées par `eslint-config-next` 16).
- Dark/light mode revu pour suivre `skills/frontend.md` à la lettre : classe `.dark` sur `<html>` (plus l'attribut `data-theme` du premier jet), rendu serveur par défaut sombre via cookie (`next/headers`), script anti-flash inline qui respecte `prefers-color-scheme` au premier chargement, `ThemeToggle` sans dépendance externe (`useSyncExternalStore`).
- Header sticky (glass au scroll) + footer ajoutés au layout.
- i18n (FR/EN) volontairement non traitée ici, copy FR en dur, cf. `tasks/TODO.md`.
- Vert de marque intensifié (`emerald-500` : `#059669` -> `#008558`, saturation 100%), voir `docs/DECISIONS.md`.

## [Non versionné], Phase 1 : fondation technique
- Monorepo pnpm workspaces : `apps/web` (Next.js 16 + TypeScript, App Router, Tailwind v4) et `apps/api` (NestJS 12 + Prisma 7.10.0).
- Tokens de design (`design/COLORS.md`, `design/TYPOGRAPHY.md`) portés dans `apps/web/src/app/globals.css`, couleurs mode sombre/clair via variables CSS, échelle typographique Inter avec variantes desktop/mobile.
- Prisma configuré pour PostgreSQL (`prisma/schema.prisma`, `prisma.config.ts`), sans modèle, schéma de données reporté en Phase 2. Version épinglée en 7.10.0 (le tag `latest` npm pointait vers une release candidate 8.x).
- Port par défaut de l'API fixé à 3001 pour éviter le conflit avec le 3000 de Next.js en dev local.
- Décisions consignées dans `docs/DECISIONS.md` : structure monorepo, version Prisma.

## [Non versionné] — Cadrage initial
- Reconstruction complète du pack documentaire du projet (docs/, design/, skills/, tasks/) à partir de la roadmap MVP V2 et des décisions déjà prises (FedaPay, stack Next.js/NestJS/PostgreSQL, prix 1 000 FCFA).
- Direction artistique définie : mode sombre par défaut, palette zinc + dégradé émeraude/cyan, typographie Inter, hero animé en Three.js.
