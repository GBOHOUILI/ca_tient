# CHANGELOG.md

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
