# Phase 6b-2b — Analytics — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Funnel jusqu'au paiement, sans cookie ni donnée personnelle, consultable sur `/admin/stats` protégée par `ADMIN_KEY`.

**Architecture:** Table `AnalyticsEvent` alimentée par `POST /analytics/events` (étapes sans vérité en base) ; `AnalyticsService.funnel` combine ces événements (valeurs distinctes) avec `Idea`, `Payment` et `IdeaAccessToken` ; `AdminKeyGuard` en temps constant ; côté web, `trackEvent` + composant `TrackEvent`, page `/admin/stats`.

**Tech Stack:** NestJS 12, Prisma 7, `@nestjs/throttler`, `node:crypto`, Next.js 16.

**Spec:** `docs/superpowers/specs/2026-10-02-phase-6b2b-analytics-design.md`

## Global Constraints

- Aucun cookie, aucune IP ni user-agent stocké, aucune dépendance ajoutée.
- Comptes en valeurs distinctes ; paiements lus en base, jamais depuis un événement.
- `ADMIN_KEY` absente → 404 ; mauvaise clé → 401 ; comparaison `timingSafeEqual` sur SHA-256.
- Un échec d'envoi d'événement n'affecte jamais le parcours.

## Review Focus

1. StrictMode/rechargements : doubles événements → comptés une fois (test « same session counted once »).
2. Idée supprimée après un événement : aucune contrainte de clé étrangère (pas de FK sur `ideaId`).
3. `sessionStorage` indisponible (navigation privée stricte) : repli en mémoire, aucune exception.
4. `ADMIN_KEY` avec espaces en fin (copier-coller dans `.env`) : la clé est `trim()` des deux côtés.
5. Période `all` sur une base vide : tous les compteurs à 0, pas de division par zéro côté page (passage affiché « — »).

---

### Task 1: Schéma

- [ ] Enum `AnalyticsEventType`, modèle `AnalyticsEvent` (spec) ; migration générée par `prisma migrate diff --from-config-datasource --to-schema` (dossier `<timestamp>_add_analytics_events`), appliquée par `migrate deploy` en dev et `db:test:migrate`.
- [ ] Commit `feat(api): table des evenements analytics (Phase 6b-2b)`.

### Task 2: API analytics + admin

**Files:** Create `apps/api/src/analytics/{analytics.module.ts,analytics.controller.ts,analytics.service.ts,admin-key.guard.ts,dto/track-event.dto.ts,analytics.http.spec.ts}` ; Modify `apps/api/src/app.module.ts`.

- [ ] Test HTTP (RED) : cas listés dans la spec (« Tests »), `process.env.ADMIN_KEY` posé/retiré par test, dates d'événements et d'idées réécrites par Prisma pour le filtrage par période.
- [ ] Run → FAIL (module absent).
- [ ] Implémenter DTO (`IsIn`, `Matches`, `Length`, `IsOptional`), service (`funnel(period, now = new Date())`), garde, contrôleur (`POST analytics/events` 204 + throttle 60/min ; `GET admin/stats`), module, `AppModule`.
- [ ] Run → PASS ; suite API, build, lint. Commit `feat(api): evenements analytics et statistiques du funnel (Phase 6b-2b)`.

### Task 3: Web

**Files:** Create `apps/web/src/lib/analytics.ts`, `apps/web/src/components/analytics/TrackEvent.tsx`, `apps/web/src/app/admin/layout.tsx`, `apps/web/src/app/admin/stats/page.tsx` ; Modify `apps/web/src/app/page.tsx`, `apps/web/src/app/commencer/page.tsx`, `apps/web/src/app/analyse/[ideaId]/page.tsx`, `apps/web/src/components/analyse/ReportView.tsx`.

- [ ] `trackEvent` + `TrackEvent` ; instrumentation des 6 événements ; page admin.
- [ ] `tsc` + lint web. Commit `feat(web): mesure du funnel et page de statistiques (Phase 6b-2b)`.

### Task 4: Docs + vérification

- [ ] ANALYTICS.md, API.md, DECISIONS, `.env.example`, TODO, CHANGELOG.
- [ ] curl sur l'API de vérification (avec `ADMIN_KEY`) : événements envoyés puis stats cohérentes.
- [ ] Commit `docs: analytics minimal (Phase 6b-2b)`.
