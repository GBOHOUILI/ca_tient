# AI_ENGINE.md — Rôle de l'IA

## Ce que l'IA fait

- Comprendre la description libre de l'utilisateur.
- Identifier le modèle économique probable (e-commerce, formation, e-book, service, produit physique, autre).
- Proposer les variables pertinentes pour ce modèle.
- Repérer les informations manquantes et poser des questions de clarification.
- Générer les scénarios à partir des règles définies dans `FINANCIAL_ENGINE.md` (l'IA choisit/ajuste les paramètres de variation si besoin, mais ne calcule jamais elle-même le résultat).
- Expliquer les résultats renvoyés par le moteur en langage simple, pour le rapport final.

## Ce que l'IA ne fait JAMAIS

- Elle n'invente ni ne modifie silencieusement un calcul financier.
- Elle ne renvoie jamais un chiffre (CA, marge, seuil de rentabilité) directement à l'utilisateur sans qu'il soit passé par le moteur déterministe.
- Elle ne décide pas seule qu'un paiement a réussi.

## Architecture

- Fournisseur IA interchangeable (couche d'abstraction, pas de dépendance dure à un seul provider).
- Pour le MVP : privilégier une API économique / free-tier tant que le volume le permet.
- Prévoir un mode dégradé si le fournisseur IA est indisponible (a minima, formulaire manuel de saisie des hypothèses sans extraction automatique).
