# Phase 6b-1 — Accès à l'analyse et paiement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Placer le paiement de 1 000 FCFA juste après l'aperçu : jeton d'accès par idée, paiement (TestProvider en dev, FedaPay page hébergée) confirmé uniquement côté serveur, et analyse payante (« Et si ? », « Scénarios ») servie par une nouvelle page `/analyse/[ideaId]`.

**Architecture:** API NestJS : un `IdeaAccessGuard` protège toutes les routes `/ideas/:id…` par un jeton Bearer dont seul le SHA-256 est stocké ; un nouveau `PaymentsModule` (`PaymentService` + port `PAYMENT_GATEWAY` avec `TestPaymentGateway` et `FedaPayGateway` via `fetch`) applique une machine à états pure et marque `Idea.paidAt` ; le webhook FedaPay vérifie la signature puis relit la transaction chez FedaPay. Web Next.js : `/commencer` s'arrête sur un écran d'offre, `/analyse/[ideaId]` interroge le statut serveur et n'affiche l'analyse payante que sur `paid: true`.

**Tech Stack:** NestJS 11 (ESM, imports `.js`), Prisma 7 + PostgreSQL, vitest 4 + supertest, `node:crypto`, `fetch` natif (Node 24) ; Next.js 16.3 (App Router, `"use client"`), React 19, Tailwind.

**Spec:** `docs/superpowers/specs/2026-09-26-phase-6b1-acces-paiement-design.md`

## Global Constraints

- Prix : constante serveur `ANALYSIS_PRICE_XOF = 1000`, devise `"XOF"`, quelle que soit la devise d'affichage.
- Jeton d'accès : 32 octets aléatoires en base64url ; en base uniquement `SHA-256` hex (`Idea.accessTokenHash`). En-tête `Authorization: Bearer <jeton>`. En-tête absent → **401** ; jeton faux, idée inconnue ou idée sans hash → **404**.
- Statuts : `pending → approved | declined | canceled` ; tout statut autre que `pending` est terminal ; même statut = aucun changement. Passage à `approved` : `confirmedAt` + `Idea.paidAt` (s'il est vide) dans la même transaction.
- Le statut n'est jamais fixé par un paramètre venu du navigateur : seulement par le gateway (création de checkout, relecture `fetchStatus`) et le webhook signé suivi d'une relecture.
- FedaPay : bases `https://sandbox-api.fedapay.com` / `https://api.fedapay.com`, préfixe `/v1`, `Authorization: Bearer <FEDAPAY_SECRET_KEY>`. Création `POST /v1/transactions` `{ description, amount, currency: { iso }, callback_url }` puis `POST /v1/transactions/:id/token` → `url`. Relecture `GET /v1/transactions/:id`. Signature webhook : en-tête `X-FEDAPAY-SIGNATURE: t=<ts>,s=<hex>`, `hex = HMAC-SHA256(secret, "<t>.<corps brut>")`, comparaison en temps constant, tolérance **300 s**.
- Env : `PAYMENT_PROVIDER=test|fedapay` (défaut `test`) ; `test` interdit si `NODE_ENV=production` ; `fedapay` exige `FEDAPAY_SECRET_KEY` et `FEDAPAY_WEBHOOK_SECRET` ; `FEDAPAY_ENV=sandbox|live` (défaut `sandbox`). URL de retour : `${WEB_APP_URL}/analyse/<ideaId>` (défaut `http://localhost:3000`, sans slash final).
- Web : jeton en `localStorage["ca-tient:access:<ideaId>"]`, chaque accès dans un `try/catch`. Polling du statut toutes les **3 s** pendant **2 min** max.
- Aucune nouvelle dépendance (ni SDK FedaPay, ni lib de test web).
- Code : commentaires en anglais, seulement sur les décisions non évidentes. Messages d'erreur API et textes d'interface en français **sans accents** (style existant, ex. « Decris ton idee »). Docs en français avec accents.
- Tests API : `pnpm --filter api exec vitest run <fichier>` pendant l'itération, `pnpm --filter api test` avant chaque commit (base `ca_tient_test`, migrée par `pretest`, jamais la base de dev). Web : `pnpm --filter web lint` et `pnpm --filter web build` (si le build échoue sur « Failed to fetch Inter from Google Fonts », c'est le réseau : relancer).
- Ne jamais lire `apps/api/.env`. Serveurs de vérification uniquement sur les ports 3011 (API) / 3012 (web), arrêtés par PID exact (les ports 3001/3002 sont ceux du développeur).
- Commits : conventional commits en français, un seul trailer final exactement `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Chemins relatifs à la racine du worktree `.worktrees/feature-phase-6b-paiement`.

## Review Focus

- Deux webhooks identiques traités en parallèle (FedaPay réessaie vite) : un seul passage à `approved`, `paidAt` fixé une fois → mise à jour conditionnelle `updateMany where status = <ancien>` + test de rejeu dans Task 6.
- Le gateway échoue à la création du checkout (FedaPay indisponible) : l'utilisateur doit pouvoir réessayer, pas rester bloqué sur un « paiement en attente » fantôme → le `Payment` passe `canceled` et l'API répond 503 ; test dans Task 6.
- Retour de FedaPay avant l'arrivée du webhook : `GET /ideas/:id/payment` doit relire FedaPay et débloquer sans attendre le webhook → test dans Task 6.
- Ouverture de `/analyse/<id>` dans un autre navigateur (pas de jeton) ou pour une idée créée avant 6b-1 (sans hash) : message clair, aucune donnée → guard 404 testé dans Task 3, écran « no-access » vérifié en Task 9.
- Signature valide mais corps modifié d'un seul octet, ou horodatage rejoué hors tolérance : rejet 400, rien écrit → tests Task 4 et Task 6.

---

### Task 1: Schéma Prisma (accès, paiements) et isolation des specs

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_add_access_and_payments/migration.sql` (générée)
- Modify: `apps/api/vitest.config.ts`

**Interfaces:**
- Produces: modèle `Payment`, enums `PaymentProvider { test fedapay }`, `PaymentStatus { pending approved declined canceled }`, champs `Idea.accessTokenHash String?`, `Idea.paidAt DateTime?`, relation `Idea.payments`. Nom de la contrainte unique Prisma : `provider_providerTransactionId`.

- [ ] **Step 1: Modifier le schéma**

Dans `model Idea`, ajouter après `canvasBlocks   CanvasBlock[]` :

```prisma
  accessTokenHash String?
  paidAt          DateTime?
  payments        Payment[]
```

Ajouter en fin de fichier :

```prisma
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

- [ ] **Step 2: Générer et relire la migration**

Run: `cd apps/api && pnpm exec prisma migrate dev --create-only --name add_access_and_payments`
Relire le SQL : il ne doit contenir que des `CREATE TYPE`, `ALTER TABLE "Idea" ADD COLUMN` (nullables), `CREATE TABLE "Payment"`, index et clé étrangère — aucun `DROP`.
Run: `pnpm exec prisma migrate dev` (applique en dev) puis `pnpm exec prisma generate`.

- [ ] **Step 3: Sérialiser les fichiers de specs**

Plusieurs fichiers de specs vident les mêmes tables de la base de test ; en parallèle ils se marchent dessus. Dans `apps/api/vitest.config.ts`, dans `test: { … }`, ajouter :

```ts
    // Integration specs share one test database and clean its tables: run files one at a time.
    fileParallelism: false,
```

- [ ] **Step 4: Vérifier et commiter**

Run: `pnpm --filter api test && pnpm --filter api build`
Expected: toutes les specs existantes passent (le `pretest` applique la migration à `ca_tient_test`).

```bash
git add apps/api/prisma apps/api/vitest.config.ts
git commit -m "feat(api): schema des paiements et du jeton d'acces (Phase 6b-1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Jeton d'accès à la création d'une idée

**Files:**
- Create: `apps/api/src/ideas/access-token.ts`, `apps/api/src/ideas/access-token.spec.ts`
- Modify: `apps/api/src/ideas/ideas.service.ts`, `apps/api/src/ideas/ideas.service.spec.ts`

**Interfaces:**
- Consumes: `Idea.accessTokenHash`, `Idea.paidAt` (Task 1).
- Produces:
  - `generateAccessToken(): { token: string; hash: string }`, `hashAccessToken(token: string): string`, `accessTokenMatches(token: string, expectedHash: string): boolean`
  - `IdeasService.create(dto)` → `{ ideaId, accessToken, result, breakEven }` ; `IdeasService.update` inchangé (`{ ideaId, result, breakEven }`) ; `IdeaDetail` gagne `paid: boolean`.

- [ ] **Step 1: Tests du jeton (échouent)**

`apps/api/src/ideas/access-token.spec.ts` :

```ts
import { describe, expect, it } from "vitest";
import { accessTokenMatches, generateAccessToken, hashAccessToken } from "./access-token.js";

describe("access token", () => {
  it("generates a 32-byte base64url token and its sha-256 hash", () => {
    const { token, hash } = generateAccessToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(hashAccessToken(token));
  });

  it("generates a different token each time", () => {
    expect(generateAccessToken().token).not.toBe(generateAccessToken().token);
  });

  it("matches only the token that produced the hash", () => {
    const { token, hash } = generateAccessToken();

    expect(accessTokenMatches(token, hash)).toBe(true);
    expect(accessTokenMatches(generateAccessToken().token, hash)).toBe(false);
  });

  it("does not match a malformed stored hash", () => {
    const { token } = generateAccessToken();

    expect(accessTokenMatches(token, "pas-un-hash")).toBe(false);
  });
});
```

Run: `pnpm --filter api exec vitest run src/ideas/access-token.spec.ts` — Expected: FAIL (module introuvable).

- [ ] **Step 2: Implémenter `access-token.ts`**

```ts
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function generateAccessToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashAccessToken(token) };
}

export function hashAccessToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function accessTokenMatches(token: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashAccessToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
```

Run le même test — Expected: PASS (4 tests).

- [ ] **Step 3: Tests du service (échouent)**

Dans `apps/api/src/ideas/ideas.service.spec.ts`, bloc `describe("IdeasService.create")`, ajouter (importer `hashAccessToken` depuis `./access-token.js`) :

```ts
  it("returns an access token and stores only its hash", async () => {
    const { ideaId, accessToken } = await service.create(payload());

    const stored = await prisma.idea.findUniqueOrThrow({ where: { id: ideaId } });
    expect(accessToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(stored.accessTokenHash).toBe(hashAccessToken(accessToken));
    expect(stored.paidAt).toBeNull();
  });
```

Dans `describe("IdeasService.findOne")`, dans le test « returns the idea with its hypotheses and latest simulation », ajouter l'assertion `expect(found?.paid).toBe(false);` (adapter le nom de variable à celui du test existant), puis ajouter :

```ts
  it("reports the idea as paid once paidAt is set", async () => {
    const { ideaId } = await service.create(payload());
    await prisma.idea.update({ where: { id: ideaId }, data: { paidAt: new Date() } });

    expect((await service.findOne(ideaId))?.paid).toBe(true);
  });
```

Run: `pnpm --filter api exec vitest run src/ideas/ideas.service.spec.ts` — Expected: FAIL.

- [ ] **Step 4: Implémenter dans `ideas.service.ts`**

1. `import { generateAccessToken } from "./access-token.js";`
2. `IdeaDetail` : ajouter `paid: boolean;`.
3. Dans `create` : avant `this.prisma.idea.create`, `const { token, hash } = generateAccessToken();` ; dans `data`, ajouter `accessTokenHash: hash,` ; retourner `{ ideaId: idea.id, accessToken: token, result, breakEven }`.
4. Dans `findOne` : ajouter `paid: idea.paidAt !== null,` à l'objet retourné.

Run le service spec — Expected: PASS.

- [ ] **Step 5: Suite complète et commit**

Run: `pnpm --filter api test && pnpm --filter api lint`

```bash
git add apps/api/src/ideas/access-token.ts apps/api/src/ideas/access-token.spec.ts apps/api/src/ideas/ideas.service.ts apps/api/src/ideas/ideas.service.spec.ts
git commit -m "feat(api): jeton d'acces genere a la creation d'une idee

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `IdeaAccessGuard` sur les routes `/ideas/:id…`

**Files:**
- Create: `apps/api/src/ideas/idea-access.guard.ts`
- Modify: `apps/api/src/ideas/ideas.controller.ts`, `apps/api/src/ideas/ideas.controller.spec.ts`

**Interfaces:**
- Consumes: `accessTokenMatches` (Task 2), `PrismaService` (module global).
- Produces: `class IdeaAccessGuard implements CanActivate` (injectable, dépend seulement de `PrismaService`, lit `request.params.id`) — réutilisé tel quel par Task 6 via `@UseGuards(IdeaAccessGuard)`.

- [ ] **Step 1: Tests HTTP (échouent)**

Dans `apps/api/src/ideas/ideas.controller.spec.ts` :

1. Ajouter un helper après `validPayload()` :

```ts
async function createIdea(app: INestApplication): Promise<{ id: string; token: string }> {
  const response = await request(app.getHttpServer()).post("/ideas").send(validPayload()).expect(201);
  return { id: response.body.ideaId, token: response.body.accessToken };
}

function bearer(token: string): [string, string] {
  return ["Authorization", `Bearer ${token}`];
}
```

2. Adapter **chaque** test existant qui appelle `GET/PUT/PATCH /ideas/:id…` : créer l'idée via `createIdea(app)` et ajouter `.set(...bearer(token))` à la requête protégée. Les trois tests « 404 for an unknown id/idea » envoient `.set(...bearer("jeton-quelconque"))` et attendent toujours 404.

3. Ajouter :

```ts
  it("POST /ideas returns an access token", async () => {
    const { token } = await createIdea(app);

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("GET /ideas/:id without Authorization returns 401", async () => {
    const { id } = await createIdea(app);

    await request(app.getHttpServer()).get(`/ideas/${id}`).expect(401);
  });

  it("GET /ideas/:id with the token of another idea returns 404", async () => {
    const first = await createIdea(app);
    const second = await createIdea(app);

    await request(app.getHttpServer()).get(`/ideas/${first.id}`).set(...bearer(second.token)).expect(404);
  });

  it("GET /ideas/:id returns 404 for an idea created without access token", async () => {
    const legacy = await prisma.idea.create({
      data: { businessModel: "SERVICE", rawDescription: "Idee d'avant la Phase 6b.", currency: "XOF" },
    });

    await request(app.getHttpServer()).get(`/ideas/${legacy.id}`).set(...bearer("jeton-quelconque")).expect(404);
  });

  it("GET /ideas/:id returns paid: false for a new idea", async () => {
    const { id, token } = await createIdea(app);

    const response = await request(app.getHttpServer()).get(`/ideas/${id}`).set(...bearer(token)).expect(200);

    expect(response.body.paid).toBe(false);
  });

  it("PUT /ideas/:id without Authorization returns 401", async () => {
    const { id } = await createIdea(app);

    await request(app.getHttpServer()).put(`/ideas/${id}`).send(validPayload()).expect(401);
  });

  it("PATCH /ideas/:id/canvas-blocks without Authorization returns 401", async () => {
    const { id } = await createIdea(app);

    await request(app.getHttpServer())
      .patch(`/ideas/${id}/canvas-blocks`)
      .send({ blocks: [], source: "utilisateur_edite" })
      .expect(401);
  });
```

Run: `pnpm --filter api exec vitest run src/ideas/ideas.controller.spec.ts` — Expected: FAIL (401/404 non renvoyés).

- [ ] **Step 2: Implémenter le guard**

`apps/api/src/ideas/idea-access.guard.ts` :

```ts
import { CanActivate, ExecutionContext, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { PrismaService } from "../prisma/prisma.service.js";
import { accessTokenMatches } from "./access-token.js";

@Injectable()
export class IdeaAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request<{ id?: string }>>();
    const header = request.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
    if (!token) {
      throw new UnauthorizedException("Jeton d'acces manquant.");
    }

    const ideaId = request.params.id ?? "";
    const idea = ideaId
      ? await this.prisma.idea.findUnique({ where: { id: ideaId }, select: { accessTokenHash: true } })
      : null;

    // Same 404 for unknown idea and wrong token: never reveal that an idea exists.
    if (!idea?.accessTokenHash || !accessTokenMatches(token, idea.accessTokenHash)) {
      throw new NotFoundException(`Idee ${ideaId} introuvable.`);
    }
    return true;
  }
}
```

- [ ] **Step 3: Protéger les routes**

Dans `ideas.controller.ts` : importer `UseGuards` depuis `@nestjs/common` et `IdeaAccessGuard` depuis `./idea-access.guard.js` ; ajouter `@UseGuards(IdeaAccessGuard)` sur `update` (`PUT :id`), `findOne` (`GET :id`) et `updateCanvasBlocks` (`PATCH :id/canvas-blocks`). `POST /ideas` reste public.

Run le controller spec — Expected: PASS.

- [ ] **Step 4: Suite complète et commit**

Run: `pnpm --filter api test && pnpm --filter api lint && pnpm --filter api build`

```bash
git add apps/api/src/ideas/idea-access.guard.ts apps/api/src/ideas/ideas.controller.ts apps/api/src/ideas/ideas.controller.spec.ts
git commit -m "feat(api): protege les routes d'une idee par son jeton d'acces

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Machine à états et signature FedaPay (fonctions pures)

**Files:**
- Create: `apps/api/src/payments/payment-state.ts`, `apps/api/src/payments/payment-state.spec.ts`
- Create: `apps/api/src/payments/fedapay-signature.ts`, `apps/api/src/payments/fedapay-signature.spec.ts`

**Interfaces:**
- Consumes: type `PaymentStatus` de `@prisma/client` (Task 1).
- Produces:
  - `nextPaymentStatus(current: PaymentStatus, incoming: PaymentStatus): PaymentStatus | null` (`null` = aucun changement)
  - `FEDAPAY_SIGNATURE_TOLERANCE_SECONDS = 300`
  - `verifyFedaPaySignature(rawBody: string | Buffer, header: string | undefined, secret: string, nowSeconds?: number): boolean`

- [ ] **Step 1: Tests (échouent)**

`apps/api/src/payments/payment-state.spec.ts` :

```ts
import { describe, expect, it } from "vitest";
import { nextPaymentStatus } from "./payment-state.js";

describe("nextPaymentStatus", () => {
  it.each(["approved", "declined", "canceled"] as const)("moves a pending payment to %s", (incoming) => {
    expect(nextPaymentStatus("pending", incoming)).toBe(incoming);
  });

  it("does nothing when the status is unchanged", () => {
    expect(nextPaymentStatus("pending", "pending")).toBeNull();
    expect(nextPaymentStatus("approved", "approved")).toBeNull();
  });

  it.each([
    ["approved", "declined"],
    ["approved", "canceled"],
    ["approved", "pending"],
    ["declined", "approved"],
    ["canceled", "approved"],
  ] as const)("keeps the terminal status %s when %s arrives", (current, incoming) => {
    expect(nextPaymentStatus(current, incoming)).toBeNull();
  });
});
```

`apps/api/src/payments/fedapay-signature.spec.ts` :

```ts
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyFedaPaySignature } from "./fedapay-signature.js";

const SECRET = "wh_sandbox_secret";
const BODY = JSON.stringify({ name: "transaction.approved", entity: { id: 12345, status: "approved" } });
const NOW = 1_790_000_000;

function sign(body: string, timestamp: number, secret = SECRET): string {
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`, "utf8").digest("hex");
  return `t=${timestamp},s=${signature}`;
}

describe("verifyFedaPaySignature", () => {
  it("accepts a correctly signed body", () => {
    expect(verifyFedaPaySignature(BODY, sign(BODY, NOW), SECRET, NOW)).toBe(true);
  });

  it("accepts a Buffer body", () => {
    expect(verifyFedaPaySignature(Buffer.from(BODY, "utf8"), sign(BODY, NOW), SECRET, NOW)).toBe(true);
  });

  it("rejects a signature made with another secret", () => {
    expect(verifyFedaPaySignature(BODY, sign(BODY, NOW, "autre"), SECRET, NOW)).toBe(false);
  });

  it("rejects a body altered by one character", () => {
    expect(verifyFedaPaySignature(BODY.replace("12345", "12346"), sign(BODY, NOW), SECRET, NOW)).toBe(false);
  });

  it("rejects a missing or malformed header", () => {
    expect(verifyFedaPaySignature(BODY, undefined, SECRET, NOW)).toBe(false);
    expect(verifyFedaPaySignature(BODY, "n'importe quoi", SECRET, NOW)).toBe(false);
    expect(verifyFedaPaySignature(BODY, `t=${NOW}`, SECRET, NOW)).toBe(false);
  });

  it("accepts a timestamp at the 300 s limit and rejects one beyond it", () => {
    expect(verifyFedaPaySignature(BODY, sign(BODY, NOW - 300), SECRET, NOW)).toBe(true);
    expect(verifyFedaPaySignature(BODY, sign(BODY, NOW - 301), SECRET, NOW)).toBe(false);
  });

  it("accepts the header when one of several signatures is valid", () => {
    const header = `t=${NOW},s=${"0".repeat(64)},${sign(BODY, NOW).split(",")[1]}`;

    expect(verifyFedaPaySignature(BODY, header, SECRET, NOW)).toBe(true);
  });
});
```

Run: `pnpm --filter api exec vitest run src/payments` — Expected: FAIL (modules introuvables).

- [ ] **Step 2: Implémenter**

`apps/api/src/payments/payment-state.ts` :

```ts
import type { PaymentStatus } from "@prisma/client";

// Only a pending payment can change: approved/declined/canceled are final (a retry creates a new payment).
export function nextPaymentStatus(current: PaymentStatus, incoming: PaymentStatus): PaymentStatus | null {
  if (current !== "pending" || incoming === current) return null;
  return incoming;
}
```

`apps/api/src/payments/fedapay-signature.ts` :

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

export const FEDAPAY_SIGNATURE_TOLERANCE_SECONDS = 300;

// Same scheme as the official fedapay-node SDK (Webhook.constructEvent):
// header "t=<timestamp>,s=<hex>", hex = HMAC-SHA256(secret, "<timestamp>.<raw body>").
export function verifyFedaPaySignature(
  rawBody: string | Buffer,
  header: string | undefined,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): boolean {
  if (!header) return false;

  let timestamp: string | undefined;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key === "t") timestamp = value;
    if (key === "s" && value) signatures.push(value);
  }

  if (!timestamp || !/^\d+$/.test(timestamp) || signatures.length === 0) return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > FEDAPAY_SIGNATURE_TOLERANCE_SECONDS) return false;

  const payload = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
  const expected = Buffer.from(
    createHmac("sha256", secret).update(`${timestamp}.${payload}`, "utf8").digest("hex"),
    "utf8",
  );

  return signatures.some((signature) => {
    const actual = Buffer.from(signature, "utf8");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
}
```

Run: `pnpm --filter api exec vitest run src/payments` — Expected: PASS (payment-state : 9 tests ; signature : 7 tests).

- [ ] **Step 3: Commit**

Run: `pnpm --filter api lint`

```bash
git add apps/api/src/payments
git commit -m "feat(api): machine a etats des paiements et verification de signature FedaPay

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Gateways de paiement (Test, FedaPay) et factory

**Files:**
- Create: `apps/api/src/payments/payment-gateway.port.ts`
- Create: `apps/api/src/payments/test-payment.gateway.ts`
- Create: `apps/api/src/payments/fedapay.gateway.ts`, `apps/api/src/payments/fedapay.gateway.spec.ts`
- Create: `apps/api/src/payments/payment-gateway.factory.ts`, `apps/api/src/payments/payment-gateway.factory.spec.ts`

**Interfaces:**
- Consumes: types `PaymentProvider`, `PaymentStatus` de `@prisma/client`.
- Produces:
  - `PAYMENT_GATEWAY = Symbol("PAYMENT_GATEWAY")`
  - `interface CheckoutRequest { ideaId: string; paymentId: string; amount: number; currency: string; description: string; returnUrl: string }`
  - `interface CheckoutSession { providerTransactionId: string; redirectUrl: string; initialStatus: PaymentStatus }`
  - `interface PaymentGateway { readonly name: PaymentProvider; createCheckout(request: CheckoutRequest): Promise<CheckoutSession>; fetchStatus(providerTransactionId: string): Promise<PaymentStatus> }`
  - `class PaymentGatewayError extends Error`
  - `class TestPaymentGateway implements PaymentGateway` (name `"test"`)
  - `class FedaPayGateway implements PaymentGateway` : `constructor(config: { secretKey: string; environment: "sandbox" | "live" })`, name `"fedapay"`
  - `unwrapFedaPayTransaction(body: unknown): Record<string, unknown> | undefined`, `mapFedaPayStatus(status: unknown): PaymentStatus`, `extractFedaPayTransactionId(event: unknown): string | undefined`
  - `createPaymentGateway(env?: NodeJS.ProcessEnv): PaymentGateway`

- [ ] **Step 1: Port et TestPaymentGateway (sans logique à tester seule)**

`apps/api/src/payments/payment-gateway.port.ts` :

```ts
import type { PaymentProvider, PaymentStatus } from "@prisma/client";

export const PAYMENT_GATEWAY = Symbol("PAYMENT_GATEWAY");

export interface CheckoutRequest {
  ideaId: string;
  paymentId: string;
  amount: number;
  currency: string;
  description: string;
  returnUrl: string;
}

export interface CheckoutSession {
  providerTransactionId: string;
  redirectUrl: string;
  initialStatus: PaymentStatus;
}

export interface PaymentGateway {
  readonly name: PaymentProvider;
  createCheckout(request: CheckoutRequest): Promise<CheckoutSession>;
  fetchStatus(providerTransactionId: string): Promise<PaymentStatus>;
}

export class PaymentGatewayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentGatewayError";
  }
}
```

`apps/api/src/payments/test-payment.gateway.ts` :

```ts
import type { PaymentStatus } from "@prisma/client";
import type { CheckoutRequest, CheckoutSession, PaymentGateway } from "./payment-gateway.port.js";

// Development/demo only (refused in production by createPaymentGateway): approves at once.
export class TestPaymentGateway implements PaymentGateway {
  readonly name = "test" as const;

  async createCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
    return { providerTransactionId: `test_${request.paymentId}`, redirectUrl: request.returnUrl, initialStatus: "approved" };
  }

  async fetchStatus(): Promise<PaymentStatus> {
    return "approved";
  }
}
```

- [ ] **Step 2: Tests FedaPay (échouent)**

`apps/api/src/payments/fedapay.gateway.spec.ts` :

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  extractFedaPayTransactionId,
  FedaPayGateway,
  mapFedaPayStatus,
  unwrapFedaPayTransaction,
} from "./fedapay.gateway.js";
import { PaymentGatewayError } from "./payment-gateway.port.js";

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function gateway(environment: "sandbox" | "live" = "sandbox") {
  return new FedaPayGateway({ secretKey: "sk_sandbox_test", environment });
}

const REQUEST = {
  ideaId: "idea1",
  paymentId: "pay1",
  amount: 1000,
  currency: "XOF",
  description: "Analyse complete Ca tient ?",
  returnUrl: "http://localhost:3000/analyse/idea1",
};

describe("FedaPayGateway", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates a transaction then a payment token and returns the hosted page url", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ "v1/transaction": { id: 987, status: "pending" } }))
      .mockResolvedValueOnce(jsonResponse({ token: "tok", url: "https://process.fedapay.com/tok" }));

    const session = await gateway().createCheckout(REQUEST);

    expect(session).toEqual({ providerTransactionId: "987", redirectUrl: "https://process.fedapay.com/tok", initialStatus: "pending" });
    const [createUrl, createInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(createUrl).toBe("https://sandbox-api.fedapay.com/v1/transactions");
    expect(createInit.method).toBe("POST");
    expect((createInit.headers as Record<string, string>).Authorization).toBe("Bearer sk_sandbox_test");
    expect(JSON.parse(createInit.body as string)).toEqual({
      description: "Analyse complete Ca tient ?",
      amount: 1000,
      currency: { iso: "XOF" },
      callback_url: "http://localhost:3000/analyse/idea1",
    });
    const [tokenUrl, tokenInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(tokenUrl).toBe("https://sandbox-api.fedapay.com/v1/transactions/987/token");
    expect(tokenInit.method).toBe("POST");
  });

  it("uses the live base url in live mode", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 1, status: "approved" }));

    await gateway("live").fetchStatus("1");

    expect(fetchMock.mock.calls[0][0]).toBe("https://api.fedapay.com/v1/transactions/1");
  });

  it("reads the status of a wrapped or unwrapped transaction", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ "v1/transaction": { id: 5, status: "approved" } }))
      .mockResolvedValueOnce(jsonResponse({ id: 5, status: "declined" }));

    expect(await gateway().fetchStatus("5")).toBe("approved");
    expect(await gateway().fetchStatus("5")).toBe("declined");
  });

  it("throws PaymentGatewayError on an HTTP error", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "Unauthorized" }, 401));

    await expect(gateway().fetchStatus("5")).rejects.toBeInstanceOf(PaymentGatewayError);
  });

  it("throws PaymentGatewayError when the token response has no url", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ id: 3, status: "pending" }))
      .mockResolvedValueOnce(jsonResponse({ token: "tok" }));

    await expect(gateway().createCheckout(REQUEST)).rejects.toBeInstanceOf(PaymentGatewayError);
  });
});

describe("FedaPay payload helpers", () => {
  it.each([
    ["approved", "approved"],
    ["transferred", "approved"],
    ["refunded", "approved"],
    ["declined", "declined"],
    ["canceled", "canceled"],
    ["cancelled", "canceled"],
    ["pending", "pending"],
    ["something-new", "pending"],
    [undefined, "pending"],
  ])("maps %s to %s", (input, expected) => {
    expect(mapFedaPayStatus(input)).toBe(expected);
  });

  it("unwraps a transaction whether or not it is enveloped", () => {
    expect(unwrapFedaPayTransaction({ "v1/transaction": { id: 1 } })).toEqual({ id: 1 });
    expect(unwrapFedaPayTransaction({ id: 2 })).toEqual({ id: 2 });
    expect(unwrapFedaPayTransaction(null)).toBeUndefined();
  });

  it("extracts the transaction id from a webhook event", () => {
    expect(extractFedaPayTransactionId({ name: "transaction.approved", entity: { id: 12345 } })).toBe("12345");
    expect(extractFedaPayTransactionId({ name: "transaction.approved", entity: { id: "abc" } })).toBe("abc");
    expect(extractFedaPayTransactionId({ name: "transaction.approved" })).toBeUndefined();
    expect(extractFedaPayTransactionId("pas un objet")).toBeUndefined();
  });
});
```

Run: `pnpm --filter api exec vitest run src/payments/fedapay.gateway.spec.ts` — Expected: FAIL.

- [ ] **Step 3: Implémenter `fedapay.gateway.ts`**

```ts
import type { PaymentStatus } from "@prisma/client";
import {
  PaymentGatewayError,
  type CheckoutRequest,
  type CheckoutSession,
  type PaymentGateway,
} from "./payment-gateway.port.js";

const BASE_URLS = { sandbox: "https://sandbox-api.fedapay.com", live: "https://api.fedapay.com" } as const;
const REQUEST_TIMEOUT_MS = 10_000;

export interface FedaPayConfig {
  secretKey: string;
  environment: "sandbox" | "live";
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : undefined;
}

// FedaPay's response envelope is not documented reliably: accept both {"v1/transaction": {...}} and a bare object.
export function unwrapFedaPayTransaction(body: unknown): Record<string, unknown> | undefined {
  const record = asRecord(body);
  if (!record) return undefined;
  return asRecord(record["v1/transaction"]) ?? asRecord(record.transaction) ?? record;
}

export function mapFedaPayStatus(status: unknown): PaymentStatus {
  switch (status) {
    case "approved":
    case "transferred":
    case "refunded":
    case "partially_refunded":
    case "approved_partially_refunded":
    case "transferred_partially_refunded":
      // Access was paid for; refunds are out of MVP scope and handled manually.
      return "approved";
    case "declined":
      return "declined";
    case "canceled":
    case "cancelled":
      return "canceled";
    default:
      return "pending";
  }
}

export function extractFedaPayTransactionId(event: unknown): string | undefined {
  const id = asRecord(asRecord(event)?.entity)?.id;
  return typeof id === "number" || (typeof id === "string" && id.length > 0) ? String(id) : undefined;
}

export class FedaPayGateway implements PaymentGateway {
  readonly name = "fedapay" as const;

  constructor(private readonly config: FedaPayConfig) {}

  async createCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
    const created = unwrapFedaPayTransaction(
      await this.call("POST", "/v1/transactions", {
        description: request.description,
        amount: request.amount,
        currency: { iso: request.currency },
        callback_url: request.returnUrl,
      }),
    );
    const id = created?.id;
    if (typeof id !== "number" && typeof id !== "string") {
      throw new PaymentGatewayError("fedapay: transaction creee sans identifiant");
    }

    const token = asRecord(await this.call("POST", `/v1/transactions/${id}/token`));
    if (typeof token?.url !== "string") {
      throw new PaymentGatewayError("fedapay: jeton de paiement sans url");
    }

    return { providerTransactionId: String(id), redirectUrl: token.url, initialStatus: "pending" };
  }

  async fetchStatus(providerTransactionId: string): Promise<PaymentStatus> {
    const body = await this.call("GET", `/v1/transactions/${encodeURIComponent(providerTransactionId)}`);
    return mapFedaPayStatus(unwrapFedaPayTransaction(body)?.status);
  }

  private async call(method: "GET" | "POST", path: string, body?: unknown): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(`${BASE_URLS[this.config.environment]}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.config.secretKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new PaymentGatewayError(`fedapay: ${method} ${path} injoignable (${message})`);
    }

    if (!response.ok) {
      throw new PaymentGatewayError(`fedapay: HTTP ${response.status} sur ${method} ${path}`);
    }

    try {
      return await response.json();
    } catch {
      throw new PaymentGatewayError(`fedapay: reponse illisible sur ${method} ${path}`);
    }
  }
}
```

Run le spec — Expected: PASS (5 + 11 tests).

- [ ] **Step 4: Factory (tests d'abord)**

`apps/api/src/payments/payment-gateway.factory.spec.ts` :

```ts
import { describe, expect, it } from "vitest";
import { createPaymentGateway } from "./payment-gateway.factory.js";

describe("createPaymentGateway", () => {
  it("uses the test gateway by default", () => {
    expect(createPaymentGateway({}).name).toBe("test");
  });

  it("refuses the test gateway in production", () => {
    expect(() => createPaymentGateway({ NODE_ENV: "production" })).toThrow(/production/);
    expect(() => createPaymentGateway({ NODE_ENV: "production", PAYMENT_PROVIDER: "test" })).toThrow(/production/);
  });

  it("builds the FedaPay gateway when its keys are present", () => {
    const gateway = createPaymentGateway({
      PAYMENT_PROVIDER: "fedapay",
      FEDAPAY_SECRET_KEY: "sk",
      FEDAPAY_WEBHOOK_SECRET: "wh",
    });

    expect(gateway.name).toBe("fedapay");
  });

  it("refuses FedaPay without its secret key or webhook secret", () => {
    expect(() => createPaymentGateway({ PAYMENT_PROVIDER: "fedapay", FEDAPAY_WEBHOOK_SECRET: "wh" })).toThrow(/FEDAPAY_SECRET_KEY/);
    expect(() => createPaymentGateway({ PAYMENT_PROVIDER: "fedapay", FEDAPAY_SECRET_KEY: "sk" })).toThrow(/FEDAPAY_WEBHOOK_SECRET/);
  });

  it("refuses an unknown provider", () => {
    expect(() => createPaymentGateway({ PAYMENT_PROVIDER: "paypal" })).toThrow(/paypal/);
  });
});
```

Run — Expected: FAIL. Puis `apps/api/src/payments/payment-gateway.factory.ts` :

```ts
import { FedaPayGateway } from "./fedapay.gateway.js";
import type { PaymentGateway } from "./payment-gateway.port.js";
import { TestPaymentGateway } from "./test-payment.gateway.js";

export function createPaymentGateway(env: NodeJS.ProcessEnv = process.env): PaymentGateway {
  const provider = env.PAYMENT_PROVIDER?.trim() || "test";

  if (provider === "test") {
    if (env.NODE_ENV === "production") {
      throw new Error("PAYMENT_PROVIDER=test est interdit en production : il approuve tout paiement.");
    }
    return new TestPaymentGateway();
  }

  if (provider === "fedapay") {
    const secretKey = env.FEDAPAY_SECRET_KEY?.trim();
    if (!secretKey) throw new Error("PAYMENT_PROVIDER=fedapay exige FEDAPAY_SECRET_KEY.");
    if (!env.FEDAPAY_WEBHOOK_SECRET?.trim()) throw new Error("PAYMENT_PROVIDER=fedapay exige FEDAPAY_WEBHOOK_SECRET.");
    return new FedaPayGateway({ secretKey, environment: env.FEDAPAY_ENV === "live" ? "live" : "sandbox" });
  }

  throw new Error(`PAYMENT_PROVIDER inconnu : ${provider}`);
}
```

Run — Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

Run: `pnpm --filter api test && pnpm --filter api lint`

```bash
git add apps/api/src/payments
git commit -m "feat(api): gateways de paiement Test et FedaPay (page hebergee) via fetch

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: `PaymentService`, routes de paiement et webhook FedaPay

**Files:**
- Create: `apps/api/src/payments/payment.service.ts`
- Create: `apps/api/src/payments/payments.controller.ts`
- Create: `apps/api/src/payments/fedapay-webhook.controller.ts`
- Create: `apps/api/src/payments/payments.module.ts`
- Create: `apps/api/src/payments/payments.http.spec.ts`
- Modify: `apps/api/src/app.module.ts`, `apps/api/src/main.ts`

**Interfaces:**
- Consumes: `IdeaAccessGuard` (Task 3) ; `nextPaymentStatus`, `verifyFedaPaySignature` (Task 4) ; `PAYMENT_GATEWAY`, `PaymentGateway`, `PaymentGatewayError`, `TestPaymentGateway`, `extractFedaPayTransactionId`, `createPaymentGateway` (Task 5) ; `IdeasModule` pour les tests.
- Produces:
  - `ANALYSIS_PRICE_XOF = 1000`
  - `PaymentService.startCheckout(ideaId): Promise<{ paymentId: string; redirectUrl: string }>` ; `getStatus(ideaId): Promise<{ paid: boolean; status: PaymentStatus | null }>` ; `handleProviderUpdate(providerTransactionId: string): Promise<void>`
  - `POST /ideas/:id/payments` → 201 `{ paymentId, redirectUrl }` (409 si déjà payée, 503 si le gateway échoue) ; `GET /ideas/:id/payment` → 200 `{ paid, status }` ; `POST /payments/webhook/fedapay` → 200 `{ received: true }`, 400 si signature invalide, 404 si `FEDAPAY_WEBHOOK_SECRET` absent.

- [ ] **Step 1: Tests HTTP (échouent)**

`apps/api/src/payments/payments.http.spec.ts` :

```ts
import { createHmac } from "node:crypto";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { PaymentStatus } from "@prisma/client";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { IdeasModule } from "../ideas/ideas.module.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { PAYMENT_GATEWAY, PaymentGatewayError, type PaymentGateway } from "./payment-gateway.port.js";
import { PaymentsModule } from "./payments.module.js";
import { TestPaymentGateway } from "./test-payment.gateway.js";

const WEBHOOK_SECRET = "wh_test_secret";

function ideaPayload() {
  return {
    businessModel: "ECOMMERCE",
    rawDescription: "Vente de sacs faits main en ligne.",
    currency: "XOF",
    hypotheses: { price: 5000, volume: 50, variableCostPerUnit: 2000, fixedCosts: 100000 },
  };
}

function signedHeader(body: string, secret = WEBHOOK_SECRET): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`, "utf8").digest("hex");
  return `t=${timestamp},s=${signature}`;
}

class FakeFedaPayGateway implements PaymentGateway {
  readonly name = "fedapay" as const;
  status: PaymentStatus = "pending";
  failCheckout = false;
  readonly fetchStatus = vi.fn(async () => this.status);
  private counter = 0;

  async createCheckout() {
    if (this.failCheckout) throw new PaymentGatewayError("fedapay: indisponible");
    this.counter += 1;
    return { providerTransactionId: `tx_${this.counter}`, redirectUrl: "https://process.fedapay.com/tok", initialStatus: "pending" as const };
  }
}

async function buildApp(gateway: PaymentGateway): Promise<{ app: INestApplication; prisma: PrismaService }> {
  const moduleRef = await Test.createTestingModule({ imports: [IdeasModule, PaymentsModule] })
    .overrideProvider(PAYMENT_GATEWAY)
    .useValue(gateway)
    .compile();
  const app = moduleRef.createNestApplication({ rawBody: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  await app.init();
  return { app, prisma: moduleRef.get(PrismaService) };
}

async function createIdea(app: INestApplication): Promise<{ id: string; auth: [string, string] }> {
  const response = await request(app.getHttpServer()).post("/ideas").send(ideaPayload()).expect(201);
  return { id: response.body.ideaId, auth: ["Authorization", `Bearer ${response.body.accessToken}`] };
}

describe("Payments with the test gateway", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await buildApp(new TestPaymentGateway()));
  });

  afterEach(async () => {
    await prisma.idea.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it("requires the access token", async () => {
    const { id } = await createIdea(app);

    await request(app.getHttpServer()).post(`/ideas/${id}/payments`).expect(401);
    await request(app.getHttpServer()).get(`/ideas/${id}/payment`).expect(401);
  });

  it("approves at once, unlocks the idea and redirects to the analysis page", async () => {
    const { id, auth } = await createIdea(app);

    const started = await request(app.getHttpServer()).post(`/ideas/${id}/payments`).set(...auth).expect(201);

    const webAppUrl = (process.env.WEB_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
    expect(started.body.redirectUrl).toBe(`${webAppUrl}/analyse/${id}`);
    const status = await request(app.getHttpServer()).get(`/ideas/${id}/payment`).set(...auth).expect(200);
    expect(status.body).toEqual({ paid: true, status: "approved" });
    const idea = await request(app.getHttpServer()).get(`/ideas/${id}`).set(...auth).expect(200);
    expect(idea.body.paid).toBe(true);
  });

  it("refuses to charge an idea that is already paid", async () => {
    const { id, auth } = await createIdea(app);
    await request(app.getHttpServer()).post(`/ideas/${id}/payments`).set(...auth).expect(201);

    await request(app.getHttpServer()).post(`/ideas/${id}/payments`).set(...auth).expect(409);
  });

  it("reports no payment yet", async () => {
    const { id, auth } = await createIdea(app);

    const status = await request(app.getHttpServer()).get(`/ideas/${id}/payment`).set(...auth).expect(200);

    expect(status.body).toEqual({ paid: false, status: null });
  });
});

describe("Payments with FedaPay (fake gateway) and its webhook", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const gateway = new FakeFedaPayGateway();
  const previousSecret = process.env.FEDAPAY_WEBHOOK_SECRET;

  beforeAll(async () => {
    process.env.FEDAPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
    ({ app, prisma } = await buildApp(gateway));
  });

  beforeEach(() => {
    gateway.status = "pending";
    gateway.failCheckout = false;
    gateway.fetchStatus.mockClear();
  });

  afterEach(async () => {
    await prisma.idea.deleteMany();
  });

  afterAll(async () => {
    process.env.FEDAPAY_WEBHOOK_SECRET = previousSecret;
    await app.close();
  });

  async function startPending(): Promise<{ id: string; auth: [string, string]; transactionId: string }> {
    const { id, auth } = await createIdea(app);
    const started = await request(app.getHttpServer()).post(`/ideas/${id}/payments`).set(...auth).expect(201);
    expect(started.body.redirectUrl).toBe("https://process.fedapay.com/tok");
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: started.body.paymentId } });
    return { id, auth, transactionId: payment.providerTransactionId! };
  }

  function sendWebhook(transactionId: string, header?: string) {
    const body = JSON.stringify({ name: "transaction.approved", entity: { id: transactionId } });
    return request(app.getHttpServer())
      .post("/payments/webhook/fedapay")
      .set("Content-Type", "application/json")
      .set("X-FEDAPAY-SIGNATURE", header ?? signedHeader(body))
      .send(body);
  }

  it("stays pending until FedaPay confirms, re-reading FedaPay on status polls", async () => {
    const { id, auth } = await startPending();

    const pending = await request(app.getHttpServer()).get(`/ideas/${id}/payment`).set(...auth).expect(200);
    expect(pending.body).toEqual({ paid: false, status: "pending" });

    gateway.status = "approved";
    const approved = await request(app.getHttpServer()).get(`/ideas/${id}/payment`).set(...auth).expect(200);
    expect(approved.body).toEqual({ paid: true, status: "approved" });
  });

  it("unlocks the idea on a signed webhook, after re-reading the transaction", async () => {
    const { id, transactionId } = await startPending();
    gateway.status = "approved";

    await sendWebhook(transactionId).expect(200);

    expect(gateway.fetchStatus).toHaveBeenCalledWith(transactionId);
    const idea = await prisma.idea.findUniqueOrThrow({ where: { id } });
    expect(idea.paidAt).not.toBeNull();
  });

  it("is idempotent when the same webhook arrives several times, even concurrently", async () => {
    const { id, transactionId } = await startPending();
    gateway.status = "approved";

    await sendWebhook(transactionId).expect(200);
    const first = await prisma.idea.findUniqueOrThrow({ where: { id }, include: { payments: true } });
    await Promise.all([sendWebhook(transactionId), sendWebhook(transactionId), sendWebhook(transactionId)]);
    const after = await prisma.idea.findUniqueOrThrow({ where: { id }, include: { payments: true } });

    expect(after.paidAt).toEqual(first.paidAt);
    expect(after.payments[0].confirmedAt).toEqual(first.payments[0].confirmedAt);
  });

  it("rejects a webhook with an invalid signature without touching anything", async () => {
    const { id, transactionId } = await startPending();
    gateway.status = "approved";

    await sendWebhook(transactionId, signedHeader("autre corps")).expect(400);

    expect(gateway.fetchStatus).not.toHaveBeenCalled();
    expect((await prisma.idea.findUniqueOrThrow({ where: { id } })).paidAt).toBeNull();
  });

  it("acknowledges a webhook for an unknown transaction without effect", async () => {
    await sendWebhook("tx_inconnue").expect(200);

    expect(gateway.fetchStatus).not.toHaveBeenCalled();
  });

  it("ignores a late decline after approval", async () => {
    const { id, transactionId } = await startPending();
    gateway.status = "approved";
    await sendWebhook(transactionId).expect(200);

    gateway.status = "declined";
    await sendWebhook(transactionId).expect(200);

    const idea = await prisma.idea.findUniqueOrThrow({ where: { id }, include: { payments: true } });
    expect(idea.paidAt).not.toBeNull();
    expect(idea.payments[0].status).toBe("approved");
  });

  it("cancels the payment and answers 503 when the checkout cannot be created", async () => {
    const { id, auth } = await createIdea(app);
    gateway.failCheckout = true;

    await request(app.getHttpServer()).post(`/ideas/${id}/payments`).set(...auth).expect(503);

    const status = await request(app.getHttpServer()).get(`/ideas/${id}/payment`).set(...auth).expect(200);
    expect(status.body).toEqual({ paid: false, status: "canceled" });
  });
});
```

Run: `pnpm --filter api exec vitest run src/payments/payments.http.spec.ts` — Expected: FAIL (module `payments.module.js` introuvable).

- [ ] **Step 2: `PaymentService`**

`apps/api/src/payments/payment.service.ts` :

```ts
import { ConflictException, Inject, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import type { PaymentStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";
import { PAYMENT_GATEWAY, type PaymentGateway } from "./payment-gateway.port.js";
import { nextPaymentStatus } from "./payment-state.js";

export const ANALYSIS_PRICE_XOF = 1000;

function webAppUrl(): string {
  return (process.env.WEB_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}

  async startCheckout(ideaId: string): Promise<{ paymentId: string; redirectUrl: string }> {
    const idea = await this.prisma.idea.findUniqueOrThrow({ where: { id: ideaId }, select: { paidAt: true } });
    if (idea.paidAt) {
      throw new ConflictException("Cette analyse est deja payee.");
    }

    const payment = await this.prisma.payment.create({
      data: { ideaId, provider: this.gateway.name, amount: ANALYSIS_PRICE_XOF, currency: "XOF" },
    });

    let session;
    try {
      session = await this.gateway.createCheckout({
        ideaId,
        paymentId: payment.id,
        amount: ANALYSIS_PRICE_XOF,
        currency: "XOF",
        description: "Analyse complete Ca tient ?",
        returnUrl: `${webAppUrl()}/analyse/${ideaId}`,
      });
    } catch (error) {
      // A payment that never reached the provider must not look "pending" forever to the user.
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: "canceled" } });
      this.logger.warn(`Creation du paiement ${payment.id} impossible : ${error instanceof Error ? error.message : error}`);
      throw new ServiceUnavailableException("Le paiement n'a pas pu etre initialise, reessaie.");
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { providerTransactionId: session.providerTransactionId },
    });
    await this.applyStatus(payment.id, session.initialStatus);

    return { paymentId: payment.id, redirectUrl: session.redirectUrl };
  }

  async getStatus(ideaId: string): Promise<{ paid: boolean; status: PaymentStatus | null }> {
    const latest = await this.prisma.payment.findFirst({ where: { ideaId }, orderBy: { createdAt: "desc" } });

    // The user may come back from FedaPay before the webhook: ask FedaPay directly (server side).
    if (latest?.status === "pending" && latest.providerTransactionId) {
      try {
        await this.applyStatus(latest.id, await this.gateway.fetchStatus(latest.providerTransactionId));
      } catch (error) {
        this.logger.warn(`Relecture du paiement ${latest.id} impossible : ${error instanceof Error ? error.message : error}`);
      }
    }

    const [idea, current] = await Promise.all([
      this.prisma.idea.findUniqueOrThrow({ where: { id: ideaId }, select: { paidAt: true } }),
      latest ? this.prisma.payment.findUniqueOrThrow({ where: { id: latest.id }, select: { status: true } }) : null,
    ]);
    return { paid: idea.paidAt !== null, status: current?.status ?? null };
  }

  async handleProviderUpdate(providerTransactionId: string): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { provider_providerTransactionId: { provider: this.gateway.name, providerTransactionId } },
    });
    if (!payment) return;

    await this.applyStatus(payment.id, await this.gateway.fetchStatus(providerTransactionId));
  }

  private async applyStatus(paymentId: string, incoming: PaymentStatus): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
      const next = nextPaymentStatus(payment.status, incoming);
      if (!next) return;

      // Conditional on the status we read: two concurrent webhooks cannot both apply the transition.
      const updated = await tx.payment.updateMany({
        where: { id: paymentId, status: payment.status },
        data: { status: next, ...(next === "approved" ? { confirmedAt: new Date() } : {}) },
      });
      if (updated.count === 0 || next !== "approved") return;

      await tx.idea.updateMany({ where: { id: payment.ideaId, paidAt: null }, data: { paidAt: new Date() } });
    });
  }
}
```

- [ ] **Step 3: Contrôleurs et module**

`apps/api/src/payments/payments.controller.ts` :

```ts
import { Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";
import { IdeaAccessGuard } from "../ideas/idea-access.guard.js";
import { PaymentService } from "./payment.service.js";

@Controller("ideas")
@UseGuards(IdeaAccessGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentService) {}

  @Post(":id/payments")
  @HttpCode(HttpStatus.CREATED)
  start(@Param("id") id: string) {
    return this.payments.startCheckout(id);
  }

  @Get(":id/payment")
  status(@Param("id") id: string) {
    return this.payments.getStatus(id);
  }
}
```

`apps/api/src/payments/fedapay-webhook.controller.ts` :

```ts
import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Req,
  ServiceUnavailableException,
  type RawBodyRequest,
} from "@nestjs/common";
import type { Request } from "express";
import { extractFedaPayTransactionId } from "./fedapay.gateway.js";
import { verifyFedaPaySignature } from "./fedapay-signature.js";
import { PaymentGatewayError } from "./payment-gateway.port.js";
import { PaymentService } from "./payment.service.js";

@Controller("payments/webhook")
export class FedaPayWebhookController {
  constructor(private readonly payments: PaymentService) {}

  @Post("fedapay")
  @HttpCode(HttpStatus.OK)
  async handle(@Req() request: RawBodyRequest<Request>, @Headers("x-fedapay-signature") signature?: string) {
    const secret = process.env.FEDAPAY_WEBHOOK_SECRET?.trim();
    if (!secret) {
      throw new NotFoundException();
    }

    const rawBody = request.rawBody;
    if (!rawBody || !verifyFedaPaySignature(rawBody, signature, secret)) {
      throw new BadRequestException("Signature FedaPay invalide.");
    }

    let event: unknown;
    try {
      event = JSON.parse(rawBody.toString("utf8"));
    } catch {
      throw new BadRequestException("Corps de webhook illisible.");
    }

    const transactionId = extractFedaPayTransactionId(event);
    if (transactionId) {
      try {
        await this.payments.handleProviderUpdate(transactionId);
      } catch (error) {
        // Let FedaPay retry later when its own API could not be re-read.
        if (error instanceof PaymentGatewayError) throw new ServiceUnavailableException();
        throw error;
      }
    }

    return { received: true };
  }
}
```

`apps/api/src/payments/payments.module.ts` :

```ts
import { Module } from "@nestjs/common";
import { FedaPayWebhookController } from "./fedapay-webhook.controller.js";
import { createPaymentGateway } from "./payment-gateway.factory.js";
import { PAYMENT_GATEWAY } from "./payment-gateway.port.js";
import { PaymentService } from "./payment.service.js";
import { PaymentsController } from "./payments.controller.js";

@Module({
  controllers: [PaymentsController, FedaPayWebhookController],
  providers: [PaymentService, { provide: PAYMENT_GATEWAY, useFactory: () => createPaymentGateway() }],
})
export class PaymentsModule {}
```

`IdeaAccessGuard` est résolu par Nest dans ce module (sa seule dépendance, `PrismaService`, vient du `PrismaModule` global) : ne pas l'ajouter aux `providers`. Si Nest ne le résout pas, l'ajouter aux `providers` de `PaymentsModule` et le signaler dans le rapport.

- [ ] **Step 4: Brancher l'application**

- `apps/api/src/app.module.ts` : importer `PaymentsModule` depuis `./payments/payments.module.js` et l'ajouter à `imports`.
- `apps/api/src/main.ts` : remplacer `NestFactory.create<NestExpressApplication>(AppModule)` par `NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true })` (le webhook a besoin du corps brut pour la signature).

Run: `pnpm --filter api exec vitest run src/payments` — Expected: PASS (tous les fichiers de `src/payments`).

- [ ] **Step 5: Suite complète, build, commit**

Run: `pnpm --filter api test && pnpm --filter api lint && pnpm --filter api build`

```bash
git add apps/api/src/payments apps/api/src/app.module.ts apps/api/src/main.ts
git commit -m "feat(api): paiement de l'analyse et webhook FedaPay verifie cote serveur

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Web — jeton d'accès, client paiement, offre à la fin de `/commencer`

**Files:**
- Modify: `apps/web/src/lib/ideas-api.ts`
- Modify: `apps/web/src/components/wizard/wizard-reducer.ts`, `apps/web/src/components/wizard/WizardProgress.tsx`
- Create: `apps/web/src/components/wizard/StepOffer.tsx`
- Modify: `apps/web/src/app/commencer/page.tsx`

**Interfaces:**
- Consumes: API de Tasks 2, 3, 6.
- Produces (`ideas-api.ts`) :
  - `saveAccessToken(ideaId: string, token: string): void`, `readAccessToken(ideaId: string): string | null`
  - `CreateIdeaResponse` gagne `accessToken?: string`
  - `type PaymentStatus = "pending" | "approved" | "declined" | "canceled"`
  - `class AccessDeniedError extends Error`
  - `startPayment(ideaId: string): Promise<{ redirectUrl: string }>`
  - `fetchPaymentStatus(ideaId: string): Promise<{ paid: boolean; status: PaymentStatus | null }>`
  - `interface IdeaDetail { id: string; businessModel: BusinessModel; currency: CurrencyCode; hypotheses: { key: string; value: number }[]; paid: boolean }`
  - `fetchIdea(ideaId: string): Promise<IdeaDetail>`, `hypothesesFromDetail(detail: IdeaDetail): HypothesesInput`
  - `WizardStep` : `"business-type" | "description" | "hypotheses" | "canvas" | "results" | "offer"` ; `WhatIfDeltas` reste exporté par `wizard-reducer.ts`.

- [ ] **Step 1: Client API**

Dans `apps/web/src/lib/ideas-api.ts` :

1. Ajouter `accessToken?: string;` à `CreateIdeaResponse`.
2. Après `API_BASE_URL`, ajouter :

```ts
const ACCESS_KEY_PREFIX = "ca-tient:access:";

// localStorage can throw (private browsing, storage disabled): access is then simply not remembered.
export function saveAccessToken(ideaId: string, token: string): void {
  try {
    window.localStorage.setItem(`${ACCESS_KEY_PREFIX}${ideaId}`, token);
  } catch {
    // ignored on purpose
  }
}

export function readAccessToken(ideaId: string): string | null {
  try {
    return window.localStorage.getItem(`${ACCESS_KEY_PREFIX}${ideaId}`);
  } catch {
    return null;
  }
}

function authHeaders(ideaId: string): Record<string, string> {
  const token = readAccessToken(ideaId);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class AccessDeniedError extends Error {
  constructor() {
    super("Acces a cette analyse refuse depuis ce navigateur.");
    this.name = "AccessDeniedError";
  }
}
```

3. `createIdea` : après avoir lu la réponse, si `body.accessToken` est présent, `saveAccessToken(body.ideaId, body.accessToken)` avant de retourner.
4. `updateIdea` et `saveCanvasBlocks` : fusionner `...authHeaders(ideaId)` dans les `headers`.
5. Ajouter en fin de fichier :

```ts
export type PaymentStatus = "pending" | "approved" | "declined" | "canceled";

export interface IdeaDetail {
  id: string;
  businessModel: BusinessModel;
  currency: CurrencyCode;
  hypotheses: { key: string; value: number }[];
  paid: boolean;
}

export async function startPayment(ideaId: string): Promise<{ redirectUrl: string }> {
  const response = await fetch(`${API_BASE_URL}/ideas/${ideaId}/payments`, {
    method: "POST",
    headers: authHeaders(ideaId),
  });

  if (response.status === 409) {
    return { redirectUrl: `/analyse/${ideaId}` };
  }
  if (response.status === 401 || response.status === 404) {
    throw new AccessDeniedError();
  }
  if (!response.ok) {
    throw new Error(`Le paiement n'a pas pu demarrer (${response.status}).`);
  }

  const body = (await response.json()) as { redirectUrl: string };
  return { redirectUrl: body.redirectUrl };
}

export async function fetchPaymentStatus(ideaId: string): Promise<{ paid: boolean; status: PaymentStatus | null }> {
  const response = await fetch(`${API_BASE_URL}/ideas/${ideaId}/payment`, { headers: authHeaders(ideaId) });

  if (response.status === 401 || response.status === 404) {
    throw new AccessDeniedError();
  }
  if (!response.ok) {
    throw new Error(`Le statut du paiement est indisponible (${response.status}).`);
  }

  return (await response.json()) as { paid: boolean; status: PaymentStatus | null };
}

export async function fetchIdea(ideaId: string): Promise<IdeaDetail> {
  const response = await fetch(`${API_BASE_URL}/ideas/${ideaId}`, { headers: authHeaders(ideaId) });

  if (response.status === 401 || response.status === 404) {
    throw new AccessDeniedError();
  }
  if (!response.ok) {
    throw new Error(`L'analyse est indisponible (${response.status}).`);
  }

  return (await response.json()) as IdeaDetail;
}

export function hypothesesFromDetail(detail: IdeaDetail): HypothesesInput {
  const value = (key: keyof HypothesesInput) => detail.hypotheses.find((h) => h.key === key)?.value ?? 0;
  return {
    price: value("price"),
    volume: value("volume"),
    variableCostPerUnit: value("variableCostPerUnit"),
    fixedCosts: value("fixedCosts"),
  };
}
```

- [ ] **Step 2: Wizard sans les écrans payants**

`wizard-reducer.ts` :
- `WizardStep` devient `"business-type" | "description" | "hypotheses" | "canvas" | "results" | "offer"`.
- Supprimer de `WizardState`, de `initialWizardState` et du reducer les champs `whatIfDeltas`, `seasonalityProfile` et les actions `SET_WHAT_IF_DELTA`, `SET_SEASONALITY_PROFILE` (ils vont dans `/analyse` en Task 8). Garder `export interface WhatIfDeltas` (utilisé par `StepEtSi`/`StepScenarios`) et supprimer l'import de `SeasonalityProfileKey` s'il devient inutile.

`WizardProgress.tsx`, tableau `STEPS` :

```ts
const STEPS: { key: WizardStep; label: string }[] = [
  { key: "business-type", label: "Type" },
  { key: "description", label: "Description" },
  { key: "hypotheses", label: "Hypotheses" },
  { key: "canvas", label: "Ton business model" },
  { key: "results", label: "Apercu" },
  { key: "offer", label: "Analyse complete" },
];
```

- [ ] **Step 3: Écran d'offre**

`apps/web/src/components/wizard/StepOffer.tsx` :

```tsx
export function StepOffer({
  onPay,
  onBack,
  paying,
  error,
}: {
  onPay: () => void;
  onBack: () => void;
  paying: boolean;
  error: string | null;
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 text-center">
      <div>
        <p className="text-micro font-medium tracking-micro text-text-secondary">Analyse complete</p>
        <h1 className="text-h2-mobile font-semibold md:text-h2">Va plus loin que l&apos;apercu</h1>
      </div>
      <ul className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6 text-left text-body">
        <li>&quot;Et si ?&quot; : change ton prix, tes ventes ou tes couts et vois l&apos;effet en direct, mois par mois selon ta saisonnalite.</li>
        <li>Les scenarios prudent, realiste, ambitieux et crise, compares cote a cote.</li>
        <li>Bientot inclus : ton rapport complet, avec ton business model et le capital dont tu as besoin.</li>
      </ul>
      <p className="text-h1-mobile font-bold tabular-nums md:text-h1">1 000 FCFA</p>
      <p className="text-small text-text-secondary">
        Paiement unique, sans abonnement, sur la page securisee FedaPay (mobile money ou carte).
      </p>
      <p className="text-small text-text-secondary">
        Ca tient ? est une aide a la decision, pas une garantie de rentabilite : les resultats dependent des hypotheses que tu fournis.
      </p>
      {error ? <p className="text-small text-error">{error}</p> : null}
      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="text-body font-medium text-text-secondary">
          Retour
        </button>
        <button
          type="button"
          onClick={onPay}
          disabled={paying}
          className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-6 py-3 text-body font-semibold text-white disabled:opacity-40"
        >
          {paying ? "Redirection..." : "Payer 1 000 FCFA"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: `/commencer` s'arrête sur l'offre**

Dans `apps/web/src/app/commencer/page.tsx` :
1. Supprimer les imports et les blocs de rendu de `StepEtSi` et `StepScenarios`.
2. Importer `StepOffer` et `startPayment`.
3. Ajouter `const [paying, setPaying] = useState(false);` et :

```tsx
  async function handlePay() {
    if (!response) return;
    setPaying(true);
    setError(null);
    try {
      const { redirectUrl } = await startPayment(response.ideaId);
      window.location.assign(redirectUrl);
    } catch {
      setError("Le paiement n'a pas pu demarrer. Reessaie.");
      setPaying(false);
    }
  }
```

4. Dans le bloc `state.step === "results"`, le bouton devient « Voir l&apos;analyse complete » avec `onClick={() => dispatch({ type: "GO_TO_STEP", step: "offer" })}`.
5. Ajouter le rendu :

```tsx
      {state.step === "offer" && response && (
        <StepOffer
          onPay={handlePay}
          onBack={() => dispatch({ type: "GO_TO_STEP", step: "results" })}
          paying={paying}
          error={error}
        />
      )}
```

- [ ] **Step 5: Lint, build, commit**

Run: `pnpm --filter web lint && pnpm --filter web build`
Expected: aucune erreur (le build échouera si une référence à `whatIfDeltas`/`seasonalityProfile` subsiste dans `/commencer`).

```bash
git add apps/web/src
git commit -m "feat(web): offre a 1 000 FCFA apres l'apercu, jeton d'acces cote client

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Web — page `/analyse/[ideaId]` (retour de paiement et analyse payante)

**Files:**
- Create: `apps/web/src/app/analyse/[ideaId]/page.tsx`
- Modify: `apps/web/src/components/wizard/StepEtSi.tsx` (`onBack` optionnel)

**Interfaces:**
- Consumes: `fetchPaymentStatus`, `fetchIdea`, `hypothesesFromDetail`, `startPayment`, `AccessDeniedError`, `IdeaDetail`, `PaymentStatus` (Task 7) ; `StepEtSi`, `StepScenarios`, `WhatIfDeltas` (existants) ; `SeasonalityProfileKey` de `financial-engine`.

- [ ] **Step 1: `StepEtSi` sans bouton Retour possible**

Dans `StepEtSi.tsx` : `onBack?: () => void;` dans le type des props, et le bouton « Retour » n'est rendu que si `onBack` est défini (sinon rendre `<span />` pour garder l'alignement `justify-between`).

- [ ] **Step 2: Page d'analyse**

Lire d'abord `apps/web/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-params.md` (Next 16). Créer `apps/web/src/app/analyse/[ideaId]/page.tsx` :

```tsx
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SeasonalityProfileKey } from "financial-engine";
import { StepEtSi } from "@/components/wizard/StepEtSi";
import { StepScenarios } from "@/components/wizard/StepScenarios";
import type { WhatIfDeltas } from "@/components/wizard/wizard-reducer";
import {
  AccessDeniedError,
  fetchIdea,
  fetchPaymentStatus,
  hypothesesFromDetail,
  startPayment,
  type IdeaDetail,
} from "@/lib/ideas-api";

const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 120_000;
const NO_DELTAS: WhatIfDeltas = { price: 0, volume: 0, variableCostPerUnit: 0, fixedCosts: 0 };

type View =
  | { kind: "loading" }
  | { kind: "no-access" }
  | { kind: "pending"; timedOut: boolean }
  | { kind: "failed" }
  | { kind: "error" }
  | { kind: "paid"; idea: IdeaDetail };

export default function AnalysePage() {
  const { ideaId } = useParams<{ ideaId: string }>();
  const [view, setView] = useState<View>({ kind: "loading" });
  const [retrying, setRetrying] = useState(false);
  const [screen, setScreen] = useState<"et-si" | "scenarios">("et-si");
  const [deltas, setDeltas] = useState<WhatIfDeltas>(NO_DELTAS);
  const [profile, setProfile] = useState<SeasonalityProfileKey>("stable");
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollStartedAt = useRef<number>(0);

  const check = useCallback(async () => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    try {
      const payment = await fetchPaymentStatus(ideaId);
      if (payment.paid) {
        setView({ kind: "paid", idea: await fetchIdea(ideaId) });
        return;
      }
      if (payment.status === "pending") {
        const timedOut = Date.now() - pollStartedAt.current >= POLL_TIMEOUT_MS;
        setView({ kind: "pending", timedOut });
        if (!timedOut) pollTimer.current = setTimeout(() => void check(), POLL_INTERVAL_MS);
        return;
      }
      setView({ kind: "failed" });
    } catch (error) {
      setView({ kind: error instanceof AccessDeniedError ? "no-access" : "error" });
    }
  }, [ideaId]);

  const checkAgain = useCallback(() => {
    pollStartedAt.current = Date.now();
    setView({ kind: "loading" });
    void check();
  }, [check]);

  // No token in this browser: the API answers 401, which check() turns into the "no-access" view.
  useEffect(() => {
    pollStartedAt.current = Date.now();
    void check();
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [check]);

  async function retryPayment() {
    setRetrying(true);
    try {
      const { redirectUrl } = await startPayment(ideaId);
      window.location.assign(redirectUrl);
    } catch {
      setRetrying(false);
      setView({ kind: "error" });
    }
  }

  const primaryButton =
    "rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-6 py-3 text-body font-semibold text-white disabled:opacity-40";

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-12 px-4 py-16 sm:px-6">
      {view.kind === "loading" && <p className="text-center text-body text-text-secondary">Chargement de ton analyse...</p>}

      {view.kind === "no-access" && (
        <div className="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
          <h1 className="text-h2-mobile font-semibold md:text-h2">Analyse introuvable</h1>
          <p className="text-body text-text-secondary">
            Cette analyse n&apos;est accessible que depuis le navigateur qui l&apos;a creee.
          </p>
          <Link href="/commencer" className={primaryButton}>
            Tester une idee
          </Link>
        </div>
      )}

      {view.kind === "pending" && (
        <div className="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
          <h1 className="text-h2-mobile font-semibold md:text-h2">Paiement en cours de confirmation</h1>
          <p className="text-body text-text-secondary">
            {view.timedOut
              ? "Le paiement n'est pas encore confirme. S'il a bien ete debite, il sera pris en compte des la confirmation de FedaPay."
              : "On attend la confirmation de FedaPay, ca prend en general quelques secondes."}
          </p>
          {view.timedOut ? (
            <button type="button" onClick={checkAgain} className={primaryButton}>
              Verifier a nouveau
            </button>
          ) : null}
        </div>
      )}

      {view.kind === "failed" && (
        <div className="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
          <h1 className="text-h2-mobile font-semibold md:text-h2">Le paiement n&apos;a pas abouti</h1>
          <p className="text-body text-text-secondary">Rien n&apos;a ete perdu : tes hypotheses sont enregistrees. Tu peux reessayer.</p>
          <button type="button" onClick={() => void retryPayment()} disabled={retrying} className={primaryButton}>
            {retrying ? "Redirection..." : "Reessayer le paiement"}
          </button>
        </div>
      )}

      {view.kind === "error" && (
        <div className="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
          <h1 className="text-h2-mobile font-semibold md:text-h2">Service momentanement indisponible</h1>
          <button type="button" onClick={checkAgain} className={primaryButton}>
            Reessayer
          </button>
        </div>
      )}

      {view.kind === "paid" && screen === "et-si" && (
        <StepEtSi
          hypotheses={hypothesesFromDetail(view.idea)}
          currency={view.idea.currency}
          whatIfDeltas={deltas}
          seasonalityProfile={profile}
          onDeltaChange={(key, value) => setDeltas((current) => ({ ...current, [key]: value }))}
          onSeasonalityChange={setProfile}
          onNext={() => setScreen("scenarios")}
        />
      )}

      {view.kind === "paid" && screen === "scenarios" && (
        <StepScenarios
          hypotheses={hypothesesFromDetail(view.idea)}
          currency={view.idea.currency}
          whatIfDeltas={deltas}
          onBack={() => setScreen("et-si")}
        />
      )}
    </main>
  );
}
```

- [ ] **Step 3: Lint, build, commit**

Run: `pnpm --filter web lint && pnpm --filter web build`
Expected: la route `/analyse/[ideaId]` apparaît dans la sortie du build, aucune erreur. Tous les `setState` de la page sont faits après un `await` ou dans un gestionnaire d'événement : si la règle `react-hooks/set-state-in-effect` signale malgré tout quelque chose, ne pas la désactiver — restructurer et le signaler dans le rapport.

```bash
git add apps/web/src
git commit -m "feat(web): page d'analyse payante avec verification du paiement cote serveur

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Documentation et vérification bout en bout

**Files:**
- Modify: `docs/DECISIONS.md`, `docs/USER_FLOWS.md`, `docs/API.md`, `docs/PAYMENT.md`, `docs/SECURITY.md`, `docs/DATABASE.md`, `apps/api/.env.example`, `tasks/TODO.md`, `tasks/CHANGELOG.md`

- [ ] **Step 1: Configuration**

`apps/api/.env.example`, à la fin :

```bash
# Payments: "test" approves at once (development only, refused when NODE_ENV=production), "fedapay" for real payments.
PAYMENT_PROVIDER="test"
# FedaPay (required when PAYMENT_PROVIDER=fedapay): secret API key and the webhook signing secret from the dashboard.
FEDAPAY_ENV="sandbox"
FEDAPAY_SECRET_KEY=""
FEDAPAY_WEBHOOK_SECRET=""
```

- [ ] **Step 2: Documentation**

- `docs/DECISIONS.md`, nouvelle entrée datée `[2026-09-26]` après la dernière : **Paiement après l'aperçu** (gratuit : type → aperçu ; payant : Et si ?, scénarios, puis capital et rapport en 6b-2 ; résout la contradiction entre `USER_FLOWS.md` et `BUSINESS_RULES.md`/`CLAUDE.md` #4) ; **jeton d'accès par idée** (pas de compte ni de cookie : domaines web/API distincts ; perte d'accès si changement de navigateur, assumée pour le MVP) ; **page hébergée FedaPay** ; **statut fixé uniquement par le serveur** (webhook signé + relecture de la transaction, ou relecture au polling) ; **limite assumée** (Et si ?/scénarios calculés dans le navigateur : le paywall protège l'affichage, et en 6b-2 le rapport servi par l'API) ; aucune dépendance (pas de SDK FedaPay). Spec : `docs/superpowers/specs/2026-09-26-phase-6b1-acces-paiement-design.md`.
- `docs/USER_FLOWS.md` : réordonner le tableau (1 Landing, 2 Type, 3 Description, 4 Hypothèses, 5 Ton business model, 6 Aperçu, 7 Offre, 8 Paiement, 9 Et si… ?, 10 Scénarios, 11 Rapport (6b-2)) ; dans « Points de rupture », préciser : paiement annulé/échoué → écran « Le paiement n'a pas abouti » avec « Réessayer le paiement » ; pending → attente avec vérification toutes les 3 s pendant 2 min ; retour ultérieur → possible depuis le même navigateur (`/analyse/<id>`).
- `docs/API.md` : section « Idées et hypothèses » — mentionner que toutes les routes `/ideas/:id…` exigent `Authorization: Bearer <accessToken>` (401 sans en-tête, 404 si jeton faux) et que `POST /ideas` renvoie `accessToken` ; section « Paiement » : remplacer par `POST /ideas/:id/payments` (201 `{ paymentId, redirectUrl }`, 409 si déjà payée, 503 si le provider échoue), `GET /ideas/:id/payment` (`{ paid, status }`, relit FedaPay si `pending`), `POST /payments/webhook/fedapay` (signature `X-FEDAPAY-SIGNATURE` obligatoire).
- `docs/PAYMENT.md` : ajouter une section « Implémentation (Phase 6b-1) » : chemins de code (`apps/api/src/payments/`), URLs et endpoints FedaPay, format exact de la signature (`t=…,s=…`, HMAC-SHA256 de `"<t>.<corps brut>"`, tolérance 300 s, source : SDK officiel `fedapay-node`), mapping des statuts, variables d'env.
- `docs/SECURITY.md` : remplacer le paragraphe « État actuel (MVP sans comptes ni session) … » par : les routes `/ideas/:id…` sont protégées par un jeton d'accès par idée (SHA-256 stocké, comparaison en temps constant, 404 identique pour idée inconnue et jeton faux) ; webhook : signature + relecture ; `PAYMENT_PROVIDER=test` refusé en production.
- `docs/DATABASE.md` : ajouter `Idea.accessTokenHash`, `Idea.paidAt` et le modèle `Payment` réel (provider `test|fedapay`, statuts `pending|approved|declined|canceled`, unique `(provider, providerTransactionId)`).
- `tasks/TODO.md`, section « Phase 6-7 — Analyse complète & Paiement » : cocher « Écran d'offre à 1 000 FCFA » ; remplacer « Intégration FedaPay » par une ligne cochée décrivant 6b-1 + une ligne non cochée « Test réel FedaPay sandbox (clés sandbox + URL publique pour le webhook) » ; ajouter une ligne non cochée « Phase 6b-2 : écran capital, besoin financier, rapport complet, analytics ».
- `tasks/CHANGELOG.md` : section `## [Non versionné], Phase 6b-1 : accès à l'analyse et paiement` en tête, 3 à 4 puces orientées utilisateur.

- [ ] **Step 3: Vérification bout en bout (navigateur réel)**

Démarrer depuis ce worktree, en arrière-plan, en notant les PID : API `cd apps/api && PAYMENT_PROVIDER=test PORT=3011 WEB_APP_URL=http://localhost:3012 pnpm start:dev` ; web `cd apps/web && NEXT_PUBLIC_API_URL=http://localhost:3011 pnpm exec next dev -p 3012`. Parcourir avec Playwright :

1. `/commencer` : type → description → hypothèses (renseigner un prix si l'IA ne répond pas) → canvas (remplir les 7 blocs si besoin) → aperçu : l'indicateur affiche 6 étapes finissant par « Analyse complete » ; aucun écran « Et si ? » accessible.
2. « Voir l'analyse complete » → écran d'offre (1 000 FCFA, rappel aide à la décision) → « Payer 1 000 FCFA » → redirection vers `/analyse/<id>` → « Et si ? » s'affiche, sliders fonctionnels → « Scénarios ».
3. Ouvrir `/analyse/<id>` dans un **nouveau contexte navigateur** (sans `localStorage`) → écran « Analyse introuvable ».
4. `curl -s localhost:3011/ideas/<id>` sans en-tête → 401 ; avec `Authorization: Bearer faux` → 404.
5. `curl -s -X POST localhost:3011/payments/webhook/fedapay -d '{}' -H 'Content-Type: application/json'` → 404 (pas de secret webhook en mode test).
6. Console navigateur : 0 erreur sur tout le parcours.

Arrêter les serveurs par PID exact (et leurs enfants), vérifier que 3011/3012 sont libres. Consigner les résultats dans le rapport.

- [ ] **Step 4: Suite complète et commit**

Run: `pnpm --filter api test && pnpm --filter api lint && pnpm --filter api build && pnpm --filter web lint && pnpm --filter web build`

```bash
git add docs apps/api/.env.example tasks
git commit -m "docs: paiement apres l'apercu, acces par jeton et FedaPay (Phase 6b-1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
