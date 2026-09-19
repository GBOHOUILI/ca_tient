# Ça tient ?

Outil web permettant à une personne de décrire une idée de business, de structurer ses hypothèses financières et de tester plusieurs scénarios ("Et si… ?"). Le moteur calcule les résultats de façon déterministe ; l'IA aide à comprendre l'idée, proposer les variables pertinentes et formuler les scénarios.

**Promesse :** « Tu as une idée de business ? Teste ses chiffres avant d'investir ton argent. »

## Hypothèse à valider

Des personnes sont-elles prêtes à payer **1 000 FCFA** pour obtenir un stress-test utile de leur idée ?

## Stack

- Frontend : Next.js + TypeScript
- Backend : NestJS
- Base de données : PostgreSQL
- IA : fournisseur interchangeable (API économique / free-tier pour le MVP)
- Paiement : FedaPay (architecture abstraite pour permettre un changement de fournisseur)

## Où commencer

1. Lire `CLAUDE.md` — règles non négociables du projet.
2. Lire les documents pertinents dans `docs/`, `design/` et `skills/` avant de coder quoi que ce soit.
3. Ne rien construire hors du périmètre défini dans `docs/MVP_SCOPE.md` sans instruction explicite.

## Structure

Monorepo pnpm workspaces (décision consignée dans `docs/DECISIONS.md`).

```
ca-tient/
├── README.md
├── CLAUDE.md
├── pnpm-workspace.yaml
├── apps/
│   ├── web/         → Next.js + TypeScript (App Router, Tailwind)
│   └── api/         → NestJS + Prisma (PostgreSQL)
├── docs/            → source de vérité fonctionnelle et technique
├── design/          → identité visuelle et design system
├── skills/          → instructions spécialisées par domaine pour Claude Code
└── tasks/           → backlog, todo, changelog
```

## Démarrer en local

```bash
pnpm install
pnpm dev:web   # http://localhost:3000
pnpm dev:api   # http://localhost:3001
```
