# DEPLOYMENT.md — Mise en ligne

Architecture (décision du 2026-10-02, `docs/DECISIONS.md`) :

| Brique | Hébergeur | Offre | Configuration |
|---|---|---|---|
| Base PostgreSQL | Neon | gratuite | — |
| API NestJS | Render | gratuite (se met en veille après inactivité) | `render.yaml` (Blueprint) |
| Web Next.js | Netlify | gratuite (usage commercial autorisé) | `apps/web/netlify.toml` |

Node 24 partout (`.nvmrc`). pnpm 10.33.2 épinglé via `npx` dans le build Render.

## 1. Neon (base de données)

1. Créer un projet sur neon.tech, région **AWS Europe (Frankfurt)** (la plus proche de Render Frankfurt).
2. Copier la chaîne de connexion **directe** (pas « pooled ») : `postgresql://…neon.tech/neondb?sslmode=require`. Elle sert à l'API et aux migrations.

## 2. Render (API)

1. Sur render.com : **New → Blueprint**, choisir le dépôt GitHub `ca_tient`. Render lit `render.yaml` et crée le service `ca-tient-api`.
2. Renseigner les variables demandées (`sync: false`) :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | chaîne Neon de l'étape 1 |
| `WEB_APP_URL` | adresse(s) du site, séparées par des virgules, sans `/` final (ex. `https://catient.zerotoone.bj,https://catient.netlify.app`). Toutes sont autorisées (CORS) ; la **première** reçoit le retour après paiement. |
| `FEDAPAY_SECRET_KEY` | clé **sandbox** `sk_sandbox_…` |
| `FEDAPAY_WEBHOOK_SECRET` | secret du webhook (étape 4 ; provisoirement une valeur quelconque, l'API exige qu'il soit renseigné) |
| `GEMINI_API_KEY` (+ `_2`… si plusieurs) | clé(s) Gemini |
| `GROQ_API_KEY`, `MISTRAL_API_KEY` | facultatives (secours IA) |

Déjà fixées par le Blueprint : `NODE_VERSION=24`, `TRUST_PROXY=1`, `ANALYSIS_PRICE_XOF=1000`, `PAYMENT_PROVIDER=fedapay`, `FEDAPAY_ENV=sandbox`, `ADMIN_KEY` (générée aléatoirement par Render : la lire dans l'onglet Environment pour se connecter à `/admin`).

3. Premier déploiement : le build installe, construit le moteur, génère le client Prisma et compile l'API ; le démarrage applique les migrations (`prisma migrate deploy`) puis lance l'API. Vérifier `https://<service>.onrender.com/health` → `{"status":"ok"}`.

## 3. Netlify (web)

1. Sur netlify.com : **Add new site → Import from Git**, dépôt `ca_tient`.
2. Paramètres : **Base directory** vide (racine du dépôt), **Package directory** `apps/web`. Netlify lit `apps/web/netlify.toml` (commande et dossier de publication).
3. Variable d'environnement : `NEXT_PUBLIC_API_URL` = `https://<service>.onrender.com` (sans `/` final).
4. Déployer, puis reporter l'URL Netlify (`https://<site>.netlify.app`) dans `WEB_APP_URL` sur Render (CORS et retour de paiement) et redéployer l'API.

## 4. FedaPay (sandbox)

1. Dashboard FedaPay en mode **Sandbox** → Webhooks → créer un webhook vers `https://<service>.onrender.com/payments/webhook/fedapay`.
2. Copier le secret de signature dans `FEDAPAY_WEBHOOK_SECRET` sur Render, redéployer.
3. Faire un paiement « MoMo test » depuis le site : l'analyse doit s'ouvrir au retour, et le webhook apparaître en succès (200) dans le dashboard FedaPay.

## 5. Vérification après mise en ligne

Parcours complet sur les vraies URL : landing → test d'une idée → profil → aperçu → paiement sandbox → « Et si ? » → scénarios → capital → rapport → code de récupération (ouvert depuis un autre navigateur) → `/admin` avec l'`ADMIN_KEY` de Render.

## Passage en production réelle (plus tard)

- Compte FedaPay activé pour le live ; **régénérer la clé secrète live** (l'ancienne a circulé en clair) ; `FEDAPAY_ENV=live`, `FEDAPAY_SECRET_KEY=sk_live_…`, nouveau webhook live et son secret.
- Vérifier `ANALYSIS_PRICE_XOF` (jamais 0 en production).
- Passer l'API Render sur une offre payante dès les premiers paiements réels (plus de mise en veille).
- Nom de domaine (≈ 5 000–10 000 FCFA, `docs/ROADMAP.md`), puis mettre à jour `WEB_APP_URL`, `NEXT_PUBLIC_API_URL` et l'URL du webhook.

## Limites connues de l'offre gratuite

- **Render** : l'API se met en veille après une période d'inactivité ; la requête suivante attend son réveil (jusqu'à environ une minute). La landing ne l'attend jamais plus de 3 s pour le prix (repli sur 1 000 FCFA, corrigé à la régénération suivante) ; l'écran d'offre, lui, attend le vrai prix avant de permettre le paiement.
- **Neon** : la base se suspend aussi après inactivité ; la première requête est un peu plus lente.
