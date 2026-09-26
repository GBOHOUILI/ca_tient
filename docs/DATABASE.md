# DATABASE.md — Modèle de données (proposition initiale)

À valider avant implémentation finale — ceci est une base de départ cohérente avec `USER_FLOWS.md` et `FINANCIAL_ENGINE.md`, pas un schéma figé.

## Entités principales

**User** *(si compte requis dès le MVP — sinon session anonyme liée à l'analyse)*
- id, email (optionnel), created_at

**Idea** (l'idée décrite par l'utilisateur)
- id, user_id (nullable), business_model (enum : ecommerce, formation, ebook, service, produit_physique, autre), raw_description (texte libre), created_at
- `accessTokenHash` (`String?`, Phase 6b-1) : SHA-256 hex du jeton d'accès renvoyé une seule fois par `POST /ideas` (`accessToken`, jamais stocké en clair) ; `null` seulement pour les idées créées avant la Phase 6b-1 (devenues inaccessibles, aucune migration de données).
- `paidAt` (`DateTime?`, Phase 6b-1) : renseigné une seule fois, uniquement par la confirmation serveur d'un paiement (`PaymentService`), jamais par une requête frontend directe.

**Hypothesis** (variable d'entrée)
- id, idea_id, key, label, value, unit, source (enum: ia_suggéré, utilisateur_saisi, utilisateur_ajouté)

**Simulation** (résultat d'un calcul du moteur)
- id, idea_id, type (enum : apercu, analyse_complete), inputs_snapshot (JSON des hypothèses utilisées), ca, marge_brute, resultat_estime, seuil_rentabilite, created_at

**CanvasBlock** (bloc qualitatif du business model canvas, Phase 6a)
- id, idea_id, key (7 blocs : valueProposition, customerSegments, channels, customerRelationships, keyResources, keyActivities, keyPartners), content (≤ 500 caractères), source (enum : ia_suggere, utilisateur_edite) — unique (idea_id, key)

**Scenario**
- id, simulation_id, type (prudent, réaliste, ambitieux, crise, personnalisé), variations (JSON), resultat (JSON du recalcul)

**Payment** (modèle réel, Phase 6b-1 — remplace la proposition initiale ci-dessous)
- `id`, `ideaId`, `provider` (enum `PaymentProvider` : `test`, `fedapay` — pas encore `kkiapay`), `providerTransactionId` (`String?`, `null` tant que le provider n'a pas répondu), `amount` (entier, XOF, toujours 1000 au MVP), `currency` (`"XOF"`), `status` (enum `PaymentStatus` : `pending`, `approved`, `declined`, `canceled` — pas `success`/`failed`), `createdAt`, `confirmedAt` (`DateTime?`, renseigné uniquement au passage à `approved`)
- Contrainte unique `(provider, providerTransactionId)` : sert de clé de recherche idempotente pour le webhook (`payment.service.ts#handleProviderUpdate`). Index sur `ideaId`.
- Machine à états (`payment-state.ts`) : un `Payment` ne change de statut que depuis `pending` ; `approved`/`declined`/`canceled` sont tous terminaux (un nouvel essai crée un nouveau `Payment`, jamais une réécriture de l'ancien). Le passage à `approved` fixe `confirmedAt` et, dans la même transaction, `Idea.paidAt` s'il est encore vide.

**Report**
- id, idea_id, payment_id, content (synthèse générée), variables_sensibles (JSON), created_at

## Règles de cohérence

- Une `Simulation` de type `analyse_complete` ne peut exister que si `Idea.paidAt` est renseigné.
- `Payment.status` ne passe à `approved` (et `Idea.paidAt` ne se renseigne) que via la vérification serveur (webhook signé + relecture chez FedaPay, ou relecture au polling) — jamais depuis une requête frontend directe.
- `inputs_snapshot` fige les hypothèses utilisées pour un résultat donné, pour garantir la traçabilité même si l'utilisateur modifie ensuite ses hypothèses.
