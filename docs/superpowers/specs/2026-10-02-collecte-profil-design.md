# Collecte du profil et de la source d'arrivée — Design (sous-projet A du dashboard admin)

Date : 2026-10-02
Statut : validé en conversation le 2026-10-02.
Suite : sous-projet B, dashboard admin (`2026-10-02-dashboard-admin-design.md`).

## Objectif

Savoir **qui** teste une idée et **d'où** il vient, pour comprendre le marché et piloter la conversion dans le dashboard admin. Collecte légère, facultative, sans freiner le parcours ; une seule donnée personnelle (le contact), jamais stockée sans consentement explicite.

Critères de succès :
- un nouvel écran « Parle-nous de toi » entre le canvas et l'aperçu, entièrement facultatif, avec « Passer » aussi visible que « Voir mes résultats » ;
- la source d'arrivée (UTM + domaine référent) est enregistrée sans rien demander ;
- un contact n'est jamais enregistré sans la case de consentement cochée (vérifié par le serveur) ;
- revenir en arrière et resoumettre ne crée pas de doublon.

## Écran « Parle-nous de toi » (`StepProfile.tsx`)

Placé après « Ton business model », avant l'aperçu. Tous les champs facultatifs :

| Champ | Saisie | Valeurs stockées |
|---|---|---|
| Pays du projet | liste | `BJ, TG, CI, SN, BF, NE, ML, GN, CM, GA, CG, CD, NG, GH, FR, BE, CA, OTHER` |
| Ville | texte, 80 caractères max | texte |
| Tu es… | liste | `etudiant, salarie, entrepreneur, sans_emploi, autre` |
| Ton projet en est où ? | liste | `idee, preparation, lance` |
| Comment as-tu connu Ça tient ? | liste | `whatsapp, facebook, instagram, tiktok, bouche_a_oreille, recherche, autre` |
| Contact (e-mail ou WhatsApp) | texte, 120 caractères max | texte, seulement avec consentement |
| « J'accepte d'être recontacté par Ça tient ? » | case à cocher | `contactConsent` + `consentAt` |

Mention sous le contact : « Uniquement pour te recontacter au sujet de Ça tient ?, jamais partagé. »
Boutons : « Retour » (canvas), « Passer » (n'envoie rien, va à l'aperçu), « Voir mes résultats » (envoie puis va à l'aperçu ; en cas d'échec, message et on peut passer quand même : la collecte ne bloque jamais le parcours).

## Source d'arrivée (sans question)

- Au premier chargement d'une page du site dans l'onglet, `captureAcquisition()` lit `utm_source`, `utm_medium`, `utm_campaign` (100 caractères max chacun) et le domaine de `document.referrer` s'il est différent du site, et les garde en `sessionStorage` (première source de l'onglet, jamais écrasée).
- `POST /ideas` reçoit un champ facultatif `acquisition: { utmSource?, utmMedium?, utmCampaign?, referrerHost? }`, enregistré sur `Idea`. `PUT /ideas/:id` l'ignore (la source est celle de la création).

## Données (Prisma)

```prisma
enum UserProfileKind { etudiant salarie entrepreneur sans_emploi autre }
enum ProjectStage   { idee preparation lance }
enum HeardFrom      { whatsapp facebook instagram tiktok bouche_a_oreille recherche autre }

model Idea {
  // …existant
  utmSource    String?
  utmMedium    String?
  utmCampaign  String?
  referrerHost String?
  profile      IdeaProfile?
}

model IdeaProfile {
  id             String           @id @default(cuid())
  ideaId         String           @unique
  idea           Idea             @relation(fields: [ideaId], references: [id], onDelete: Cascade)
  country        String?
  city           String?
  profile        UserProfileKind?
  stage          ProjectStage?
  heardFrom      HeardFrom?
  contact        String?
  contactConsent Boolean          @default(false)
  consentAt      DateTime?
  updatedAt      DateTime         @updatedAt
}
```

## API

- `PUT /ideas/:id/profile` — `IdeaAccessGuard` (pas besoin d'avoir payé). DTO `IdeaProfileDto`, tous champs facultatifs : `country` ∈ liste, `city` ≤ 80, `profile`/`stage`/`heardFrom` ∈ enums, `contact` ≤ 120 et au format e-mail (`^[^\s@]+@[^\s@]+\.[^\s@]+$`) ou téléphone (`^\+?[0-9 ]{8,20}$`), `contactConsent` booléen.
  - `contact` présent sans `contactConsent: true` → **400** (« le contact n'est enregistré qu'avec ton accord »).
  - `upsert` ; `consentAt` = maintenant quand le consentement est donné, `null` (et contact effacé) quand il ne l'est pas.
  - `200 { ok: true }`.
- `POST /ideas` : `acquisition` facultatif (`AcquisitionDto`, chaque champ ≤ 100, `referrerHost` au format domaine `^[a-z0-9.-]+$`).

## Web

- `lib/acquisition.ts` : `captureAcquisition()` (appelé dans un composant client monté dans le layout), `readAcquisition()`.
- `ideas-api.ts` : `createIdea` joint `acquisition` ; `saveProfile(ideaId, profile)`.
- `wizard-reducer.ts` : étape `"profile"` ; `WizardProgress` affiche « Toi » entre « Ton business model » et « Aperçu ».
- `commencer/page.tsx` : canvas → `profile` ; `StepProfile` → `results`.
- `profile-options.ts` : libellés français des listes.

## Tests

- `profile.http.spec.ts` : 401 sans jeton ; tous champs vides acceptés ; valeurs hors liste → 400 ; contact sans consentement → 400 ; e-mail et téléphone valides acceptés, format invalide → 400 ; upsert sans doublon ; retrait du consentement efface le contact.
- `ideas` : `POST /ideas` avec `acquisition` l'enregistre ; `referrerHost` invalide → 400 ; sans `acquisition` inchangé.

## Documentation

`docs/DECISIONS.md` (données collectées, consentement, suppression manuelle sur demande), `docs/API.md`, `docs/USER_FLOWS.md`, `tasks/TODO.md`, `tasks/CHANGELOG.md`.

## Hors scope

Suppression automatique sur demande (manuelle pour l'instant, à outiller avant un volume important), double opt-in, validation du numéro par SMS.
