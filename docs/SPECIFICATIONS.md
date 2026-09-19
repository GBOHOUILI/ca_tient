# SPECIFICATIONS.md — Fonctionnalités détaillées

## Modèles de business supportés

Le produit est générique ; les questions posées s'adaptent au modèle choisi.

- **E-commerce** : prix, ventes/jour ou mois, coût produit, livraison, publicité, commissions, autres coûts.
- **Formation** : prix, ventes/mois, coût de production, plateforme, publicité, temps de production.
- **E-book** : prix, ventes, commissions, publicité, coûts de création.
- **Service** : prix, nombre de clients, coût direct, sous-traitance, outils, temps.
- **Produit physique** : prix, volume, matières/achat, production, logistique, pertes.
- **Autre** : variables définies progressivement par l'IA puis validées par l'utilisateur.

## Formulaire guidé (écran Hypothèses)

- L'IA extrait un premier jeu de variables à partir de la description libre.
- Chaque variable proposée est éditable et a une valeur par défaut raisonnable si le contexte le permet.
- L'utilisateur peut ajouter une variable non prévue (champ libre) sans casser le moteur (voir `FINANCIAL_ENGINE.md` pour la gestion des variables non standard).

## Module "Et si… ?"

- Sliders/inputs sur les variables clés : prix, volume de ventes, coûts, publicité, saisonnalité.
- Recalcul en temps réel via le moteur financier (jamais l'IA).
- Visualisation immédiate de l'impact sur CA, marge, seuil de rentabilité.

## Scénarios

- Prudent, réaliste, ambitieux, crise : générés à partir de règles définies (pourcentages de variation appliqués aux hypothèses de base — voir `FINANCIAL_ENGINE.md`).
- Scénario personnalisé : l'utilisateur définit ses propres variations.

## Rapport final

- Synthèse en langage simple (généré par l'IA à partir des résultats du moteur, jamais l'inverse).
- Rappel explicite : "aide à la décision, pas une garantie de rentabilité".
- Variables sensibles mises en avant (celles dont une petite variation change fortement le résultat).
- Export/consultation ultérieure de l'analyse (historique).
