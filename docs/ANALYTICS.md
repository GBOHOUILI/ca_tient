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

## Implémentation (Phase 6b-2b)

Table d'événements maison (`AnalyticsEvent`), aucune dépendance, aucun cookie, aucune IP ni user-agent stocké. Spec : `docs/superpowers/specs/2026-10-02-phase-6b2b-analytics-design.md`.

- **Envoyés par le site** (`POST /analytics/events`, `trackEvent` dans `apps/web/src/lib/analytics.ts`) : `landing_view`, `test_started`, `offer_viewed`, `what_if_used`, `report_viewed`, `report_printed`. Un `sessionId` aléatoire par onglet (`sessionStorage`) : on compte des sessions, pas des personnes.
- **Lus en base** (fiables, fixés par le serveur) : aperçus générés (`Idea`), paiements initiés (`Payment`), paiements confirmés (`Idea.paidAt`), analyses retrouvées par code (`IdeaAccessToken`).
- **Comptes distincts** (sessions ou idées) : rechargements et doubles rendus ne gonflent rien.
- **Consultation** : dashboard `/admin` (non indexé, clé `ADMIN_KEY`), onglet Conversion pour le funnel (7, 30, 90 jours ou depuis le début) ; `/admin/stats` y redirige. Le profil déclaré et la source UTM (collecte du 2026-10-02) permettent en plus les ventilations par type, pays et source.

Correspondance avec la liste ci-dessus : « simulations terminées » = aperçus générés ; « scénarios explorés » = « Et si ? » utilisé ; « rapports téléchargés » = rapports imprimés / enregistrés en PDF.
