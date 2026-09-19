# CHANGELOG.md

## [Non versionné] — Phase 1 : fondation technique
- Monorepo pnpm workspaces : `apps/web` (Next.js 16 + TypeScript, App Router, Tailwind v4) et `apps/api` (NestJS 12 + Prisma 7.10.0).
- Tokens de design (`design/COLORS.md`, `design/TYPOGRAPHY.md`) portés dans `apps/web/src/app/globals.css` — couleurs mode sombre/clair via variables CSS, échelle typographique Inter avec variantes desktop/mobile.
- Prisma configuré pour PostgreSQL (`prisma/schema.prisma`, `prisma.config.ts`), sans modèle — schéma de données reporté en Phase 2. Version épinglée en 7.10.0 (le tag `latest` npm pointait vers une release candidate 8.x).
- Port par défaut de l'API fixé à 3001 pour éviter le conflit avec le 3000 de Next.js en dev local.
- Décisions consignées dans `docs/DECISIONS.md` : structure monorepo, version Prisma.

## [Non versionné] — Cadrage initial
- Reconstruction complète du pack documentaire du projet (docs/, design/, skills/, tasks/) à partir de la roadmap MVP V2 et des décisions déjà prises (FedaPay, stack Next.js/NestJS/PostgreSQL, prix 1 000 FCFA).
- Direction artistique définie : mode sombre par défaut, palette zinc + dégradé émeraude/cyan, typographie Inter, hero animé en Three.js.
