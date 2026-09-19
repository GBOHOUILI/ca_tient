# USER_FLOWS.md — Parcours utilisateur

| # | Écran | Expérience |
|---|-------|-----------|
| 1 | Landing page | « Teste ton idée avant d'investir. » → CTA « Tester mon idée » |
| 2 | Type de business | E-commerce, formation, e-book, service, produit, autre |
| 3 | Description | L'utilisateur décrit son idée en langage naturel |
| 4 | Hypothèses | L'IA propose les variables pertinentes ; l'utilisateur les confirme/corrige |
| 5 | Simulation (aperçu) | CA, coûts, marge, bénéfice, seuil de rentabilité et indicateurs clés — niveau aperçu, pas encore l'analyse complète |
| 6 | Et si… ? | Modification des prix, ventes, coûts, publicité, saisonnalité, etc. |
| 7 | Scénarios | Prudent, réaliste, ambitieux, crise, et scénario personnalisé |
| 8 | Offre analyse complète | Proposition du test complet à 1 000 FCFA, avec détail de ce qui est inclus |
| 9 | Paiement | Redirection FedaPay → paiement → vérification côté serveur (webhook) |
| 10 | Rapport | Synthèse, hypothèses, scénarios, variables sensibles, points à surveiller |

## Points de rupture à gérer explicitement

- **Paiement annulé/échoué** : retour à l'écran 8, aucune donnée d'analyse n'est perdue, l'utilisateur peut réessayer.
- **Paiement en attente (pending)** : écran d'attente avec vérification asynchrone (polling ou webhook), pas de faux "succès" avant confirmation serveur.
- **Utilisateur qui revient plus tard** : historique des analyses déjà payées accessible (si compte/session persistante prévue pour le MVP).
- **Idée hors modèles supportés** : le modèle "Autre" prend le relais, variables définies progressivement par l'IA puis validées par l'utilisateur.
