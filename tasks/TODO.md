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
- [ ] **Dette UX à corriger** : le libellé des champs de l'écran Hypothèses (`StepHypotheses.tsx`) est trop jargonneux/imprécis pour un utilisateur sans bagage financier (ex. "coût variable par unité", "coûts fixes"), contrairement à `design/UX_PRINCIPLES.md` ("le vocabulaire est simple, jamais jargonneux"). À revoir après la Phase 4 (copie + précision des questions), signalé par l'utilisateur le 2026-09-19.

## Phase 4 — IA
- [ ] Extraction des hypothèses depuis la description libre (`docs/AI_ENGINE.md`)

## Phase 5 — Scénarios
- [ ] Module "Et si… ?" + scénarios prudent/réaliste/ambitieux/crise

## Phase 6-7 — Analyse complète & Paiement
- [ ] Écran d'offre à 1 000 FCFA
- [ ] Intégration FedaPay (`docs/PAYMENT.md`, `skills/payment.md`)
- [ ] Rapport final

## Phase 8 — Bêta
- [ ] Recruter 10–20 utilisateurs réels
