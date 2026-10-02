# Phase 6b-2b — Analytics minimal — Design

Date : 2026-10-02
Statut : validé en conversation le 2026-10-02.
Sources : `docs/ANALYTICS.md`, `docs/MVP_SCOPE.md` (« Analytics minimal : visites, démarrages de test, simulations terminées, paiements »), `docs/BUSINESS_RULES.md` (KPI de validation commerciale).

## Objectif

Mesurer le funnel jusqu'au paiement pour savoir où les visiteurs abandonnent, sans cookie, sans donnée personnelle et sans dépendance. Le KPI principal est la conversion vers le paiement confirmé.

Critères de succès :
- une page `/admin/stats`, protégée par une clé, affiche le funnel sur 7 jours, 30 jours ou depuis le début, avec le taux de passage d'une étape à l'autre ;
- les chiffres de paiement viennent des tables `Payment`/`Idea` (fixés par le serveur), jamais d'un événement envoyé par le navigateur ;
- un envoi d'événement en échec ne gêne jamais le parcours ;
- les doubles envois (re-rendu, StrictMode, rechargement) ne gonflent pas les chiffres.

## Décisions

| Sujet | Décision |
|---|---|
| Outil | Table d'événements maison, aucune dépendance. |
| Identité | `sessionId` aléatoire par onglet (`sessionStorage`), aucun cookie, aucune IP, aucun user-agent stocké. Compte des sessions, pas des personnes. |
| Dédoublonnage | Toutes les étapes se comptent en valeurs **distinctes** (sessions ou idées), pas en nombre de lignes. |
| Source de vérité | Aperçus = idées créées (`Idea.createdAt`) ; paiements initiés = idées ayant au moins un `Payment` créé sur la période ; paiements confirmés = `Idea.paidAt` sur la période ; récupérations = `IdeaAccessToken.createdAt`. |
| Consultation | `GET /admin/stats` + page `/admin/stats`, clé `ADMIN_KEY` (en-tête `x-admin-key`, comparaison en temps constant). `ADMIN_KEY` absente → 404 (fonction désactivée). Clé fausse → 401. |

## Événements envoyés par le site

| Type | Moment | `ideaId` |
|---|---|---|
| `landing_view` | affichage de la landing | — |
| `test_started` | arrivée sur `/commencer` | — |
| `offer_viewed` | affichage de l'écran d'offre | oui |
| `what_if_used` | première modification d'un réglage « Et si ? » | oui |
| `report_viewed` | affichage de l'écran « Ton rapport » | oui |
| `report_printed` | clic sur « Imprimer / Enregistrer en PDF » | oui |

## Données (Prisma)

```prisma
enum AnalyticsEventType {
  landing_view
  test_started
  offer_viewed
  what_if_used
  report_viewed
  report_printed
}

model AnalyticsEvent {
  id        String             @id @default(cuid())
  type      AnalyticsEventType
  sessionId String
  ideaId    String?            // pas de clé étrangère : un événement ne doit jamais échouer à cause d'une idée supprimée
  createdAt DateTime           @default(now())

  @@index([type, createdAt])
}
```

## API (`apps/api/src/analytics/`, module `AnalyticsModule`)

- `POST /analytics/events` — public, `ThrottlerGuard` 60/min/IP, `204`. DTO : `type` dans la liste ci-dessus, `sessionId` 8–64 caractères `[A-Za-z0-9-]`, `ideaId` facultatif ≤ 40 caractères `[A-Za-z0-9]`. `400` sinon.
- `GET /admin/stats?period=7d|30d|all` (défaut `30d`) — `AdminKeyGuard`. Réponse :
  ```ts
  {
    period: "7d" | "30d" | "all",
    from: string | null,                // ISO, null pour "all"
    steps: { key: FunnelStepKey; count: number }[],
    reportPrinted: number,
    recoveries: number,
  }
  ```
  `FunnelStepKey`, dans l'ordre : `landing_view` (sessions), `test_started` (sessions), `preview` (idées créées), `offer_viewed` (idées), `payment_initiated` (idées), `payment_confirmed` (idées), `what_if_used` (idées), `report_viewed` (idées).
- `AdminKeyGuard` : lit `process.env.ADMIN_KEY` à chaque requête ; compare les SHA-256 des deux clés avec `timingSafeEqual`.
- `AnalyticsService.funnel(period, now)` : requêtes Prisma `groupBy`/`count` distinctes ; `now` injecté pour les tests.

## Web

- `lib/analytics.ts` : `trackEvent(type, ideaId?)` — `sessionId` lu/créé dans `sessionStorage` (repli en mémoire si indisponible), `fetch(..., { keepalive: true })`, toute erreur ignorée, aucun appel côté serveur (SSR).
- `components/analytics/TrackEvent.tsx` : composant client sans rendu qui envoie un événement au montage ; posé sur la landing (`landing_view`) et `/commencer` (`test_started`).
- `/commencer` : `offer_viewed` à l'affichage de l'offre. `/analyse/[id]` : `what_if_used` au premier réglage, `report_viewed` à l'affichage du rapport, `report_printed` au clic d'impression.
- `/admin/stats` (client) : champ clé (gardée en `sessionStorage`), sélecteur de période, tableau « étape · nombre · passage depuis l'étape précédente » plus « rapports imprimés » et « analyses retrouvées par code ». Message clair sur 401 (« clé incorrecte ») et 404 (« statistiques désactivées : ADMIN_KEY non configurée »). `robots: noindex` via `app/admin/layout.tsx`.

## Tests

- `analytics.http.spec.ts` (base de test) : `POST /analytics/events` 204 et ligne créée ; type inconnu, `sessionId` invalide → 400 ; `GET /admin/stats` sans `ADMIN_KEY` → 404, mauvaise clé → 401 ; funnel : sessions distinctes (deux `landing_view` de la même session = 1), idées créées, paiements initiés (deux paiements de la même idée = 1), paiements confirmés, récupérations, filtrage par période (événement daté de 40 jours exclu de `30d`, inclus dans `all`).

## Documentation

`docs/ANALYTICS.md` (implémentation réelle), `docs/API.md`, `docs/DECISIONS.md`, `apps/api/.env.example` (`ADMIN_KEY`), `tasks/TODO.md`, `tasks/CHANGELOG.md`.

## Hors scope

Dashboard admin avec comptes, export, graphiques, rétention/suppression automatique, suivi par utilisateur, analytics côté FedaPay.
