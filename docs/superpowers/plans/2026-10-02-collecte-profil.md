# Collecte du profil — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Écran « Parle-nous de toi » facultatif + source d'arrivée (UTM), stockés pour le dashboard admin.

**Architecture:** `IdeaProfile` (1-1 `Idea`) via `PUT /ideas/:id/profile` ; colonnes UTM sur `Idea` remplies par `POST /ideas` ; côté web, `captureAcquisition` dans le layout et une étape `profile` dans le wizard.

**Tech Stack:** NestJS 12, Prisma 7, class-validator, Next.js 16.

**Spec:** `docs/superpowers/specs/2026-10-02-collecte-profil-design.md`

## Global Constraints

- Tous les champs facultatifs ; « Passer » n'envoie rien ; un échec d'enregistrement ne bloque jamais l'aperçu.
- Contact jamais stocké sans `contactConsent: true` (400 côté serveur).
- Aucune dépendance ajoutée.

## Review Focus

1. Contact effacé quand le consentement est retiré lors d'une resoumission (test « withdrawing consent »).
2. Chaînes vides envoyées par les champs non remplis : traitées comme absentes, pas comme valeurs invalides (`@IsOptional` + conversion `""` → `undefined` côté web).
3. `sessionStorage` indisponible : `captureAcquisition` ne lève jamais.
4. Referrer du site lui-même : ignoré (pas de `referrerHost` = domaine du site).
5. Paramètres UTM très longs ou exotiques : tronqués à 100 côté web, rejet 400 côté API au-delà.

---

### Task 1: Schéma — enums, `IdeaProfile`, colonnes UTM ; migration via `prisma migrate diff`, `migrate deploy`, `db:test:migrate`. Commit.

### Task 2: API profil + acquisition
- [ ] Tests HTTP (RED) : `profile.http.spec.ts` (cas de la spec) + cas `acquisition` dans le même fichier.
- [ ] DTO `IdeaProfileDto`, `AcquisitionDto` ; `IdeasService.saveProfile` ; `create` enregistre `acquisition` ; route `PUT /ideas/:id/profile`.
- [ ] Suite API, build, lint → OK. Commit.

### Task 3: Web
- [ ] `acquisition.ts`, `AcquisitionCapture` dans le layout, `profile-options.ts`, `StepProfile.tsx`, étape `profile` (reducer, progression, page), `saveProfile`, `createIdea` + `acquisition`.
- [ ] `tsc` + lint. Commit.

### Task 4: Docs + vérification curl (profil, consentement, UTM). Commit, push, PR.
