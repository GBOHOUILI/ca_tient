# DECISIONS.md — Journal des décisions

Format : `[Date] Décision — Raison — Alternatives écartées`

- **Fournisseur de paiement MVP : FedaPay** — l'IFU professionnel a été obtenu, éligibilité confirmée pour ce statut. Kkiapay écarté pour le MVP faute de RCCM (nécessaire pour un compte marchand actif au Bénin côté Kkiapay). Architecture `PaymentService` maintenue abstraite pour ajouter Kkiapay plus tard sans réécrire le produit.
- **Prix unique 1 000 FCFA, sans abonnement** — pour tester une hypothèse de valeur simple avant toute complexité de facturation récurrente.
- **Calculs financiers hors IA** — fiabilité et prévisibilité des chiffres affichés jugées non négociables ; l'IA reste cantonnée à la compréhension, la suggestion et l'explication.
- **Stack : Next.js + NestJS + PostgreSQL** — cohérent avec les compétences déjà en place et les besoins du MVP (pas de sur-ingénierie).
- **ORM : Prisma** — retenu pour la base de données PostgreSQL (migrations via Prisma Migrate, schéma dans `schema.prisma` comme source de vérité). TypeORM écarté.
- **Couleur de marque : vert émeraude (`emerald-500 #059669`)**, dégradé avec le cyan — le violet initialement proposé a été écarté. Distinct du vert sémantique `success` (voir `design/COLORS.md`).

- **[2026-09-19] Structure du dépôt : monorepo pnpm workspaces** (`apps/web`, `apps/api`) — équipe solo au MVP, partage futur de types entre front/back, déploiement coordonné plus simple. Repos séparés écartés : se justifieraient avec une équipe aux accès/pipelines distincts, pas le cas ici.
- **[2026-09-19] Prisma épinglé en 7.10.0 (pas `latest`)** — le tag npm `latest` de `prisma` pointe vers une release candidate (`8.0.0-rc.x`) au moment du bootstrap ; 7.10.0 est la dernière version stable (tag `prev`). À remonter en 8.x quand cette version sera stabilisée, avec une entrée dédiée.

*(À compléter au fil du projet — toute décision structurante doit être ajoutée ici avant d'être considérée comme actée, conformément à `CLAUDE.md`.)*
