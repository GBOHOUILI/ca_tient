# CHANGELOG.md

## [Non versionné], confort mobile
- Menu mobile (Tester mon idée, Retrouver mon analyse, Tarif, Questions fréquentes, Confidentialité), fermé par un lien ou Échap ; bouton de thème dans la barre, à côté du menu ; liste unique pour ajouter les prochaines fonctionnalités.
- Champs numériques (hypothèses, capital) : 0 affiché comme champ vide, plus de « 05 » quand on tape ; clavier numérique sur mobile.
- Blocs du business model : la zone de texte s'agrandit selon son contenu, la suggestion de l'IA se lit sans défiler.

## [Non versionné], SEO et pied de page
- Métadonnées complètes (titre par page, description, Open Graph, Twitter, canonique), `robots.txt`, `sitemap.xml`, image de partage et icônes générées, données structurées (Organization, WebApplication, FAQPage) sur la landing.
- Pages privées (`/analyse/*`, `/admin`, `/retrouver`) exclues de l'indexation.
- Pied de page en colonnes (produit, aide, lien zerotoone.bj) ; ancre `#faq`.
- Fichiers par défaut de Next retirés de `public/` et ancien favicon remplacé.

## [Non versionné], retours externes sur la landing et le verdict
- Verdict plus honnête : aide sous « ventes par mois » (le chiffre qui pèse le plus, à vérifier), rémunération du fondateur à inclure dans les charges fixes, pertes / retours / publicité dans le coût par unité, ligne « Si tu vends 20 % de moins » dans l'aperçu (moteur), fonds de roulement signalé dans le rapport et la FAQ, ligne « Ta description est analysée par une IA » sous la description.
- Partage du verdict sur WhatsApp depuis l'aperçu (lien `wa.me`, verdict et seuil uniquement).
- Types de business restauration, agriculture, transformation alimentaire (enum, consignes IA, aides).
- Landing : section « Et dans l'analyse complète », extrait réel du rapport calculé sur l'exemple ; exemple partagé entre l'aperçu et l'extrait.

## [Non versionné], avis des utilisateurs
- Encart « Ton avis sur Ça tient ? » sous le rapport (note, commentaire, prénom et ville facultatifs, accord de publication).
- Onglet « Avis » du dashboard : publier ou masquer ; impossible de publier sans l'accord de l'auteur.
- Section « Ce qu'en disent les utilisateurs » sur la landing, affichée seulement s'il existe au moins un avis publié.
- 7 tests API ; circuit complet vérifié dans Chrome.

## [Non versionné], suppression des données, confidentialité, header
- Suppression complète d'une analyse par l'utilisateur (« Supprimer mon analyse ») ou par l'admin sur demande (fiche idée, confirmation `SUPPRIMER`) ; recherche admin par e-mail ou numéro.
- Page `/confidentialite` (ZeroToOne, contact@zerotoone.bj), liens dans le pied de page et à côté du consentement de contact.
- Header : « Retrouver mon analyse » et « Tester mon idée » sur toutes les pages.
- 4 nouveaux tests API ; vérifié dans Chrome (mobile et desktop).

## [Non versionné], vulnérabilités de dépendances
- 23 alertes Dependabot (1 critique, 8 hautes) → `pnpm audit` : aucune vulnérabilité. Next.js 16.3.8, `@nestjs/mau` retiré, overrides `mysql2` / `deepmerge-ts` pour Prisma.
- Vérifié : Prisma (génération, validation, état des migrations), moteur 55 tests, API 267 tests, builds, `next build`, parcours complet dans Chrome.

## [Non versionné], accents dans les textes de l'IA
- Les consignes envoyées à l'IA sont écrites avec les accents (le modèle imitait le français sans accents) et demandent explicitement « en français correct, avec les accents » pour le canvas et la synthèse. Test qui empêche le retour de mots non accentués dans les consignes.

## [Non versionné], plusieurs adresses pour le site
- `WEB_APP_URL` accepte une liste séparée par des virgules (domaine personnalisé + adresse Netlify) : toutes autorisées pour CORS (l'API renvoie la seule origine correspondante), la première reçoit le retour après paiement. Auparavant la liste était renvoyée telle quelle et rejetée par les navigateurs.

## [Non versionné], modèles IA
- Modèles par défaut remplacés : `gemini-3.5-flash-lite` (Gemini 2.5 fermé aux nouveaux comptes) et `openai/gpt-oss-120b` (Groq a retiré `llama-3.3-70b-versatile`). Découvert en production : l'IA ne répondait plus.

## [Non versionné], préparation du déploiement
- `render.yaml` (API sur Render, Frankfurt), `apps/web/netlify.toml` (web sur Netlify), `.nvmrc` (Node 24), guide `docs/DEPLOYMENT.md` (Neon, Render, Netlify, webhook FedaPay sandbox, passage en live).
- Builds de production simulés dans un clone propre du dépôt : API (install figé, moteur, client Prisma, compilation) et démarrage en `NODE_ENV=production` (migrations, `/health`, `/pricing`), web (`next build`).
- La landing n'attend plus l'API plus de 3 s pour le prix (API gratuite en veille).

## [Non versionné], prix configurable
- `ANALYSIS_PRICE_XOF` (API, défaut 1 000) : seule source du prix, montant envoyé à FedaPay et enregistré ; `GET /pricing` public ; valeur invalide = démarrage refusé.
- Le site lit le prix depuis l'API : landing (régénérée toutes les 60 s) et écran d'offre (lu juste avant le paiement). Plus aucun prix en dur dans le web.
- `0` = analyse complète gratuite (tests) : déblocage immédiat sans FedaPay, textes adaptés (« Aperçu et analyse complète gratuits », « Voir l'analyse complète »).
- Vérifié dans Chrome avec 0 et 2 500 : landing, offre, déblocage gratuit ; 4 nouveaux tests API.

## [Non versionné], landing orientée conversion
- Audit de la landing : une promesse fausse corrigée (« Et si ? » et les scénarios étaient présentés avant le paiement alors qu'ils sont payants) ; l'aperçu gratuit, principal argument, est désormais mis en avant.
- Nouvel ordre : hero (promesse concrète + CTA unique « Tester mon idée », « Aperçu gratuit · analyse complète 1 000 FCFA »), pour qui, problème, aperçu réel calculé par le moteur sur un exemple étiqueté, 3 étapes, offre Gratuit / 1 000 FCFA, bénéfices, confiance, FAQ (objections : IA et chiffres, ce qui est gratuit, paiement, changement de téléphone, données, garantie), CTA final.
- Aucune preuve ni chiffre inventé (aucun utilisateur à ce jour) ; la FAQ dit franchement que la description est envoyée à un service d'IA. Design system inchangé, aucune dépendance.
- Vérifié dans Chrome (Playwright) : desktop 1440 px et mobile 390 px, thèmes sombre et clair, 0 erreur console, 0 débordement horizontal, CTA → `/commencer`.

## [Non versionné], dashboard admin
- `/admin` derrière `ADMIN_KEY` : vue d'ensemble (indicateurs + idées et paiements par jour), marché (types, pays, profils, avancement, médianes par type de business dans une devise), conversion (funnel + taux de paiement par type, source, campagne, pays), revenus (statuts, par jour, par semaine), idées (liste paginée, recherche, filtre payé, fiche complète) et export CSV des contacts consentants.
- API `AdminModule` en lecture seule (7 routes), agrégations pures testées à part (`admin-stats.ts`), chiffres financiers recalculés par le moteur ; le funnel accepte maintenant 90 jours. 17 tests.
- `/admin/stats` redirige vers `/admin/conversion`.

## [Non versionné], collecte du profil et de la source d'arrivée
- Nouvel écran facultatif « Parle-nous de toi » entre le canvas et l'aperçu : pays, ville, profil, avancement, source déclarée, contact avec case de consentement ; « Passer » toujours possible, un échec d'enregistrement ne bloque jamais l'aperçu.
- Source d'arrivée capturée sans question (UTM + domaine référent, première source de l'onglet) et enregistrée avec l'idée.
- API : `PUT /ideas/:id/profile`, table `IdeaProfile`, colonnes UTM sur `Idea` ; contact refusé sans consentement, effacé si le consentement est retiré. 9 tests.

## [Non versionné], Phase 6b-2b : analytics minimal
- Table `AnalyticsEvent` et `POST /analytics/events` (public, 60/min/IP, liste fermée de 6 types), sans cookie ni donnée personnelle ; `sessionId` aléatoire par onglet.
- `GET /admin/stats` (clé `ADMIN_KEY`, temps constant, 404 si absente) : funnel visites → tests démarrés → aperçus → offre vue → paiements initiés → paiements confirmés → « Et si ? » → rapports consultés, plus rapports imprimés et analyses retrouvées par code. Comptes distincts ; paiements lus en base.
- Web : `trackEvent` (envoi silencieux, jamais bloquant) posé sur la landing, `/commencer`, l'offre, « Et si ? » et le rapport ; page `/admin/stats` non indexée avec choix de période et taux de passage. 8 tests.

## [Non versionné], code de récupération d'une analyse payée
- Sur une analyse payée, « Obtenir mon code » génère un code `CT-XXXXX-XXXXX` (copiable, imprimé en tête du rapport) ; un nouveau code remplace l'ancien.
- Page `/retrouver` (liens depuis le pied de page et l'écran « Analyse introuvable ») : le code rouvre l'analyse depuis n'importe quel navigateur, avec un jeton d'accès supplémentaire ; le navigateur d'origine garde le sien.
- API : `POST /ideas/:id/recovery-code` (réservée aux idées payées), `POST /recovery` (5 essais/min/IP, 404 neutre), table `IdeaAccessToken`, `IdeaAccessGuard` étendu. Code stocké uniquement haché. 16 tests.

## [Non versionné], Phase 6b-2a : capital et rapport complet
- Moteur (`packages/financial-engine`) : `computeCapitalNeed` (dépenses de départ + réserve de 3 mois de charges, besoin de financement ou excédent), `computeSensitivity` (±10 % par hypothèse, classées par impact), `computeWatchPoints` (6 règles déterministes). 55 tests.
- API : modèles `CapitalPlan` et `ReportSummary`, `PUT /ideas/:id/capital` et `GET /ideas/:id/report` réservées aux idées payées (`PaidIdeaGuard`, 403), `hasCapitalPlan` dans `GET /ideas/:id`. Rapport assemblé côté serveur ; synthèse rédigée par la chaîne IA existante à partir de faits sans montant, rejetée si elle contient un chiffre, repli sur une synthèse modèle, stockée par empreinte des faits.
- Web : écrans « Ton capital » (récapitulatif en direct via le moteur partagé) et « Ton rapport » (7 sections, canvas en 9 blocs, impression / PDF via le navigateur, feuille `@media print` en thème clair). L'écran d'offre annonce désormais le rapport comme inclus.
- Vérification : suites moteur et API vertes ; parcours API de bout en bout avec le fournisseur de paiement `test` (403 avant paiement, capital, rapport, synthèse IA réelle sans chiffre puis réutilisée).

## [Non versionné], Phase 6b-1 : accès à l'analyse et paiement
- Le paiement se place désormais après l'aperçu gratuit : "Et si ?" et les scénarios ne s'affichent qu'une fois le paiement de 1 000 FCFA confirmé côté serveur (nouvel écran "Offre" dans `/commencer`).
- Paiement sur la page hébergée FedaPay (redirection, aucune donnée bancaire sur nos serveurs) ; en développement, un `TestProvider` (`PAYMENT_PROVIDER=test`) approuve immédiatement pour travailler sans compte FedaPay.
- Chaque idée reçoit un jeton d'accès (pas de compte) : le navigateur qui l'a créée peut seul relire ou payer cette idée, y compris plus tard via `/analyse/<id>` ; un autre navigateur voit "Analyse introuvable".
- Le statut d'un paiement n'est jamais décidé par le frontend : webhook FedaPay signé, relu auprès de l'API FedaPay, ou relecture à la demande quand `/analyse/<id>` interroge le statut (toutes les 3 s pendant 2 min tant qu'il est en attente).

## [Non versionné], IA : rotation de clés et de providers
- Les suggestions IA (hypothèses, canvas) essaient Gemini, puis Groq, puis Mistral ; chaque provider peut avoir plusieurs clés (`_2` … `_10`) utilisées à tour de rôle quand l'une atteint son quota.
- Budget de 15 s par suggestion : au-delà, repli silencieux vers la saisie manuelle, comme avant.
- Toutes les réponses restent validées par les mêmes parseurs stricts avant d'être proposées.

## [Non versionné], Suivi Phase 6a : correctifs
- Revenir en arrière dans le wizard puis re-soumettre met à jour la même idée (`PUT /ideas/:id`) au lieu d'en créer une nouvelle : plus d'idée orpheline, les blocs de canvas sont conservés.
- "Voir mes resultats" est désactivé tant que le prix de vente est à 0 (cas où la suggestion IA des hypothèses échoue), avec un message explicite au lieu d'une erreur générique.
- `CanvasBlock.source` passe en enum Prisma (`CanvasBlockSource`), migration par cast sans perte ; les clés de blocs en double sont rejetées (`@ArrayUnique`).
- L'indice du coût variable n'apparaît plus sous le champ des charges fixes.

## [Non versionné], Phase 6a : capture du canvas
- Nouvel écran "Ton business model" dans le wizard, entre "Hypothèses" et "Résultats" : 7 blocs qualitatifs du business model canvas (proposition de valeur, segments clients, canaux, relations clients, ressources clés, activités clés, partenaires clés), suggérés par l'IA (`GeminiProvider.suggestCanvasBlocks`, même mécanique que la Phase 4) depuis la description libre, validés/édités par l'utilisateur.
- Nouveau modèle Prisma `CanvasBlock` (pattern identique à `Hypothesis`), persisté via `PATCH /ideas/:id/canvas-blocks` (`upsert`, tolère un retour en arrière puis re-soumission). Suggestion IA et création de l'idée lancées en parallèle (`Promise.all`) pour ne pas cumuler les latences.
- Préparation de contenu pour le rapport final enrichi (Phase 6b, hors scope ici) : les 2 blocs restants du canvas (structure de coûts, flux de revenus) resteront calculés en direct par `financial-engine`, jamais stockés comme texte.

## [Non versionné], Phase 5b : écrans "Et si ?" / "Scénarios"
- Deux nouveaux écrans du wizard, juste après l'aperçu : "Et si ?" (4 sliders en pourcentage + sélecteur de saisonnalité + graphique de seuil de rentabilité en temps réel + graphique mensuel conditionnel) et "Scénarios" (comparaison en barres des 4 scénarios prédéfinis + un scénario "Personnalisé" qui reprend les réglages de l'écran précédent).
- `apps/web` consomme directement le package `financial-engine` (Phase 5a) : aucun aller-retour réseau, recalcul instantané à chaque interaction.
- Graphiques Recharts (`apps/web/src/components/wizard/charts/`) : palette et grille reprises telles quelles de `design/COLORS.md`/`design/COMPONENTS.md`, tooltips + texte alternatif sur chaque graphique.
- Vocabulaire de l'écran Hypothèses reformulé en questions directes plutôt qu'en termes comptables (dette notée depuis la Phase 4, `design/UX_PRINCIPLES.md`).
- Vérification bout en bout manuelle (Playwright) : recalcul en direct des sliders, apparition/disparition du graphique mensuel selon la saisonnalité, cohérence du scénario "Personnalisé", 0 erreur console.

## [Non versionné], Phase 5a : moteur financier partagé + projection annuelle
- Extraction du moteur financier (`financial-engine.types.ts`, `financial-engine.errors.ts`, `financial-engine.validation.ts`, `scenarios.ts`) en package partagé du monorepo (`packages/financial-engine`), consommé par `apps/api` via un build `tsc` standard. `computeResult`/`computeBreakEven` (auparavant méthodes NestJS uniquement) sont désormais des fonctions pures du package (`financial-engine.calculations.ts`), `FinancialEngineService` en reste le seul point d'entrée NestJS, désormais un fin wrapper.
- Nouveau : `computeAnnualProjection(hypotheses, profile)` (`packages/financial-engine/src/seasonality.ts`) — projection sur 12 mois avec 4 profils de saisonnalité prédéfinis (`stable`, `fetes_fin_annee`, `ete`, `rentree_scolaire`), même mécanique que les scénarios existants (`applyDelta` sur le volume, pourcentages sommant à zéro), composable avec les scénarios prudent/réaliste/ambitieux/crise. Aucune UI, aucune persistance, aucun nouvel endpoint HTTP — module backend pur, prêt pour la Phase 5b.
- 36 tests dans `packages/financial-engine` (20 déplacés inchangés + 9 sur les fonctions de calcul extraites + 7 sur la saisonnalité), suite `apps/api` simplifiée en conséquence (logique métier non dupliquée entre les deux couches).

## [Non versionné], Phase 4 : extraction IA des hypothèses
- Nouveau module `AiModule` (`apps/api/src/ai/`), isolé d'`IdeasModule` : port `AiProvider` (`ai-provider.port.ts`), implémentation `GeminiProvider` (SDK officiel `@google/genai`, mode structured output pour forcer un JSON conforme, timeout 8s), `SuggestHypothesesDto`. Fournisseur choisi et consigné dans `docs/DECISIONS.md`.
- `POST /ideas/suggest-hypotheses` (`AiController`, stateless, aucune persistance) : renvoie `{ available: true, hypotheses }` ou `{ available: false }`, toujours HTTP 200 (jamais 500 sur une panne IA), rate-limité à 10 req/min/IP (`@nestjs/throttler`, scopé à ce seul endpoint via `ThrottlerModule.forRoot` importé dans `AiModule` uniquement). Aucun changement au contrat `POST /ideas`/`GET /ideas/:id` ni au schéma Prisma.
- Wizard frontend : le passage Description -> Hypothèses (`apps/web/src/app/commencer/page.tsx`) appelle désormais `suggestHypotheses()` et préremplit les 4 champs si une suggestion est disponible, avec repli silencieux (champs à 0, comportement Phase 3 inchangé) sur tout échec IA (réseau, timeout, JSON hors schéma, valeurs hors bornes) — jamais de blocage du parcours. Indice visuel « Suggéré par l'IA » sur l'écran Hypothèses (`StepHypotheses.tsx`), qui disparaît dès que l'utilisateur modifie un champ ou la devise.
- Deux corrections apportées en cours d'implémentation, actées dans le plan : bug de mock vitest (fonction fléchée non constructible sous vitest 4.1.11) et `@HttpCode(HttpStatus.OK)` manquant (Nest renvoie 201 par défaut sur un POST, la spec exige 200).
- Revue finale de branche : deux corrections supplémentaires avant merge — lecture de `GEMINI_MODEL` déplacée du chargement du module (jamais effective à cause de l'ordre d'évaluation ESM vs `process.loadEnvFile()`) vers l'instanciation du provider ; reset de `wasSuggested` sur changement de devise (l'indice IA pouvait rester affiché après un changement invalidant la suggestion).
- Vérification bout en bout manuelle (Playwright) : chemin succès avec une vraie clé Gemini (hypothèses préremplies, résultats cohérents) et chemin dégradé (panne réseau simulée -> champs à 0, aucune erreur JS non gérée).

## [Non versionné], Phase 3 : parcours utilisateur
- Persistance Postgres locale via Docker Compose (`docker-compose.yml`, port hôte 5433) et schéma Prisma `Idea`/`Hypothesis`/`Simulation` + enum `BusinessModel` (`apps/api/prisma/schema.prisma`), `PrismaService`/`PrismaModule` avec le driver adapter `@prisma/adapter-pg` (Prisma 7).
- `IdeasModule` (`apps/api/src/ideas/`) : `CreateIdeaDto`/`HypothesesDto` validés (class-validator/class-transformer), `IdeasService.create()` orchestrant `FinancialEngineModule` (Phase 2) et persistant idée + hypothèses + simulation "apercu", `IdeasService.findOne()`, `IdeasController` exposant `POST /ideas` et `GET /ideas/:id`.
- Wizard frontend `/commencer` (`apps/web/src/app/commencer/page.tsx`) : 4 étapes (type de business -> description libre -> hypothèses chiffrées -> résultats), machine à états `useReducer`, aucun calcul financier côté frontend (tout vient de la réponse API, conforme `CLAUDE.md`).
- Corrige deux gaps de configuration latents découverts en implémentant les premiers tests contre Postgres réel et le premier DTO décoré : `DATABASE_URL`/`.env` n'était chargé nulle part au runtime (ni tests, ni app démarrée), et `reflect-metadata` (déjà en dépendance) n'était importé nulle part — bloquant pour tout décorateur `class-transformer` (`@Type`). Ajoute `app.enableCors()` côté API (`WEB_APP_URL`), sans quoi aucun appel navigateur cross-origin vers l'API n'aboutit.
- Vérification bout en bout manuelle (Playwright) : parcours complet, résultats cohérents avec le moteur financier (250 000 / 150 000 / 50 000 XOF, seuil 34 unités), persistance en base confirmée, 0 erreur console.

## [Non versionné], Phase 2 : moteur financier
- Module pur `apps/api/src/financial-engine/` (aucune dépendance HTTP/IA) : `computeResult` (CA, marge brute, résultat estimé), `computeBreakEven` (seuil de rentabilité, gère explicitement marge unitaire nulle/négative sans division par zéro), `applyScenario`/`applyDelta` (prudent, réaliste, ambitieux, crise, et deltas personnalisés pour "Et si… ?").
- Montants en entiers dans la plus petite unité de la devise choisie par l'utilisateur (`XOF`, `EUR`, `USD`, `GBP`, `NGN`, `GHS`), aucune arithmétique flottante, aucune dépendance de calcul décimal, voir `docs/DECISIONS.md`.
- 31 tests unitaires (vitest, TDD) : cas nominal, cas limite (marge nulle, coûts fixes nuls, division par zéro évitée), cas extrême (montant au-delà de `Number.MAX_SAFE_INTEGER`, valeurs négatives/non entières rejetées).
- `FinancialEngineModule` câblé dans `AppModule`, sans controller pour l'instant (route `/ideas/:id/simulate` reportée, dépend de la persistance des idées en Phase 3+).

## [Non versionné], Phase 1 : landing page + hero Three.js
- Landing page (`apps/web/src/app/page.tsx`) : hero avec promesse/CTA/prix visible, types de business, étapes du parcours, rappel tarif.
- Hero 3D (`components/landing/HeroScene.tsx`) : nuage de particules `@react-three/fiber`/`drei`, dégradé emerald→cyan, parallax doux au pointeur, chargé en dynamique (`ssr:false`) avec fallback CSS si WebGL absent ou `prefers-reduced-motion` actif. Positions générées par un PRNG déterministe (pas de `Math.random()` pendant le render, conforme aux règles de pureté React 19 activées par `eslint-config-next` 16).
- Dark/light mode revu pour suivre `skills/frontend.md` à la lettre : classe `.dark` sur `<html>` (plus l'attribut `data-theme` du premier jet), rendu serveur par défaut sombre via cookie (`next/headers`), script anti-flash inline qui respecte `prefers-color-scheme` au premier chargement, `ThemeToggle` sans dépendance externe (`useSyncExternalStore`).
- Header sticky (glass au scroll) + footer ajoutés au layout.
- i18n (FR/EN) volontairement non traitée ici, copy FR en dur, cf. `tasks/TODO.md`.
- Vert de marque intensifié (`emerald-500` : `#059669` -> `#008558`, saturation 100%), voir `docs/DECISIONS.md`.

## [Non versionné], Phase 1 : fondation technique
- Monorepo pnpm workspaces : `apps/web` (Next.js 16 + TypeScript, App Router, Tailwind v4) et `apps/api` (NestJS 12 + Prisma 7.10.0).
- Tokens de design (`design/COLORS.md`, `design/TYPOGRAPHY.md`) portés dans `apps/web/src/app/globals.css`, couleurs mode sombre/clair via variables CSS, échelle typographique Inter avec variantes desktop/mobile.
- Prisma configuré pour PostgreSQL (`prisma/schema.prisma`, `prisma.config.ts`), sans modèle, schéma de données reporté en Phase 2. Version épinglée en 7.10.0 (le tag `latest` npm pointait vers une release candidate 8.x).
- Port par défaut de l'API fixé à 3001 pour éviter le conflit avec le 3000 de Next.js en dev local.
- Décisions consignées dans `docs/DECISIONS.md` : structure monorepo, version Prisma.

## [Non versionné] — Cadrage initial
- Reconstruction complète du pack documentaire du projet (docs/, design/, skills/, tasks/) à partir de la roadmap MVP V2 et des décisions déjà prises (FedaPay, stack Next.js/NestJS/PostgreSQL, prix 1 000 FCFA).
- Direction artistique définie : mode sombre par défaut, palette zinc + dégradé émeraude/cyan, typographie Inter, hero animé en Three.js.
