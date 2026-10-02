# Dashboard admin — Design (sous-projet B)

Date : 2026-10-02
Statut : validé en conversation le 2026-10-02.
Précédent : sous-projet A, collecte du profil (`2026-10-02-collecte-profil-design.md`). Remplace la page `/admin/stats` (Phase 6b-2b) et lève le report du « dashboard admin » (`docs/DECISIONS.md`, 2026-09-20).

## Objectif

Un vrai tableau de bord pour : comprendre le marché, piloter la conversion, suivre les utilisateurs un par un, suivre l'argent. Accès par la clé `ADMIN_KEY` existante (pas de comptes : limite assumée).

Critères de succès :
- 5 sections (Vue d'ensemble, Marché, Conversion, Revenus, Idées) avec des filtres communs (période, type de business, pays) ;
- une fiche par idée avec résultats recalculés par le moteur, profil, contact (si consentement), paiements et parcours ;
- export CSV des seuls contacts consentants ;
- aucun montant agrégé entre devises différentes ;
- tout chiffre financier vient du moteur déterministe, jamais de l'IA.

## Accès

- Toutes les routes `/admin/*` de l'API : `AdminKeyGuard` existant (404 si `ADMIN_KEY` absente, 401 si fausse) + `ThrottlerGuard` 60/min/IP.
- Web : `/admin` et ses pages partagent un layout client qui demande la clé une fois (gardée en `sessionStorage`), avec « Se déconnecter ». Pages non indexées. `/admin/stats` redirige vers `/admin/conversion`.

## Filtres communs (`AdminFiltersDto`)

`period` ∈ `7d | 30d | 90d | all` (défaut `30d`), `businessModel` (enum), `country` (liste de la collecte), `currency` (défaut `XOF`, seulement pour les montants du Marché). La période s'applique à `Idea.createdAt` pour les statistiques d'idées et à la date du paiement pour les revenus.

## API (`apps/api/src/admin/`, module `AdminModule`)

Le service charge les idées filtrées (`findMany` avec hypothèses, profil, capital, paiements) puis appelle des **fonctions pures d'agrégation** (`admin-stats.ts`) testées à part. Volumétrie MVP (quelques milliers d'idées) : agrégation en mémoire assumée ; au-delà, passer à des agrégations SQL.

- `GET /admin/overview` → `{ kpis: { visits, ideas, paidIdeas, revenue, previewToPaidRate, holdsShare }, daily: [{ date, ideas, payments }] }`. `visits` = sessions distinctes `landing_view` (non filtrées par type/pays) ; `revenue` = somme des paiements approuvés (XOF) ; `holdsShare` = part des idées dont le résultat estimé (moteur) est ≥ 0.
- `GET /admin/market` → `{ total, byBusinessModel, byCountry, byProfile, byStage, currencies, currency, perBusinessModel: [{ key, count, medianPrice, medianVolume, medianFixedCosts, holdsShare, withCapital, medianCapitalNeeded, medianFinancingGap }] }`. Les répartitions sont `[{ key, count }]` triées par nombre ; les médianes ne portent que sur les idées de la devise choisie (`null` s'il n'y en a pas).
- `GET /admin/conversion` → `{ funnel, byBusinessModel, byHeardFrom, byUtmSource, byCountry }`, chaque ventilation `[{ key, ideas, paid, rate }]` ; `funnel` = `AnalyticsService.funnel` (période seulement).
- `GET /admin/revenue` → `{ total, approved, declined, canceled, pending, daily: [{ date, revenue, approved }], weekly: [{ weekStart, revenue }] }` (paiements XOF ; semaines commençant le lundi).
- `GET /admin/ideas?page=1&search=&paid=` (+ filtres) → `{ total, page, pageSize: 20, items: [{ id, createdAt, businessModel, country, currency, holds, paid, hasContact, excerpt }] }`, tri du plus récent, recherche insensible à la casse dans la description.
- `GET /admin/ideas/:id` → `{ idea, acquisition, hypotheses, result, breakEven, canvas, capital: { plan, need } | null, profile, payments, events, recoveries }` ; 404 si inconnue.
- `GET /admin/contacts.csv` → `text/csv` (UTF-8 avec BOM pour Excel), `Content-Disposition: attachment`, colonnes `date;pays;ville;profil;avancement;type_de_business;contact;consentement_le;idee`, uniquement `contactConsent = true` ; cellules commençant par `= + - @` préfixées d'une apostrophe (injection de formule).

## Web (`apps/web/src/app/admin/`)

- `layout.tsx` (serveur, `robots: noindex`) + `AdminShell` (client) : porte d'entrée par clé, barre latérale (onglets horizontaux en mobile), barre de filtres ; contexte `AdminContext` (clé, filtres, `adminFetch`).
- Pages : `/admin` (vue d'ensemble), `/admin/marche`, `/admin/conversion`, `/admin/revenus`, `/admin/idees`, `/admin/idees/[id]`.
- Graphiques Recharts (déjà en dépendance), tokens existants : courbes par jour, barres de répartition, barres du funnel.
- Libellés français centralisés (`admin-labels.ts`, reprend `profile-options.ts`).

## Tests

- `admin-stats.spec.ts` (pur) : médiane (pair/impair/vide), répartitions, part « tient », ventilations de conversion, revenus par jour et par semaine (lundi), exclusion des autres devises.
- `admin.http.spec.ts` : 404 sans `ADMIN_KEY`, 401 mauvaise clé sur chaque route ; overview/market/conversion/revenue sur un jeu connu ; filtres type/pays/période ; liste paginée + recherche + filtre payé ; fiche complète (résultat recalculé) et 404 ; CSV : seulement les consentants, BOM, échappement, protection contre les formules.

## Documentation

`docs/DECISIONS.md`, `docs/API.md`, `docs/ANALYTICS.md`, `tasks/TODO.md`, `tasks/CHANGELOG.md`.

## Hors scope

Comptes administrateurs et rôles, édition ou suppression depuis le dashboard, export des idées complètes, graphiques de cohortes, temps réel.
