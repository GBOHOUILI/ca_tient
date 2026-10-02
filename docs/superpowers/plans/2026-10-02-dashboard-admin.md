# Dashboard admin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tableau de bord `/admin` en 5 sections + fiche idée + export des contacts consentants, derrière `ADMIN_KEY`.

**Architecture:** `AdminModule` (API) : service qui charge les idées filtrées et délègue à des fonctions pures `admin-stats.ts` ; routes en lecture seule derrière `AdminKeyGuard` + throttle. Web : layout client `AdminShell` (clé, navigation, filtres, contexte) et une page par section, graphiques Recharts.

**Tech Stack:** NestJS 12, Prisma 7, `financial-engine`, Next.js 16, Recharts.

**Spec:** `docs/superpowers/specs/2026-10-02-dashboard-admin-design.md`

## Global Constraints

- Lecture seule ; aucun montant agrégé entre devises ; chiffres financiers via le moteur.
- Contact visible uniquement si `contactConsent` ; CSV limité aux consentants, protégé contre l'injection de formules.
- Aucune dépendance ajoutée ; tokens du design system uniquement.

## Review Focus

1. Base vide ou filtres sans résultat : tous les écrans affichent des zéros/« — », jamais d'erreur (test « empty dataset »).
2. Idée sans hypothèses complètes (créée à la main) : le moteur lèverait → l'idée est ignorée des agrégats financiers, pas de 500.
3. Contact sans consentement présent en base (donnée ancienne) : jamais exposé dans la fiche ni le CSV.
4. Recherche avec caractères spéciaux (`%`, `_`) : traitée comme texte (Prisma `contains` paramétré).
5. Fuseau horaire : jours calculés en UTC, documenté.

---

### Task 1: Agrégations pures (`admin-stats.ts`) — TDD, tests listés dans la spec. Commit.
### Task 2: `AdminModule` (DTO filtres, service, contrôleur, CSV) — test HTTP d'abord. Suite API, build, lint. Commit.
### Task 3: Web — `AdminShell` + contexte, 6 pages, graphiques, redirection `/admin/stats`. `tsc` + lint. Commit.
### Task 4: Docs, vérification curl de chaque route, push, PR unique (A + B) vers `main`.
