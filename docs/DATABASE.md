# DATABASE.md — Modèle de données (proposition initiale)

À valider avant implémentation finale — ceci est une base de départ cohérente avec `USER_FLOWS.md` et `FINANCIAL_ENGINE.md`, pas un schéma figé.

## Entités principales

**User** *(si compte requis dès le MVP — sinon session anonyme liée à l'analyse)*
- id, email (optionnel), created_at

**Idea** (l'idée décrite par l'utilisateur)
- id, user_id (nullable), business_model (enum : ecommerce, formation, ebook, service, produit_physique, autre), raw_description (texte libre), created_at

**Hypothesis** (variable d'entrée)
- id, idea_id, key, label, value, unit, source (enum: ia_suggéré, utilisateur_saisi, utilisateur_ajouté)

**Simulation** (résultat d'un calcul du moteur)
- id, idea_id, type (enum : apercu, analyse_complete), inputs_snapshot (JSON des hypothèses utilisées), ca, marge_brute, resultat_estime, seuil_rentabilite, created_at

**Scenario**
- id, simulation_id, type (prudent, réaliste, ambitieux, crise, personnalisé), variations (JSON), resultat (JSON du recalcul)

**Payment**
- id, idea_id, provider (fedapay, kkiapay, test), provider_transaction_id, amount (1000 FCFA), status (pending, success, failed, canceled), created_at, confirmed_at

**Report**
- id, idea_id, payment_id, content (synthèse générée), variables_sensibles (JSON), created_at

## Règles de cohérence

- Une `Simulation` de type `analyse_complete` ne peut exister que si un `Payment` avec `status = success` est associé à l'`Idea` correspondante.
- `Payment.status` ne passe à `success` que via la vérification serveur du webhook (jamais mis à jour depuis une requête frontend directe).
- `inputs_snapshot` fige les hypothèses utilisées pour un résultat donné, pour garantir la traçabilité même si l'utilisateur modifie ensuite ses hypothèses.
