# skills/database.md

- Suivre le schéma de départ dans `docs/DATABASE.md`, l'ajuster si besoin mais documenter tout changement structurant dans `docs/DECISIONS.md`.
- Migrations versionnées via **Prisma Migrate** (pas de modification manuelle de schéma en production ; `schema.prisma` fait foi).
- `inputs_snapshot` (hypothèses figées au moment du calcul) stocké en JSON pour garantir la traçabilité d'une analyse même si l'utilisateur modifie ses hypothèses ensuite.
- Index sur les clés utilisées pour les vérifications de paiement (`provider_transaction_id`, `idea_id`) pour garder les webhooks rapides.
