# API.md — Endpoints (proposition initiale)

À affiner selon l'implémentation NestJS réelle — sert de contrat de départ entre frontend et backend.

## Idées et hypothèses

- `POST /ideas` — crée une idée (description libre + modèle de business optionnel)
- `PUT /ideas/:id` — met à jour la même idée (même corps que `POST /ideas`), remplace ses hypothèses et sa simulation d'aperçu, conserve ses blocs de canvas ; utilisé quand l'utilisateur revient en arrière dans le wizard
- `GET /ideas/:id` — relit l'idée, ses hypothèses et sa simulation d'aperçu
- `POST /ideas/suggest-hypotheses` — l'IA propose les 4 hypothèses à partir de la description (sans persistance, `{ available: false }` si l'IA ne répond pas)
- `POST /ideas/suggest-canvas-blocks` — l'IA propose les 7 blocs qualitatifs du canvas (même contrat)
- `PATCH /ideas/:id/canvas-blocks` — enregistre les 7 blocs validés/édités par l'utilisateur

## Simulation

- Pas d'endpoint dédié : l'aperçu (CA, marge, seuil) est calculé par `POST`/`PUT /ideas`, les scénarios et le module « Et si ? » sont recalculés côté navigateur par le package partagé `financial-engine` (voir `docs/DECISIONS.md`, 2026-09-20).

## Paiement

- `POST /ideas/:id/payment/intent` — crée une intention de paiement côté backend (jamais côté frontend)
- `POST /payment/webhook/fedapay` — reçoit et vérifie les webhooks FedaPay (signature obligatoire)
- `GET /ideas/:id/payment/status` — statut du paiement pour affichage (polling léger côté frontend en complément du webhook)

## Analyse complète et rapport

- `GET /ideas/:id/analysis` — retourne l'analyse complète (protégé : nécessite `payment.status = success`)
- `GET /ideas/:id/report` — retourne le rapport final formaté

## Historique

- `GET /ideas` — liste des idées/analyses de l'utilisateur (si compte/session persistante)

## Règle de sécurité transversale

Tout endpoint qui débloque ou affiche une analyse complète doit vérifier server-side le statut réel du paiement en base — jamais uniquement un paramètre transmis par le client.
