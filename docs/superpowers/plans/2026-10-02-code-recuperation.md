# Code de récupération — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un utilisateur qui a payé obtient un code `CT-XXXXX-XXXXX` qui rouvre son analyse depuis n'importe quel navigateur.

**Architecture:** Fonctions pures de code (`recovery-code.ts`), `RecoveryModule` NestJS (service + contrôleur), table `IdeaAccessToken` pour les jetons émis par récupération, `IdeaAccessGuard` étendu. Côté web : encart du code sur l'analyse payée, page `/retrouver`.

**Tech Stack:** NestJS 12, Prisma 7, `@nestjs/throttler`, `node:crypto`, Next.js 16.

**Spec:** `docs/superpowers/specs/2026-10-02-code-recuperation-design.md`

## Global Constraints

- Code : `CT-` + 10 caractères Crockford base32 sans `I L O U`, présenté `CT-XXXXX-XXXXX`.
- Stockage : SHA-256 hex du code normalisé uniquement.
- `POST /recovery` : 5 requêtes/min/IP ; 404 neutre pour tout code invalide.
- Aucune dépendance ajoutée. Jeton d'origine toujours valide.

## Review Focus

1. Code saisi avec espaces, minuscules, `O` à la place de `0` : doit marcher (test de normalisation + test HTTP `ct 7k4mq…`).
2. Deux échanges du même code : deux jetons valides, aucun conflit (`tokenHash` unique, jetons aléatoires).
3. Idée remise à `paidAt = null` (remboursement manuel) : le code ne rouvre plus rien (test HTTP).
4. Ancien navigateur après récupération ailleurs : garde l'accès (test HTTP).
5. Collision de `recoveryCodeHash` (unique) : probabilité négligeable à 50 bits ; un `P2002` remonterait en 500, accepté.

---

### Task 1: Fonctions de code (pur)

**Files:** Create `apps/api/src/recovery/recovery-code.ts`, `apps/api/src/recovery/recovery-code.spec.ts`

**Produces:** `RECOVERY_ALPHABET`, `generateRecoveryCode(): string`, `normalizeRecoveryCode(input: string): string | null`, `hashRecoveryCode(normalized: string): string`

- [ ] Test (RED) : format `/^CT-[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}$/` ; 1 000 codes distincts ; `normalizeRecoveryCode("ct 7k4mq-9xp2r")` → `"7K4MQ9XP2R"` ; `"CT-OOIIL-LLLLL"` → `"00111" + "11111"` ; préfixe `CT` facultatif ; longueur ≠ 10 ou caractère `U`/`*` → `null` ; `normalize(generate())` non nul ; `hashRecoveryCode` = SHA-256 hex de 64 caractères, stable.
- [ ] Run `pnpm --filter api exec vitest run src/recovery/recovery-code.spec.ts` → FAIL (module absent).
- [ ] Implémenter (`randomInt` de `node:crypto`).
- [ ] Run → PASS. Commit `feat(api): generation et normalisation du code de recuperation`.

### Task 2: Schéma

**Files:** `apps/api/prisma/schema.prisma`, migration `add_recovery_code_and_access_tokens`

- [ ] `Idea.recoveryCodeHash String? @unique`, `Idea.accessTokens IdeaAccessToken[]`, modèle `IdeaAccessToken` (spec).
- [ ] `pnpm exec prisma migrate dev --name add_recovery_code_and_access_tokens` puis `pnpm db:test:migrate`.
- [ ] Commit `feat(api): code de recuperation et jetons d'acces supplementaires (schema)`.

### Task 3: API d'émission et d'échange + garde

**Files:** Create `apps/api/src/recovery/{recovery.service.ts,recovery.controller.ts,recovery.module.ts,dto/redeem-recovery-code.dto.ts,recovery.http.spec.ts}` ; Modify `apps/api/src/ideas/idea-access.guard.ts`, `apps/api/src/app.module.ts`

**Produces (HTTP):** `POST /ideas/:id/recovery-code` → `201 { code }` ; `POST /recovery` `{ code }` → `200 { ideaId, accessToken }`.

- [ ] Test HTTP (RED), app de test `imports: [IdeasModule, RecoveryModule]`, AI_PROVIDER surchargé : 401 sans jeton ; 403 non payée ; émission puis échange puis `GET /ideas/:id` avec le nouveau jeton → 200 ; ancien jeton → 200 ; deuxième émission → l'ancien code 404, le nouveau 200 ; code inconnu → 404 ; idée repassée à `paidAt: null` → 404 ; saisie `ct 7k4mq 9xp2r` (code réel en minuscules avec espaces) → 200 ; corps sans `code` → 400 ; 6 échanges faux d'affilée → le 6ᵉ en 429.
- [ ] Run → FAIL (404 routes).
- [ ] Implémenter service, contrôleur (`@HttpCode(200)` sur `/recovery`, `@Throttle`), module (`PrismaModule`, `ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 10 }])`), garde étendu, `RecoveryModule` dans `AppModule`.
- [ ] Run fichier → PASS ; `pnpm --filter api test`, build, lint → OK. Commit `feat(api): emission et echange du code de recuperation`.

### Task 4: Web

**Files:** Modify `apps/web/src/lib/ideas-api.ts`, `apps/web/src/app/analyse/[ideaId]/page.tsx`, `apps/web/src/components/analyse/ReportView.tsx`, `apps/web/src/components/layout/Footer.tsx` ; Create `apps/web/src/components/analyse/RecoveryCodeBox.tsx`, `apps/web/src/app/retrouver/page.tsx`

- [ ] Client API : `issueRecoveryCode`, `redeemRecoveryCode`, `RecoveryCodeNotFoundError`, `TooManyAttemptsError`.
- [ ] `RecoveryCodeBox` (props `code`, `onIssue`, `issuing`, `error`) affiché sous l'analyse payée ; code passé à `ReportView` (prop `recoveryCode`) et imprimé en en-tête.
- [ ] Page `/retrouver` (client) ; liens depuis `Footer` et vue « Analyse introuvable ».
- [ ] `pnpm --filter web exec tsc --noEmit && pnpm --filter web lint` → OK. Commit `feat(web): code pour revoir son analyse et page Retrouver mon analyse`.

### Task 5: Docs + vérification

- [ ] DECISIONS (révision 2026-09-26), API.md, USER_FLOWS, TODO, CHANGELOG.
- [ ] Parcours curl sur 3011 : émission → échange → accès avec le nouveau jeton.
- [ ] Commit `docs: code de recuperation d'une analyse payee`.
