# Code de récupération d'une analyse payée — Design

Date : 2026-10-02
Statut : validé en conversation le 2026-10-02.
Révise : `docs/DECISIONS.md` 2026-09-26 (« changer de navigateur ou vider le stockage local fait perdre l'accès à l'analyse, pas de récupération prévue »).

## Contexte et objectif

L'accès à une idée repose sur un jeton gardé dans le `localStorage` du navigateur qui l'a créée. Un utilisateur qui a payé perd son analyse s'il change d'appareil ou vide son navigateur. Objectif : lui donner un **code à noter** qui lui permet de rouvrir son analyse payée depuis n'importe quel navigateur, sans compte ni donnée personnelle.

Critères de succès :
- un utilisateur qui a payé obtient un code lisible, le copie, et le retrouve sur son rapport imprimé ;
- depuis un autre navigateur, la saisie du code rouvre `/analyse/<id>` avec l'analyse payée ;
- le navigateur d'origine garde son accès ;
- le code n'est jamais stocké en clair ; deviner un code est impraticable (entropie + limite d'essais) ;
- une idée non payée ne peut pas obtenir de code.

## Décisions

| Sujet | Décision |
|---|---|
| Format | `CT-XXXXX-XXXXX` : 10 caractères de l'alphabet Crockford base32 sans `I`, `L`, `O`, `U` (32 symboles, 50 bits d'entropie), tirés avec `crypto.randomInt`. Saisie tolérante : casse, espaces et tirets ignorés, `O`→`0`, `I`/`L`→`1`. |
| Stockage | `Idea.recoveryCodeHash` = SHA-256 hex du code normalisé (10 caractères, sans préfixe ni tirets). Jamais en clair. |
| Émission | À la demande, sur l'analyse payée : `POST /ideas/:id/recovery-code`. Chaque appel génère un nouveau code et remplace l'ancien (l'ancien ne marche plus). Le code n'est renvoyé qu'une fois, dans cette réponse. |
| Échange | `POST /recovery` `{ code }` → `{ ideaId, accessToken }` : un **nouveau** jeton d'accès, ajouté à la table `IdeaAccessToken`. Le jeton d'origine (`Idea.accessTokenHash`) reste valide. |
| Garde d'accès | `IdeaAccessGuard` accepte le jeton s'il correspond à `Idea.accessTokenHash` **ou** à une ligne `IdeaAccessToken` de l'idée. Même 404 qu'avant sinon. |
| Anti-devinette | `POST /recovery` limité à 5 requêtes/min/IP (`@nestjs/throttler`, déjà en place) ; code faux ou mal formé → 404 avec un message neutre. 50 bits / 5 essais par minute : hors de portée. |
| Idée non payée | `POST /ideas/:id/recovery-code` → 403 (`PaidIdeaGuard`). Un code ne peut exister que pour une idée payée. |

## Données (Prisma)

```prisma
model Idea {
  // …existant
  recoveryCodeHash String?   @unique
  accessTokens     IdeaAccessToken[]
}

model IdeaAccessToken {
  id        String   @id @default(cuid())
  ideaId    String
  idea      Idea     @relation(fields: [ideaId], references: [id], onDelete: Cascade)
  tokenHash String   @unique
  createdAt DateTime @default(now())
}
```

## API (`apps/api/src/recovery/`, module `RecoveryModule`)

- `recovery-code.ts` (pur) : `generateRecoveryCode(): string` (format `CT-XXXXX-XXXXX`), `normalizeRecoveryCode(input: string): string | null` (10 caractères de l'alphabet après normalisation, sinon `null`), `hashRecoveryCode(normalized: string): string`.
- `RecoveryService` :
  - `issueCode(ideaId)` : génère, stocke le hash, renvoie `{ code }`.
  - `redeem(code)` : normalise (sinon 404), cherche `Idea` par `recoveryCodeHash` **et** `paidAt` non nul (sinon 404), crée un `IdeaAccessToken` avec `generateAccessToken()` existant, renvoie `{ ideaId, accessToken }`.
- `RecoveryController` :
  - `POST /ideas/:id/recovery-code` — `IdeaAccessGuard` + `PaidIdeaGuard`, `201 { code }`.
  - `POST /recovery` — public, `ThrottlerGuard` + `@Throttle({ default: { limit: 5, ttl: 60_000 } })`, `200 { ideaId, accessToken }`, `400` corps invalide (DTO `{ code: string, 1..40 caractères }`), `404` code inconnu.
- `IdeaAccessGuard` : après l'échec de la comparaison avec `accessTokenHash`, cherche `IdeaAccessToken` par `tokenHash = hashAccessToken(token)` et `ideaId`.

## Web

- `ideas-api.ts` : `issueRecoveryCode(ideaId): Promise<string>`, `redeemRecoveryCode(code): Promise<{ ideaId: string }>` (enregistre le jeton reçu avec `saveAccessToken`) ; `RecoveryCodeNotFoundError` sur 404, `TooManyAttemptsError` sur 429.
- `RecoveryCodeBox.tsx` (analyse payée, au-dessus du rapport et sur les écrans « Et si ? ») : texte « Garde ce code pour revoir ton analyse depuis un autre appareil » ; bouton « Obtenir mon code » (puis « Générer un nouveau code », avec l'avertissement « l'ancien code ne marchera plus ») ; code affiché en `tabular-nums` avec bouton « Copier ». Le code obtenu est passé au rapport, qui l'imprime en en-tête (« Code pour revoir cette analyse : … »).
- Page `/retrouver` : champ code + bouton « Retrouver mon analyse » → `redeemRecoveryCode` → `router.push("/analyse/<id>")`. Erreurs : « Ce code ne correspond à aucune analyse. Verifie-le et reessaie. » ; « Trop d'essais, attends une minute. »
- Liens « Retrouver mon analyse » : pied de page et vue « Analyse introuvable » de `/analyse/[id]`.

## Gestion des erreurs

| Cas | Comportement |
|---|---|
| Code faux, mal formé, ou d'une idée non payée | 404, message neutre identique |
| Trop d'essais | 429, « attends une minute » |
| Génération d'un code sur une idée non payée | 403 |
| Nouveau code généré | l'ancien renvoie 404 |

## Tests

- `recovery-code.spec.ts` : format et alphabet, unicité sur 1 000 tirages, normalisation (casse, espaces, tirets, `O`/`I`/`L`), rejet des longueurs et caractères invalides.
- `recovery.http.spec.ts` (base de test) : 401/403 sur l'émission ; émission → échange → `GET /ideas/:id` avec le nouveau jeton = 200 ; l'ancien jeton reste valide ; nouveau code → l'ancien code renvoie 404 ; code faux → 404 ; code d'une idée dont le paiement a été retiré → 404 ; saisie tolérante (`ct 7k4mq 9xp2r`) ; 6ᵉ essai dans la minute → 429.

## Documentation

`docs/DECISIONS.md` (révision de la limite du 2026-09-26), `docs/API.md`, `docs/USER_FLOWS.md` (« Utilisateur qui revient plus tard »), `tasks/TODO.md`, `tasks/CHANGELOG.md`.

## Hors scope

Envoi du code par e-mail/SMS, révocation des jetons émis, liste des appareils, comptes utilisateurs.
