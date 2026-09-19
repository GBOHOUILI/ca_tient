# API.md — Endpoints (proposition initiale)

À affiner selon l'implémentation NestJS réelle — sert de contrat de départ entre frontend et backend.

## Idées et hypothèses

- `POST /ideas` — crée une idée (description libre + modèle de business optionnel)
- `POST /ideas/:id/hypotheses/suggest` — l'IA propose des variables à partir de la description
- `PUT /ideas/:id/hypotheses` — l'utilisateur confirme/corrige les hypothèses

## Simulation

- `POST /ideas/:id/simulate` — calcule un aperçu (CA, marge, seuil de rentabilité) à partir des hypothèses courantes
- `POST /ideas/:id/scenarios` — génère les scénarios (prudent, réaliste, ambitieux, crise, personnalisé)

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
