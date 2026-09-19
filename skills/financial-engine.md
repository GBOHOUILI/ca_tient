# skills/financial-engine.md

- Implémenter les formules de `docs/FINANCIAL_ENGINE.md` dans un module pur, sans dépendance IA ni HTTP.
- Utiliser une arithmétique décimale précise (pas de flottants natifs pour les montants) — bibliothèque de calcul décimal ou entiers en plus petite unité.
- Gérer explicitement les cas limites : marge unitaire nulle ou négative (seuil de rentabilité non atteignable), volume nul, coûts fixes nuls, valeurs négatives interdites en entrée.
- Chaque formule a des tests unitaires avec au minimum : cas nominal, cas limite (division par zéro évitée), cas extrême (très grands nombres, valeurs négatives rejetées) — voir `skills/testing.md`.
- Toute variable ajoutée librement par l'utilisateur (hors modèle standard) doit être classée (coût fixe / variable / autre) avant d'entrer dans le calcul.
