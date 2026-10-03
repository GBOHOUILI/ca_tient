# API.md — Endpoints (proposition initiale)

À affiner selon l'implémentation NestJS réelle — sert de contrat de départ entre frontend et backend.

## Idées et hypothèses

Toutes les routes `/ideas/:id…` (sauf `POST /ideas` et les deux routes `suggest-*`, qui n'ont pas encore d'idée) exigent l'en-tête `Authorization: Bearer <accessToken>` (`IdeaAccessGuard`) : en-tête absent → 401 ; jeton faux ou idée inconnue → 404 identique dans les deux cas (ne révèle pas qu'une idée existe).

- `POST /ideas` — crée une idée (description libre + modèle de business optionnel ; `acquisition` facultatif `{ utmSource?, utmMedium?, utmCampaign?, referrerHost? }`, ignoré par `PUT`), renvoie en plus `accessToken` (jeton aléatoire, à conserver côté navigateur — voir `docs/DECISIONS.md`)
- `PUT /ideas/:id` — protégée ; met à jour la même idée (même corps que `POST /ideas`), remplace ses hypothèses et sa simulation d'aperçu, conserve ses blocs de canvas ; utilisé quand l'utilisateur revient en arrière dans le wizard
- `GET /ideas/:id` — protégée ; relit l'idée, ses hypothèses, sa simulation d'aperçu, `paid: boolean` (calculé côté serveur, jamais transmis par le client) et `hasCapitalPlan: boolean`
- `POST /ideas/suggest-hypotheses` — l'IA propose les 4 hypothèses à partir de la description (sans persistance, `{ available: false }` si l'IA ne répond pas)
- `POST /ideas/suggest-canvas-blocks` — l'IA propose les 7 blocs qualitatifs du canvas (même contrat)
- `PUT /ideas/:id/profile` — protégée (jeton d'accès, pas besoin d'avoir payé) ; profil facultatif `{ country?, city?, profile?, stage?, heardFrom?, contact?, contactConsent? }` (valeurs dans des listes fermées, voir `IdeaProfileDto`). `contact` sans `contactConsent: true` → 400 ; retirer le consentement efface le contact. Upsert, `200 { ok: true }`.
- `DELETE /ideas/:id` — protégée (jeton d'accès) ; l'utilisateur supprime son analyse et tout ce qui s'y rattache (cascade + événements analytics). `204`.
- `PATCH /ideas/:id/canvas-blocks` — protégée ; enregistre les 7 blocs validés/édités par l'utilisateur

## Récupération d'une analyse payée

- `POST /ideas/:id/recovery-code` — protégée (jeton d'accès) et réservée aux idées payées (403). Génère un nouveau code `CT-XXXXX-XXXXX`, remplace l'ancien, renvoie `201 { code }` (le code n'est jamais réaffichable : seul son hash est stocké).
- `POST /recovery` — publique, 5 requêtes/min/IP (429 au-delà). Corps `{ code }` (casse, espaces et tirets ignorés). Renvoie `200 { ideaId, accessToken }` (nouveau jeton, l'ancien reste valide) ; `404` pour un code inconnu, mal formé ou d'une idée non payée ; `400` si `code` est absent.

## Simulation

- Pas d'endpoint dédié : l'aperçu (CA, marge, seuil) est calculé par `POST`/`PUT /ideas`, les scénarios et le module « Et si ? » sont recalculés côté navigateur par le package partagé `financial-engine` (voir `docs/DECISIONS.md`, 2026-09-20).

## Paiement

- `GET /pricing` — publique. `{ analysisPriceXof }` : prix de l'analyse complète en FCFA, lu dans `ANALYSIS_PRICE_XOF` (défaut 1 000). `0` = gratuit.

- `POST /ideas/:id/payments` — protégée (jeton d'accès). Si le prix est 0 : débloque l'idée tout de suite, sans fournisseur, et renvoie `201 { paymentId: null, redirectUrl }` vers l'analyse. Sinon : crée un `Payment` `pending` au prix configuré, ouvre la transaction chez le provider actif et renvoie `201 { paymentId, redirectUrl }`. `409` si l'idée est déjà payée. `503` si le provider (FedaPay) ne répond pas ou répond en erreur — rien n'est laissé `pending` indéfiniment, le paiement est marqué `canceled`.
- `GET /ideas/:id/payment` — protégée. Renvoie `{ paid, status }` (`status` : `pending | approved | declined | canceled | null` s'il n'existe aucun paiement) du dernier paiement de l'idée. Si ce paiement est `pending`, le serveur relit son statut chez FedaPay avant de répondre (le webhook peut arriver après le retour du navigateur).
- `POST /payments/webhook/fedapay` — publique, signature `X-FEDAPAY-SIGNATURE` obligatoire (`t=<timestamp>,s=<hex>`, voir `docs/PAYMENT.md`). Corps brut requis. `404` si aucun `FEDAPAY_WEBHOOK_SECRET` n'est configuré (mode `PAYMENT_PROVIDER=test`) ; `400` si la signature est absente/invalide/trop ancienne ; `503` si la relecture de la transaction chez FedaPay (obligatoire après une signature valide, le statut de l'événement n'est jamais cru sur parole) échoue, pour que FedaPay retente plus tard ; `200 { received: true }` sinon, y compris pour une transaction inconnue de notre base (pas d'effet, pour ne pas faire réessayer FedaPay indéfiniment).

## Analyse complète et rapport

- L'analyse payante (« Et si ? », scénarios) est affichée côté navigateur (`/analyse/:ideaId`) une fois `GET /ideas/:id/payment` confirmé `paid: true` ; pas d'endpoint dédié pour l'instant, `GET /ideas/:id` suffit (hypothèses + devise).
- `PUT /ideas/:id/capital` — protégée et **réservée aux idées payées** (`PaidIdeaGuard` : 403 sinon). Corps `{ equipment, initialStock, openingCosts, other, availableCapital }`, entiers de 0 à 2 147 483 647 (400 sinon). Enregistre le plan (upsert) et renvoie `200 { capitalNeed }` (`computeCapitalNeed` : dépenses de départ, réserve de 3 mois de charges, capital nécessaire, besoin de financement ou excédent).
- `GET /ideas/:id/report` — protégée et réservée aux idées payées (403). Rapport complet assemblé côté serveur : idée, hypothèses, résultat, seuil, 4 scénarios, `capital` (`{ plan, need }` ou `null` si non saisi), variables sensibles, codes des points à surveiller, canvas (7 blocs saisis + structure de coûts et flux de revenus calculés), sans la synthèse : la route ne fait jamais attendre l'IA. Tous les chiffres viennent du moteur.
- `GET /ideas/:id/report/summary` — protégée et réservée aux idées payées (403). Renvoie `{ text, source: "ai" | "template" }`. Synthèse IA sans aucun chiffre, stockée par empreinte des faits ; repli sur une synthèse modèle (non stockée) si l'IA échoue. Des requêtes simultanées pour une même idée partagent un seul appel à l'IA (par processus API).

## Analytics

- `POST /analytics/events` — publique, 60 requêtes/min/IP, `204`. Corps `{ type, sessionId, ideaId? }` ; `type` ∈ `landing_view | test_started | offer_viewed | what_if_used | report_viewed | report_printed` (les paiements ne sont jamais acceptés du navigateur) ; `sessionId` 8–64 caractères `[A-Za-z0-9-]` ; `400` sinon.
- `GET /admin/stats?period=7d|30d|all` (défaut `30d`) — en-tête `x-admin-key` = `ADMIN_KEY` (comparaison en temps constant). `404` si `ADMIN_KEY` n'est pas configurée, `401` si la clé est fausse, `400` période inconnue. Renvoie `{ period, from, steps: [{ key, count }], reportPrinted, recoveries }`, étapes dans l'ordre du funnel, comptes distincts.

## Dashboard admin

Toutes les routes : en-tête `x-admin-key` = `ADMIN_KEY` (404 si non configurée, 401 si fausse), 60 requêtes/min/IP, lecture seule. Filtres communs : `period=7d|30d|90d|all` (défaut `30d`), `businessModel`, `country`, et `currency` (défaut `XOF`, montants du marché).

- `GET /admin/overview` — indicateurs clés (visites, idées, paiements confirmés, chiffre d'affaires, conversion aperçu → paiement, part des idées qui tiennent) et activité par jour.
- `GET /admin/market` — répartitions (type, pays, profil, avancement, devises) et médianes par type de business dans la devise choisie.
- `GET /admin/conversion` — funnel (période seulement) et taux de paiement par type, source déclarée, `utm_source`, pays.
- `GET /admin/revenue` — paiements XOF : total, statuts, par jour et par semaine (lundi).
- `GET /admin/ideas?page=&search=&paid=true|false` — liste paginée (20), recherche insensible à la casse dans la description.
- `GET /admin/ideas/:id` — fiche complète (résultats recalculés par le moteur, canvas, capital, profil, contact seulement si consentement, paiements, parcours) ; 404 si inconnue.
- `DELETE /admin/ideas/:id` — suppression sur demande d'une personne (même effacement complet), `204`, `404` si inconnue. La recherche de `GET /admin/ideas` porte aussi sur le contact (e-mail / numéro).
- `GET /admin/contacts.csv` — CSV (`;`, UTF-8 avec BOM) des seuls contacts consentants, cellules protégées contre l'injection de formules.

## Avis

- `GET /ideas/:id/review` / `PUT /ideas/:id/review` — jeton d'accès + idée payée (403 sinon). Corps `{ rating (1-5), comment (≤ 500), displayName? (≤ 40), publishConsent }`. Un avis par idée ; toute modification le renvoie en modération.
- `GET /reviews` — publique. `{ count, average, reviews }` : seulement les avis publiés par l'admin **et** dont l'auteur a accepté la publication (6 plus récents).
- `GET /admin/reviews`, `PATCH /admin/reviews/:id { status: pending | published | hidden }` — clé admin ; publier un avis sans accord de publication → 400.

## Historique

- `GET /ideas` — liste des idées/analyses de l'utilisateur (si compte/session persistante)

## Règle de sécurité transversale

Tout endpoint qui débloque ou affiche une analyse complète doit vérifier server-side le statut réel du paiement en base — jamais uniquement un paramètre transmis par le client.
