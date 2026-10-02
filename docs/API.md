# API.md — Endpoints (proposition initiale)

À affiner selon l'implémentation NestJS réelle — sert de contrat de départ entre frontend et backend.

## Idées et hypothèses

Toutes les routes `/ideas/:id…` (sauf `POST /ideas` et les deux routes `suggest-*`, qui n'ont pas encore d'idée) exigent l'en-tête `Authorization: Bearer <accessToken>` (`IdeaAccessGuard`) : en-tête absent → 401 ; jeton faux ou idée inconnue → 404 identique dans les deux cas (ne révèle pas qu'une idée existe).

- `POST /ideas` — crée une idée (description libre + modèle de business optionnel), renvoie en plus `accessToken` (jeton aléatoire, à conserver côté navigateur — voir `docs/DECISIONS.md`)
- `PUT /ideas/:id` — protégée ; met à jour la même idée (même corps que `POST /ideas`), remplace ses hypothèses et sa simulation d'aperçu, conserve ses blocs de canvas ; utilisé quand l'utilisateur revient en arrière dans le wizard
- `GET /ideas/:id` — protégée ; relit l'idée, ses hypothèses, sa simulation d'aperçu, `paid: boolean` (calculé côté serveur, jamais transmis par le client) et `hasCapitalPlan: boolean`
- `POST /ideas/suggest-hypotheses` — l'IA propose les 4 hypothèses à partir de la description (sans persistance, `{ available: false }` si l'IA ne répond pas)
- `POST /ideas/suggest-canvas-blocks` — l'IA propose les 7 blocs qualitatifs du canvas (même contrat)
- `PATCH /ideas/:id/canvas-blocks` — protégée ; enregistre les 7 blocs validés/édités par l'utilisateur

## Simulation

- Pas d'endpoint dédié : l'aperçu (CA, marge, seuil) est calculé par `POST`/`PUT /ideas`, les scénarios et le module « Et si ? » sont recalculés côté navigateur par le package partagé `financial-engine` (voir `docs/DECISIONS.md`, 2026-09-20).

## Paiement

- `POST /ideas/:id/payments` — protégée (jeton d'accès). Crée un `Payment` `pending`, ouvre la transaction chez le provider actif et renvoie `201 { paymentId, redirectUrl }`. `409` si l'idée est déjà payée. `503` si le provider (FedaPay) ne répond pas ou répond en erreur — rien n'est laissé `pending` indéfiniment, le paiement est marqué `canceled`.
- `GET /ideas/:id/payment` — protégée. Renvoie `{ paid, status }` (`status` : `pending | approved | declined | canceled | null` s'il n'existe aucun paiement) du dernier paiement de l'idée. Si ce paiement est `pending`, le serveur relit son statut chez FedaPay avant de répondre (le webhook peut arriver après le retour du navigateur).
- `POST /payments/webhook/fedapay` — publique, signature `X-FEDAPAY-SIGNATURE` obligatoire (`t=<timestamp>,s=<hex>`, voir `docs/PAYMENT.md`). Corps brut requis. `404` si aucun `FEDAPAY_WEBHOOK_SECRET` n'est configuré (mode `PAYMENT_PROVIDER=test`) ; `400` si la signature est absente/invalide/trop ancienne ; `503` si la relecture de la transaction chez FedaPay (obligatoire après une signature valide, le statut de l'événement n'est jamais cru sur parole) échoue, pour que FedaPay retente plus tard ; `200 { received: true }` sinon, y compris pour une transaction inconnue de notre base (pas d'effet, pour ne pas faire réessayer FedaPay indéfiniment).

## Analyse complète et rapport

- L'analyse payante (« Et si ? », scénarios) est affichée côté navigateur (`/analyse/:ideaId`) une fois `GET /ideas/:id/payment` confirmé `paid: true` ; pas d'endpoint dédié pour l'instant, `GET /ideas/:id` suffit (hypothèses + devise).
- `PUT /ideas/:id/capital` — protégée et **réservée aux idées payées** (`PaidIdeaGuard` : 403 sinon). Corps `{ equipment, initialStock, openingCosts, other, availableCapital }`, entiers de 0 à 2 147 483 647 (400 sinon). Enregistre le plan (upsert) et renvoie `200 { capitalNeed }` (`computeCapitalNeed` : dépenses de départ, réserve de 3 mois de charges, capital nécessaire, besoin de financement ou excédent).
- `GET /ideas/:id/report` — protégée et réservée aux idées payées (403). Rapport complet assemblé côté serveur : idée, hypothèses, résultat, seuil, 4 scénarios, `capital` (`{ plan, need }` ou `null` si non saisi), variables sensibles, codes des points à surveiller, canvas (7 blocs saisis + structure de coûts et flux de revenus calculés), sans la synthèse : la route ne fait jamais attendre l'IA. Tous les chiffres viennent du moteur.
- `GET /ideas/:id/report/summary` — protégée et réservée aux idées payées (403). Renvoie `{ text, source: "ai" | "template" }`. Synthèse IA sans aucun chiffre, stockée par empreinte des faits ; repli sur une synthèse modèle (non stockée) si l'IA échoue. Des requêtes simultanées pour une même idée partagent un seul appel à l'IA (par processus API).

## Historique

- `GET /ideas` — liste des idées/analyses de l'utilisateur (si compte/session persistante)

## Règle de sécurité transversale

Tout endpoint qui débloque ou affiche une analyse complète doit vérifier server-side le statut réel du paiement en base — jamais uniquement un paramètre transmis par le client.
