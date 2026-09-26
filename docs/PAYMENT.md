# PAYMENT.md — Paiement (FedaPay)

## Fournisseur retenu pour le MVP

**FedaPay** (l'IFU professionnel a été obtenu). Kkiapay reste une option future si le RCCM est obtenu (Kkiapay exige une entreprise enregistrée avec registre de commerce + IFU pour un compte marchand actif au Bénin).

## Principe d'abstraction

```
PaymentService
   ├── FedaPayProvider
   ├── KkiapayProvider   (futur, si éligibilité obtenue)
   └── TestProvider       (développement / démo)
```

L'interface utilisateur et le reste du produit ne doivent pas changer selon le provider actif — seul le provider branché derrière `PaymentService` change.

## Flux de paiement (source de vérité)

```
Utilisateur
   ↓
Clique "Payer"
   ↓
Backend crée une intention de paiement (pas de confiance au frontend)
   ↓
Provider (FedaPay) génère la transaction / le lien de paiement / le token
   ↓
Utilisateur paie sur la page FedaPay
   ↓
Webhook FedaPay → backend
   ↓
Backend vérifie la transaction (signature + statut) côté serveur
   ↓
payment.status = SUCCESS
   ↓
Analysis = UNLOCKED
```

**Règle absolue :** un paiement n'est considéré comme valide qu'après confirmation côté serveur (webhook + vérification), jamais uniquement parce que le frontend affiche un état "payé".

## Éléments techniques à couvrir dans l'implémentation

- **Création de transaction** : génération du lien de paiement / token via l'API FedaPay.
- **Statuts de transaction** à gérer explicitement : pending, approved (approuvé), failed/canceled.
- **Webhook** : réception, vérification de la signature (`X-FEDAPAY-SIGNATURE`), traitement idempotent (un même événement reçu plusieurs fois ne doit pas déverrouiller deux fois / dupliquer l'accès).
- **Idempotence** : chaque paiement est lié à un identifiant unique de session d'analyse ; un webhook rejoué ne doit pas créer d'effet de bord.
- **Échec / annulation** : l'utilisateur revient à l'écran d'offre, aucune donnée saisie n'est perdue, il peut retenter le paiement.
- **Remboursement éventuel** : à documenter si un cas d'usage se présente (non prioritaire pour le MVP).
- **Sécurité** : le endpoint de webhook doit être protégé (vérification de signature obligatoire, pas d'accès public non authentifié aux actions de déverrouillage).

## Mode développement

Un `TestProvider` simule un paiement réussi immédiatement (`payment.status = SUCCESS`) pour permettre de développer et tester tout le reste du produit sans dépendre du compte marchand FedaPay en production.

## Implémentation (Phase 6b-1)

Code : `apps/api/src/payments/`.

```
payment-gateway.port.ts       interface PaymentGateway (port) : createCheckout(), fetchStatus()
payment-gateway.factory.ts    createPaymentGateway(env) : lit PAYMENT_PROVIDER, instancie le provider
test-payment.gateway.ts       TestPaymentGateway — approuve au premier appel (createCheckout renvoie initialStatus: "approved")
fedapay.gateway.ts            FedaPayGateway — via fetch natif (aucun SDK)
payment.service.ts            PaymentService — orchestration, machine à etats, ecriture en base (ANALYSIS_PRICE_XOF = 1000)
payment-state.ts              nextPaymentStatus(current, incoming) — fonction pure de transition
payments.controller.ts        POST /ideas/:id/payments, GET /ideas/:id/payment (proteges par IdeaAccessGuard)
fedapay-webhook.controller.ts POST /payments/webhook/fedapay (public, signature obligatoire)
fedapay-signature.ts          verifyFedaPaySignature() — verification pure de X-FEDAPAY-SIGNATURE
```

`PAYMENT_PROVIDER=test|fedapay` (défaut `test`). `test` est refusé au démarrage si `NODE_ENV=production` (`createPaymentGateway` lève une erreur). `fedapay` exige `FEDAPAY_SECRET_KEY` et `FEDAPAY_WEBHOOK_SECRET` (sinon erreur au démarrage) ; `FEDAPAY_ENV=sandbox|live` (défaut `sandbox`).

### FedaPay : URLs et endpoints

Vérifiés dans le SDK officiel `fedapay-node` (source de vérité, aucune dépendance ajoutée — appels en `fetch`).

- Base : `https://sandbox-api.fedapay.com` (sandbox) ou `https://api.fedapay.com` (live), toutes les routes préfixées `/v1`, en-tête `Authorization: Bearer <FEDAPAY_SECRET_KEY>`.
- Création : `POST /v1/transactions` `{ description, amount, currency: { iso: "XOF" }, callback_url }` (`callback_url` = `WEB_APP_URL/analyse/:ideaId`), puis `POST /v1/transactions/:id/token` → `{ url }` = page de paiement hébergée à rediriger l'utilisateur vers.
- Relecture : `GET /v1/transactions/:id` → `status`.
- Le corps de réponse est accepté tel quel **ou** enveloppé (`{ "v1/transaction": {...} }` ou `{ transaction: {...} }`) : le format d'enveloppe de FedaPay n'est pas documenté de façon fiable (`unwrapFedaPayTransaction`).
- Timeout de 10 s sur chaque appel HTTP (`AbortSignal.timeout`) ; toute erreur réseau, HTTP non-2xx ou réponse illisible lève `PaymentGatewayError`.

### Signature du webhook

En-tête `X-FEDAPAY-SIGNATURE: t=<timestamp>,s=<hex>` (plusieurs `s=` possibles, séparés par `,`). `hex = HMAC-SHA256(FEDAPAY_WEBHOOK_SECRET, "<timestamp>.<corps brut>")`. Comparaison en temps constant (`timingSafeEqual`), tolérance de 300 secondes sur l'écart entre `timestamp` et l'heure serveur. Nécessite le corps brut de la requête (`NestFactory.create(AppModule, { rawBody: true })`), le body déjà parsé ne suffit pas.

Traitement du webhook : pas de secret configuré (mode `test`) → 404. Signature absente, invalide, mal formée ou hors tolérance → 400, rien n'est écrit en base. Signature valide → extraction de l'identifiant de transaction (`entity.id`) → **relecture de la transaction chez FedaPay** (le statut porté par l'événement n'est jamais cru sur parole) → application de la machine à états sur le `Payment` correspondant → `200 { received: true }`. Transaction inconnue de notre base → `200` sans effet (pour que FedaPay ne réessaie pas indéfiniment). Si la relecture chez FedaPay échoue (panne réseau/API) → 503, pour que FedaPay retente plus tard.

### Mapping des statuts FedaPay → `PaymentStatus`

`approved`, `transferred`, `refunded`, `partially_refunded`, `approved_partially_refunded`, `transferred_partially_refunded` → `approved` (l'accès a été payé ; un remboursement éventuel est traité manuellement, hors MVP). `declined` → `declined`. `canceled`/`cancelled` → `canceled`. Toute autre valeur → `pending`.

### Machine à états (`payment-state.ts`)

`nextPaymentStatus(current, incoming)` : un paiement ne peut changer de statut que depuis `pending` ; dès qu'il est `approved`, `declined` ou `canceled`, ce statut est terminal (un `declined` ou une relecture tardive n'a plus aucun effet — un nouvel essai de paiement crée une nouvelle ligne `Payment`, jamais une réutilisation de l'ancienne). Appliquer le même statut deux fois ne fait rien. Le passage à `approved` fixe `Payment.confirmedAt` et, dans la même transaction Prisma, `Idea.paidAt` s'il est encore vide — ce qui rend le webhook idempotent sans table d'événements séparée. L'écriture est conditionnelle sur le statut lu (`updateMany({ where: { id, status: <statut lu> } })`) pour qu'un doublon de webhook concurrent ne puisse pas appliquer deux fois la même transition.

### Variables d'environnement (`apps/api/.env.example`)

```bash
PAYMENT_PROVIDER="test"
FEDAPAY_ENV="sandbox"
FEDAPAY_SECRET_KEY=""
FEDAPAY_WEBHOOK_SECRET=""
```
