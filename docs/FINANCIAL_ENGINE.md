# FINANCIAL_ENGINE.md — Moteur financier

## Règle fondamentale

Les calculs financiers ne doivent jamais être confiés à l'IA. Le backend applique des formules déterministes et testées. L'IA peut proposer ou expliquer des hypothèses, mais tout chiffre affiché à l'utilisateur provient exclusivement du moteur.

## Formules de base

- **Chiffre d'affaires (CA)** = prix × volume de ventes
- **Marge brute** = CA − coûts variables
- **Résultat estimé** = CA − coûts variables − coûts fixes
- **Seuil de rentabilité** = coûts fixes / (prix − coût variable unitaire), soit le volume de ventes nécessaire pour couvrir l'ensemble des coûts
- **Analyse de sensibilité** = mesurer l'effet d'une variation d'une hypothèse (ex : ±10 % sur le prix ou le volume) sur le résultat estimé

## Scénarios — règles de génération

Chaque scénario applique un jeu de variations prédéfinies aux hypothèses de base (à calibrer par modèle de business, ex : volume, prix, coûts) :

| Scénario | Volume | Prix | Coûts |
|---|---|---|---|
| Prudent | -20 % | inchangé | +10 % |
| Réaliste | hypothèses de base | hypothèses de base | hypothèses de base |
| Ambitieux | +30 % | inchangé | inchangé |
| Crise | -40 % | -10 % (pression concurrentielle) | +15 % |
| Personnalisé | défini par l'utilisateur | défini par l'utilisateur | défini par l'utilisateur |

*(Ces coefficients sont un point de départ — à valider/ajuster avant implémentation finale, éventuellement par modèle de business.)*

## Capital, sensibilité, points à surveiller (Phase 6b-2a)

Fonctions pures de `packages/financial-engine` (`capital.ts`, `sensitivity.ts`, `watch-points.ts`).

- **Capital nécessaire** = dépenses de départ (matériel + stock de départ + frais d'ouverture + autres) + réserve de trésorerie de `CASH_RESERVE_MONTHS` = **3 mois** de charges fixes. **Besoin de financement** = max(0, capital nécessaire − capital disponible) ; sinon **excédent** = capital disponible − capital nécessaire. Forfait plutôt que cumul des pertes jusqu'au point mort : le moteur n'a pas de montée en charge, ce cumul vaudrait 0 dès que le mois type est rentable.
- **Variables sensibles** : chaque hypothèse (prix, volume, coût variable, charges fixes) varie de ±`SENSITIVITY_PERCENT` = **10 %** ; impact = plus grand écart du résultat mensuel ; tri par impact décroissant (égalité : prix, volume, coût variable, charges fixes).
- **Points à surveiller** (codes, texte côté web) :

| Code | Règle |
|---|---|
| `non_positive_unit_margin` | prix − coût variable unitaire ≤ 0 |
| `below_break_even` | marge unitaire > 0 et volume < seuil de rentabilité |
| `thin_gross_margin` | marge unitaire > 0, CA > 0 et marge brute < `THIN_MARGIN_PERCENT` = **20 %** du CA (comparaison en entiers) |
| `prudent_scenario_loss` | résultat de base ≥ 0 et résultat du scénario prudent < 0 |
| `financing_gap` | capital saisi et besoin de financement > 0 |
| `no_cash_reserve` | capital saisi et capital disponible < dépenses de départ |

## Points de robustesse à respecter dans l'implémentation

- **Précision des calculs** : ne pas utiliser l'arithmétique flottante native pour les montants (FCFA étant une devise sans décimales, travailler en entiers/centimes ou avec une librairie de précision décimale pour éviter les erreurs d'arrondi cumulées).
- **Limites numériques** : valider les bornes des entrées utilisateur (prix, volumes, coûts) pour éviter les dépassements de capacité ou les résultats aberrants (division par zéro sur le seuil de rentabilité si marge unitaire nulle ou négative — cas à gérer explicitement).
- **Variables non standard** : si l'utilisateur ajoute une variable libre non prévue par le modèle, elle doit être classée (coût fixe / coût variable / autre) avant d'entrer dans le calcul, jamais interprétée silencieusement par l'IA dans le résultat chiffré.
- **Tests** : chaque formule doit avoir des tests unitaires avec des cas types (marge nulle, marge négative, volume nul, coûts fixes nuls) — voir `skills/testing.md`.
