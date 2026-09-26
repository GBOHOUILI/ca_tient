# TODO.md

## Phase 0 — Cadrage (fait)
- [x] Positionnement, cible, règles du MVP (`docs/PRODUCT.md`, `docs/MVP_SCOPE.md`, `docs/BUSINESS_RULES.md`)
- [x] Pack documentaire initial (docs/, design/, skills/)

## Phase 1 — Fondation
- [x] Initialiser le repo (monorepo pnpm workspaces : `apps/web` Next.js + TS, `apps/api` NestJS, Prisma 7.10.0 configuré pour PostgreSQL sans modèles)
- [x] Mettre en place les tokens de design (`design/COLORS.md`, `design/TYPOGRAPHY.md`) dans Tailwind (`apps/web/src/app/globals.css`)
- [x] Landing page statique avec hero Three.js (voir `design/PROMPTS.md`), copy FR en dur, i18n et sélecteur de langue non implémentés (voir note ci-dessous)
- [ ] i18n (FR/EN, `next-intl`), reporté volontairement lors de la landing page, à faire avant la bêta (`design/UX_PRINCIPLES.md`)
- [ ] Déploiement (hébergement front/back + PostgreSQL free-tier, voir `docs/ROADMAP.md` "Budget minimal")

## Phase 2 — Moteur financier
- [x] Implémenter les formules (`docs/FINANCIAL_ENGINE.md`) : `apps/api/src/financial-engine/` (CA, marge brute, résultat estimé, seuil de rentabilité, scénarios prudent/réaliste/ambitieux/crise). Montants en devise choisie par l'utilisateur (XOF par défaut du marché), voir `docs/DECISIONS.md`.
- [x] Tests unitaires cas nominal / cas limites (`skills/testing.md`) : 31 tests (vitest), TDD, cas nominal/limite/extrême couverts.
- [ ] Câbler l'API `/ideas/:id/simulate` (`docs/API.md`), reporté à la Phase 3+ (nécessite la persistance des idées/hypothèses).

## Phase 3 — Parcours utilisateur
- [x] Persistance Postgres (Prisma `Idea`/`Hypothesis`/`Simulation`, `PrismaService` driver adapter `pg`)
- [x] `POST /ideas` / `GET /ideas/:id` (`IdeasModule`, DTOs validés, orchestration du moteur financier Phase 2)
- [x] Formulaire guidé (`docs/USER_FLOWS.md`, `docs/SPECIFICATIONS.md`) : wizard `/commencer` (type -> description -> hypothèses -> résultats), saisie manuelle uniquement (extraction IA en Phase 4)
- [x] Écran de résultats/aperçu
- [x] **Dette UX à corriger** : le libellé des champs de l'écran Hypothèses (`StepHypotheses.tsx`) est trop jargonneux/imprécis pour un utilisateur sans bagage financier (ex. "coût variable par unité", "coûts fixes"), contrairement à `design/UX_PRINCIPLES.md` ("le vocabulaire est simple, jamais jargonneux"). À revoir après la Phase 4 (copie + précision des questions), signalé par l'utilisateur le 2026-09-19.

## Phase 4 — IA
- [x] Extraction des hypothèses depuis la description libre (`docs/AI_ENGINE.md`) : `AiModule` (`apps/api/src/ai/`), Google Gemini via `@google/genai` en mode structured output, `POST /ideas/suggest-hypotheses` (stateless, rate-limité 10 req/min/IP), préremplissage automatique de l'écran Hypothèses du wizard avec repli silencieux si l'IA échoue. Voir `docs/superpowers/specs/2026-09-19-phase-4-extraction-ia-design.md` et `docs/DECISIONS.md`.
- [ ] **Dette pré-déploiement notée pendant la revue finale** : `ThrottlerGuard` suit `req.ip`, qui se réduit à une seule IP derrière un reverse proxy sans `app.set('trust proxy', ...)` — à corriger une fois la cible d'hébergement choisie (profondeur de proxy dépendante de l'infra).
- [ ] Dette UX pré-existante (Phase 3) : `<textarea>` de description sans `maxLength` côté client (le serveur plafonne à 2000 caractères) — au-delà, l'échec ne remonte que sur l'écran Hypothèses avec un message générique.

## Phase 5 — Scénarios
- [x] Phase 5a — moteur : projection annuelle avec saisonnalité (`packages/financial-engine/src/seasonality.ts`), package partagé du monorepo (`packages/financial-engine`), consommé par `apps/api` via `financial-engine.service.ts`. Voir `docs/superpowers/specs/2026-09-20-phase-5a-moteur-saisonnalite-design.md` et `docs/DECISIONS.md`.
- [x] Phase 5b — écrans "Et si ?"/"Scénarios" (`apps/web/src/components/wizard/StepEtSi.tsx`, `StepScenarios.tsx`), graphiques Recharts (`apps/web/src/components/wizard/charts/`), recalcul temps réel côté navigateur via le package `financial-engine` (Phase 5a). Vocabulaire de l'écran Hypothèses reformulé (dette Phase 4 close). Voir `docs/superpowers/specs/2026-09-20-phase-5b-et-si-scenarios-design.md`.
- [x] **Bug mineur découvert (revue finale Phase 5b)** : dans `StepHypotheses.tsx`, l'indice affiché sous le champ "charges fixes" est le même texte que celui du champ "coût variable" (`HINTS[businessModel]`, ex. "Inclut coût produit, livraison et commissions"), ce qui n'a pas de sens pour des charges fixes. Le tableau `HINTS` n'a pas été touché par la Phase 5b (hors scope de cette phase) ; à corriger dans une prochaine passe. Corrigé : l'indice n'est plus affiché sous les charges fixes.

## Phase 6a — Canvas (blocs manquants)
- [x] Capture des 7 blocs qualitatifs du business model canvas (`apps/web/src/components/wizard/StepCanvas.tsx`), suggestion IA (`apps/api/src/ai/gemini.provider.ts`), persistance (`CanvasBlock`, `PATCH /ideas/:id/canvas-blocks`). Voir `docs/superpowers/specs/2026-09-20-phase-6a-canvas-capture-design.md`.
- [x] **Dette découverte (vérification bout en bout Phase 6a)** : chaque soumission de l'écran Hypothèses crée une nouvelle `Idea` (comportement Phase 3). Un retour arrière depuis "Ton business model" puis re-soumission laisse une `Idea` orpheline sans `CanvasBlock`. À traiter avant le rapport final (réutiliser l'idée existante ou nettoyer les orphelines). Corrigé : `PUT /ideas/:id` réutilise l'idée existante.

## Phase 6-7 — Analyse complète & Paiement
- [ ] Écran d'offre à 1 000 FCFA
- [ ] Intégration FedaPay (`docs/PAYMENT.md`, `skills/payment.md`)
- [ ] Rapport final

## Phase 8 — Bêta
- [ ] Recruter 10–20 utilisateurs réels
