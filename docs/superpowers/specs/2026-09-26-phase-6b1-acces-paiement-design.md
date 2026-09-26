# Phase 6b-1 — Accès à l'analyse et paiement — Design

Date : 2026-09-26
Statut : à relire avant plan d'implémentation.
Suite : Phase 6b-2 (écran capital, rapport complet, analytics) — spec séparée.

## Contexte et objectif

Le parcours actuel (`/commencer`) est entièrement gratuit, y compris « Et si ? » et « Scénarios ». C'est en contradiction avec `CLAUDE.md` (règle 4) et `docs/BUSINESS_RULES.md` (« payer AVANT que l'analyse détaillée ne soit montrée », « Et si… ? et les scénarios font partie de l'analyse payée »). **Décision validée le 2026-09-26 : le paiement se place juste après l'aperçu.**

Objectif de la 6b-1 : un utilisateur peut payer 1 000 FCFA, le serveur confirme le paiement (webhook + vérification), et seule cette confirmation ouvre l'analyse payante. Le rapport complet arrive en 6b-2 ; ici l'analyse payante contient « Et si ? » et « Scénarios » (écrans existants).

Critères de succès :
- sans paiement confirmé côté serveur, aucun écran payant n'est affiché et aucune donnée payante n'est renvoyée par l'API ;
- un webhook rejoué, retardé ou falsifié ne produit aucun effet de bord ;
- un paiement échoué/annulé ramène à l'offre sans perte de saisie ; l'utilisateur peut réessayer ;
- en développement, tout le parcours fonctionne sans compte FedaPay (`TestProvider`).

## Décisions

| Sujet | Décision |
|---|---|
| Place du paiement | Après l'aperçu. Gratuit : type → description → hypothèses → canvas → aperçu (verdict + CA/marge/résultat + seuil). Payant : « Et si ? », « Scénarios », puis (6b-2) capital et rapport. |
| Accès à une idée | **Jeton d'accès par idée**, pas de compte. `POST /ideas` renvoie un `accessToken` aléatoire (32 octets, base64url) ; seul son SHA-256 est stocké. Toutes les routes `/ideas/:id…` l'exigent en `Authorization: Bearer`. Le navigateur le garde en `localStorage`. Pas de cookie : le web (Vercel) et l'API (Render) sont sur des domaines différents, les cookies tiers seraient bloqués. |
| Mode de paiement | **Page de paiement hébergée FedaPay** (redirection), pas de widget intégré : aucune donnée de paiement ne transite par nos serveurs, mobile money géré par FedaPay. |
| Vérité du statut | Seul le serveur fixe le statut : webhook signé **puis relecture de la transaction via l'API FedaPay**, ou relecture à la demande quand le navigateur interroge le statut. Jamais un paramètre de retour d'URL ni un flag envoyé par le client. |
| Prix | Constante serveur `ANALYSIS_PRICE_XOF = 1000`, en XOF quelle que soit la devise d'affichage choisie par l'utilisateur. |
| Provider | `PAYMENT_PROVIDER=test|fedapay` (défaut `test`). `test` est refusé au démarrage si `NODE_ENV=production`. `fedapay` exige `FEDAPAY_SECRET_KEY`, `FEDAPAY_WEBHOOK_SECRET`, `FEDAPAY_ENV=sandbox|live`. |
| Dépendances | Aucune : `fetch` natif et `node:crypto` (pas de SDK FedaPay). |
| Découpage web | `/commencer` = parcours gratuit jusqu'à l'offre. Nouvelle page `/analyse/[ideaId]` = retour de paiement + analyse payante. Le retour de FedaPay recharge la page : l'état du wizard en mémoire est perdu, l'analyse payante se recharge donc depuis l'API. |

## Modèle de données (Prisma)

```prisma
model Idea {
  // ...champs existants
  accessTokenHash String?   // SHA-256 hex du jeton ; null seulement pour les idées créées avant 6b-1 (inaccessibles)
  paidAt          DateTime? // renseigné une seule fois, par la confirmation serveur
  payments        Payment[]
}

enum PaymentProvider {
  test
  fedapay
}

enum PaymentStatus {
  pending
  approved
  declined
  canceled
}

model Payment {
  id                    String          @id @default(cuid())
  ideaId                String
  idea                  Idea            @relation(fields: [ideaId], references: [id], onDelete: Cascade)
  provider              PaymentProvider
  providerTransactionId String?
  amount                Int
  currency              String
  status                PaymentStatus   @default(pending)
  createdAt             DateTime        @default(now())
  confirmedAt           DateTime?

  @@unique([provider, providerTransactionId])
  @@index([ideaId])
}
```

Migration additive (colonnes nullables, nouvelle table) : aucune donnée existante touchée.

**Machine à états** d'un `Payment` : `pending → approved | declined | canceled`. `approved` est terminal (un `declined` tardif est ignoré). Appliquer le même statut deux fois ne fait rien. Le passage à `approved` fixe `confirmedAt` et, dans la même transaction, `Idea.paidAt` s'il est encore vide. C'est ce qui rend le webhook idempotent, sans table d'événements.

## API

Toutes les routes `/ideas/:id…` passent par un `IdeaAccessGuard` : en-tête absent → 401 ; jeton faux ou idée inconnue → 404 (ne révèle pas l'existence d'une idée).

| Route | Changement |
|---|---|
| `POST /ideas` | Réponse enrichie : `{ ideaId, accessToken, result, breakEven }`. |
| `GET /ideas/:id`, `PUT /ideas/:id`, `PATCH /ideas/:id/canvas-blocks` | Protégées par le jeton. `GET` renvoie aussi `paid: boolean`. |
| `POST /ideas/:id/payments` (nouveau) | Protégé. Crée un `Payment` `pending` et renvoie `{ paymentId, redirectUrl }`. Si l'idée est déjà payée → 409. |
| `GET /ideas/:id/payment` (nouveau) | Protégé. Renvoie `{ paid, status }` du dernier paiement. Si ce paiement est `pending` et provient de FedaPay, le serveur relit la transaction chez FedaPay avant de répondre (le webhook peut arriver après le retour du navigateur). |
| `POST /payments/webhook/fedapay` (nouveau) | Public, **signature obligatoire**. Corps brut requis (`NestFactory.create(AppModule, { rawBody: true })`). |

### `PaymentService` et providers (`apps/api/src/payments/`)

```
PaymentsModule
  PaymentService            orchestration, machine à états, écriture en base
  PAYMENT_PROVIDER (port)   createCheckout(idea, payment) -> { providerTransactionId, redirectUrl }
                            fetchStatus(providerTransactionId) -> PaymentStatus
    TestProvider            approuve immédiatement ; redirectUrl = WEB_APP_URL/analyse/:ideaId
    FedaPayProvider         API FedaPay via fetch
  FedaPayWebhookController  POST /payments/webhook/fedapay
  fedapay-signature.ts      vérification pure de X-FEDAPAY-SIGNATURE
```

**FedaPay** (vérifié dans le SDK officiel `fedapay-node`) :
- bases : `https://sandbox-api.fedapay.com` / `https://api.fedapay.com`, préfixe `/v1`, `Authorization: Bearer <FEDAPAY_SECRET_KEY>` ;
- création : `POST /v1/transactions` `{ description, amount: 1000, currency: { iso: "XOF" }, callback_url: WEB_APP_URL/analyse/:ideaId }`, puis `POST /v1/transactions/:id/token` → `url` de la page de paiement ;
- relecture : `GET /v1/transactions/:id` → `status` (`pending`, `approved`, `declined`, `canceled` ; `refunded`/`transferred` sont traités comme `approved` pour l'accès, un remboursement éventuel est hors MVP) ;
- le parseur accepte l'objet transaction au premier niveau **ou** enveloppé (`{ "v1/transaction": {…} }`), le format d'enveloppe n'étant pas documenté de façon fiable ;
- **signature du webhook** : en-tête `X-FEDAPAY-SIGNATURE: t=<timestamp>,s=<hex>` ; `hex = HMAC-SHA256(FEDAPAY_WEBHOOK_SECRET, "<t>.<corps brut>")` ; comparaison en temps constant ; tolérance 300 s sur `t`.

**Traitement d'un webhook** : signature invalide ou trop ancienne → 400, rien n'est écrit. Signature valide → extraction de l'identifiant de transaction (`entity.id`) → **relecture de la transaction chez FedaPay** (le statut de l'événement n'est pas cru sur parole) → application de la machine à états sur le `Payment` correspondant → 200. Transaction inconnue de notre base → 200 sans effet (FedaPay ne doit pas réessayer indéfiniment).

## Web

- **`/commencer`** : l'ordre des étapes devient type → description → hypothèses → canvas → résultats (aperçu) → **offre**. « Et si ? » et « Scénarios » quittent ce parcours. `WizardProgress` affiche : Type, Description, Hypothèses, Ton business model, Aperçu, Analyse complète.
- **Écran Offre** (nouveau, `StepOffer`) : ce que contient l'analyse complète (Et si ?, scénarios, puis rapport et besoin financier à venir en 6b-2), le prix « 1 000 FCFA », le rappel « aide à la décision, pas une garantie » (`BUSINESS_RULES.md`), un bouton « Payer 1 000 FCFA » → `POST /ideas/:id/payments` → `window.location.assign(redirectUrl)`. Erreur → message et bouton de nouvel essai, rien n'est perdu.
- **`/analyse/[ideaId]`** (nouvelle page) : lit le jeton dans `localStorage`. Pas de jeton → « Ce lien n'est accessible que depuis le navigateur qui a créé l'analyse » + lien vers `/commencer`. Sinon interroge `GET /ideas/:id/payment` :
  - `pending` → écran d'attente, nouvelle interrogation toutes les 3 s pendant 2 min, puis message « paiement toujours en cours » avec bouton « Vérifier à nouveau » ;
  - `declined`/`canceled` → message clair + bouton « Réessayer le paiement » (relance `POST /payments`) ;
  - `paid` → charge `GET /ideas/:id` (hypothèses, devise) et affiche « Et si ? » puis « Scénarios » (composants existants, inchangés).
- Le client API (`ideas-api.ts`) ajoute l'en-tête `Authorization` sur toutes les routes `/ideas/:id…`. Stockage : `localStorage["ca-tient:access:<ideaId>"] = accessToken`, toute lecture/écriture dans un `try/catch` (navigation privée).

## Règles projet respectées

- `CLAUDE.md` #4 et #5 : l'analyse payante n'est affichée que sur `paid: true` renvoyé par le serveur, lui-même fixé uniquement par la vérification serveur.
- `CLAUDE.md` #7 : `PaymentService` + port `PAYMENT_PROVIDER`, Kkiapay ajoutable sans toucher au reste.
- Limite assumée : « Et si ? » et « Scénarios » calculent côté navigateur à partir des hypothèses de l'utilisateur (package `financial-engine`, décision 2026-09-20). Le paywall protège l'affichage de l'analyse et, en 6b-2, le rapport servi par l'API ; il ne peut pas empêcher un utilisateur technique de refaire les calculs sur ses propres chiffres. Consigné dans `DECISIONS.md`.

## Documentation à mettre à jour

`docs/DECISIONS.md` (place du paiement, jeton d'accès, page hébergée, vérité du statut, limite du paywall côté navigateur), `docs/USER_FLOWS.md` (nouvel ordre), `docs/API.md`, `docs/PAYMENT.md` (détails FedaPay vérifiés), `docs/SECURITY.md` (contrôle d'accès en place), `docs/DATABASE.md`, `apps/api/.env.example`, `tasks/TODO.md`, `tasks/CHANGELOG.md`.

## Tests

- `fedapay-signature.spec.ts` : signature valide (vecteur calculé dans le test avec `node:crypto`), mauvaise signature, en-tête mal formé, horodatage hors tolérance, corps modifié d'un octet.
- `payment-state.spec.ts` (fonction pure de transition) : toutes les transitions, `approved` terminal, même statut deux fois = aucun changement.
- `fedapay.provider.spec.ts` (`fetch` mocké) : création + jeton → `redirectUrl` ; relecture enveloppée et non enveloppée ; mapping des statuts ; erreurs HTTP.
- `payment.service.spec.ts` / contrôleurs (base de test) : paiement test → idée payée ; webhook valide rejoué 3 fois → un seul `paidAt`, `confirmedAt` inchangé ; webhook avec signature fausse → 400, rien d'écrit ; `declined` après `approved` → ignoré ; idée déjà payée → 409 ; `GET /payment` relit FedaPay quand `pending`.
- `idea-access.guard.spec.ts` + contrôleurs existants : sans en-tête → 401, mauvais jeton → 404, bon jeton → 200 ; les tests existants de `IdeasController` sont adaptés pour envoyer le jeton.
- Vérification navigateur (Playwright, `PAYMENT_PROVIDER=test`, ports 3011/3012) : parcours gratuit → offre → paiement → `/analyse/:id` → Et si ? → Scénarios ; accès direct à `/analyse/:id` depuis un autre profil navigateur → refusé ; 0 erreur console.
- FedaPay sandbox réel : à faire dès que les clés sandbox sont fournies (paiement test mobile money, réception du webhook via l'URL publique de l'API déployée ou un tunnel).

## Hors scope (6b-2 et après)

Écran capital (investissement de départ, capital disponible), calcul du besoin financier, rapport complet (canvas 9 blocs, variables sensibles, points à surveiller), analytics, historique multi-analyses, remboursements, i18n.
