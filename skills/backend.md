# skills/backend.md

## Stack

NestJS + TypeScript, PostgreSQL avec **Prisma** comme ORM (voir `docs/DECISIONS.md`).

## Structure attendue

- Modules par domaine fonctionnel : `ideas`, `hypotheses`, `simulations`, `scenarios`, `payments`, `reports` — alignés sur `docs/DATABASE.md` et `docs/API.md`.
- Le module `financial-engine` est un module pur (pas de dépendance à l'IA ni à la couche HTTP) — testable en isolation, voir `docs/FINANCIAL_ENGINE.md` et `skills/financial-engine.md`.
- Le module `payment` encapsule `PaymentService` + providers (`FedaPayProvider`, `TestProvider`) derrière une interface commune — voir `docs/PAYMENT.md`.

## Règles

- Toute route qui débloque une analyse complète vérifie le statut de paiement en base, jamais un paramètre de requête.
- Validation stricte des DTO (class-validator ou équivalent) sur toutes les entrées, en particulier les hypothèses financières (bornes numériques).
- Logging structuré des événements de paiement (création d'intention, réception webhook, résultat de vérification) pour pouvoir tracer un litige.
