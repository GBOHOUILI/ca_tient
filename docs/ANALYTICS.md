# ANALYTICS.md — Mesure

## Métriques MVP à suivre

- Visites de la landing page.
- Démarrages de test (clic sur "Tester mon idée").
- Simulations terminées (aperçu généré, écran 5 atteint).
- Scénarios explorés (utilisation du module "Et si… ?").
- Arrivées sur l'offre payante (écran 8).
- Paiements initiés vs paiements confirmés (taux de conversion réel).
- Rapports consultés / téléchargés.

## Pourquoi ces métriques

Le KPI principal du MVP est la conversion vers le paiement, pas le volume de trafic. Le funnel ci-dessus permet d'identifier précisément où les utilisateurs abandonnent (avant de voir le prix ? après ? pendant le paiement lui-même ?) pour ajuster prix, valeur perçue ou parcours — voir `docs/BUSINESS_RULES.md`.

## Implémentation

Outil léger pour le MVP (ex : plausible/umami/posthog en free-tier, ou simple table d'événements en base) — pas de dépendance lourde ni de tracking intrusif non nécessaire au stade MVP.
