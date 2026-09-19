# BUSINESS_RULES.md — Règles métier

## Règle centrale : paiement avant analyse

Les 1 000 FCFA sont le prix d'accès à l'**analyse complète**. L'utilisateur doit :
1. Connaître le prix AVANT de commencer.
2. Payer AVANT que l'analyse détaillée / la simulation complète ne lui soit montrée.

Détail par étape :
- **Landing page** : promesse claire + « 1 000 FCFA pour analyser ton idée ».
- **Avant paiement** : afficher ce que comprend l'analyse, les modèles supportés, les résultats attendus. Aucune analyse détaillée ni simulation complète n'est visible à ce stade.
- **Paiement** : déclenche la création de la session d'analyse après confirmation serveur.
- **Après paiement** : accès immédiat au parcours complet.
- Le module "Et si… ?" et les scénarios font partie de l'analyse payée — ils ne servent jamais de paywall après une version gratuite dégradée.

## Modèle commercial

- Prix unique : 1 000 FCFA par analyse d'idée.
- Une transaction = une session d'analyse complète.
- Aucun abonnement, aucun frais caché dans le MVP.
- Le produit ne promet pas qu'une idée est « rentable » ; il montre des résultats selon les hypothèses fournies par l'utilisateur — toujours accompagné d'un rappel que c'est une aide à la décision, pas une garantie.

## Règle sur les calculs

Les calculs financiers ne sont jamais confiés à l'IA. Voir `FINANCIAL_ENGINE.md` pour le détail des formules et `AI_ENGINE.md` pour les limites du rôle de l'IA.

## KPI de validation commerciale

- Jalon 1 : prototype utilisable.
- Jalon 2 : 10 utilisateurs testent réellement le parcours.
- Jalon 3 : au moins 5 personnes paient 1 000 FCFA.
- Jalon 4 : 20 paiements cumulés, ou assez de données pour comprendre les objections.

Si les utilisateurs testent mais ne paient pas → analyser le prix, la valeur perçue, le rapport et le parcours avant d'ajouter des fonctionnalités.
Si les paiements arrivent → améliorer progressivement et réinvestir une partie des revenus.
