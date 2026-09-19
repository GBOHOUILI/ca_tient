# TODO.md

## Phase 0 — Cadrage (fait)
- [x] Positionnement, cible, règles du MVP (`docs/PRODUCT.md`, `docs/MVP_SCOPE.md`, `docs/BUSINESS_RULES.md`)
- [x] Pack documentaire initial (docs/, design/, skills/)

## Phase 1 — Fondation
- [x] Initialiser le repo (monorepo pnpm workspaces : `apps/web` Next.js + TS, `apps/api` NestJS, Prisma 7.10.0 configuré pour PostgreSQL sans modèles)
- [x] Mettre en place les tokens de design (`design/COLORS.md`, `design/TYPOGRAPHY.md`) dans Tailwind (`apps/web/src/app/globals.css`)
- [x] Landing page statique avec hero Three.js (voir `design/PROMPTS.md`) — copy FR en dur, i18n et sélecteur de langue non implémentés (voir note ci-dessous)
- [ ] i18n (FR/EN, `next-intl`) — reporté volontairement lors de la landing page, à faire avant la bêta (`design/UX_PRINCIPLES.md`)
- [ ] Déploiement (hébergement front/back + PostgreSQL free-tier, voir `docs/ROADMAP.md` "Budget minimal")

## Phase 2 — Moteur financier
- [ ] Implémenter les formules (`docs/FINANCIAL_ENGINE.md`)
- [ ] Tests unitaires cas nominal / cas limites (`skills/testing.md`)

## Phase 3 — Parcours utilisateur
- [ ] Formulaire guidé (`docs/USER_FLOWS.md`, `docs/SPECIFICATIONS.md`)
- [ ] Écran de résultats/aperçu

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
