# USER_FLOWS.md — Parcours utilisateur

| # | Écran | Expérience |
|---|-------|-----------|
| 1 | Landing page | « Teste ton idée avant d'investir. » → CTA « Tester mon idée » |
| 2 | Type de business | E-commerce, formation, e-book, service, produit, autre |
| 3 | Description | L'utilisateur décrit son idée en langage naturel |
| 4 | Hypothèses | L'IA propose les variables pertinentes ; l'utilisateur les confirme/corrige |
| 5 | Ton business model | 7 blocs qualitatifs du canvas (proposition de valeur, segments clients, etc.), suggérés par l'IA, validés/édités par l'utilisateur |
| 6 | Aperçu | CA, coûts, marge, bénéfice, seuil de rentabilité et indicateurs clés — niveau aperçu, gratuit, pas encore l'analyse complète |
| 7 | Offre analyse complète | Proposition du test complet à 1 000 FCFA, rappel « aide à la décision, pas une garantie », détail de ce qui est inclus |
| 8 | Paiement | Redirection vers la page hébergée FedaPay → paiement → vérification côté serveur (webhook signé + relecture de la transaction) |
| 9 | Et si… ? | Modification des prix, ventes, coûts, saisonnalité, etc. — accessible uniquement après confirmation serveur du paiement |
| 10 | Scénarios | Prudent, réaliste, ambitieux, crise, et scénario personnalisé |
| 11 | Rapport (Phase 6b-2) | Synthèse, capital et besoin financier, business model canvas complet, variables sensibles, points à surveiller |

## Points de rupture à gérer explicitement

- **Paiement annulé/échoué** : écran « Le paiement n'a pas abouti », rien n'est perdu (les hypothèses restent enregistrées), bouton « Réessayer le paiement ».
- **Paiement en attente (pending)** : écran d'attente, nouvelle vérification du statut auprès du serveur toutes les 3 secondes pendant 2 minutes ; passé ce délai, message « paiement toujours en cours » avec bouton « Vérifier à nouveau ». Jamais de faux « succès » avant confirmation serveur.
- **Utilisateur qui revient plus tard** : possible depuis le même navigateur, via `/analyse/<id>` (le jeton d'accès est lu dans `localStorage`) ; depuis un autre navigateur ou après effacement du stockage local, l'accès est refusé (pas de compte au MVP, voir `docs/DECISIONS.md`).
- **Idée hors modèles supportés** : le modèle "Autre" prend le relais, variables définies progressivement par l'IA puis validées par l'utilisateur.
