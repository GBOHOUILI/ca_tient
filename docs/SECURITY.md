# SECURITY.md — Principes de sécurité

## Paiement

- Vérification de signature obligatoire sur tous les webhooks FedaPay (`X-FEDAPAY-SIGNATURE`).
- Traitement idempotent des webhooks (voir `PAYMENT.md`).
- Aucune action de déblocage d'analyse ne doit pouvoir être déclenchée directement par le frontend — uniquement par confirmation serveur.

## API

- Endpoints sensibles (accès à une analyse complète, statut de paiement) protégés par une vérification d'appartenance (l'idée/l'analyse demandée doit appartenir à la session/l'utilisateur courant).
- Rate limiting sur les endpoints publics (création d'idée, suggestion IA) pour limiter les abus et la consommation de l'API IA/paiement.
- Validation stricte des entrées utilisateur (bornes numériques sur prix/volumes/coûts — voir `FINANCIAL_ENGINE.md`) pour éviter les injections ou les valeurs aberrantes.

## Données

- Ne pas stocker de données de paiement sensibles (numéros de carte, identifiants bancaires) — FedaPay gère la capture des moyens de paiement, le backend ne stocke que l'identifiant de transaction et son statut.
- Description libre de l'idée : traitée comme donnée utilisateur standard, pas de traitement spécial requis sauf si l'utilisateur y inclut des données personnelles sensibles (à surveiller si le produit évolue).

## Environnements

- Clés API (FedaPay, IA) en variables d'environnement, jamais committées.
- Environnement de développement utilise `TestProvider` (paiement simulé) — jamais les clés de production FedaPay en local.
