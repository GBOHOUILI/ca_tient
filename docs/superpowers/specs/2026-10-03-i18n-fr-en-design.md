# Ça tient ? en français et en anglais — design

Date : 2026-10-03. Statut : validé en conversation, à relire avant le plan.

## Objectif

Rendre le produit utilisable de bout en bout en anglais pour la **diaspora et un public international**, sans dégrader le parcours français. Ce public paie avec FedaPay en XOF (carte ou mobile money francophone) : aucun nouveau fournisseur de paiement.

Critères de réussite :
- un visiteur peut faire tout le parcours en anglais (landing → test → aperçu → paiement de test → analyse complète → rapport → code de récupération), sans un mot de français visible hors nom propre « Ça tient ? » ;
- les textes produits par l'IA (hypothèses, business model, synthèse du rapport) sont dans la langue de l'idée ;
- Google indexe les deux langues, chaque page déclarant son équivalent ;
- le parcours français reste identique (mêmes adresses, mêmes textes).

Hors périmètre : traduction du dashboard admin, autre langue que FR/EN, nouveau fournisseur de paiement, adresses traduites (`/en/start`).

## 1. Adresses et choix de la langue

- Français à la racine (`/`, `/commencer`, `/retrouver`, `/confidentialite`, `/analyse/:id`), anglais sous `/en` avec les **mêmes segments** (`/en/commencer`…).
- Les pages publiques passent sous `apps/web/src/app/[lang]/`. `[lang]/layout.tsx` devient le layout racine de ces pages (`<html lang={lang}>`), `generateStaticParams` renvoie `fr` et `en`, `dynamicParams = false`.
- `apps/web/src/proxy.ts` (convention Next 16, ex-middleware) :
  - chemin commençant par `/en` (`/en` ou `/en/...`) : rien à faire ;
  - chemin commençant par `/fr` : **redirection 308** vers le même chemin sans `/fr` (une seule adresse par page) ;
  - sinon : **réécriture** interne vers `/fr` + chemin (l'URL affichée ne change pas) ;
  - exclus du proxy : `/_next`, `/admin`, fichiers de métadonnées (`/robots.txt`, `/sitemap.xml`, `/icon`, `/apple-icon`), fichiers avec extension.
- Logique de décision dans une fonction pure `resolveLocaleRoute(pathname)` testée unitairement ; `proxy.ts` ne fait que l'appliquer.
- **Pas de redirection selon le navigateur.** Composant `LanguageSuggestion` : si `navigator.languages` préfère l'autre langue que celle de la page et que le cookie `ct_lang_hint` n'existe pas, bandeau discret en haut (« This page is available in English » / « Cette page existe en français »), lien vers l'équivalent et bouton fermer ; fermer ou suivre le lien pose le cookie (1 an). Un lien partagé garde donc sa langue.
- **Bouton FR/EN** : dans le header desktop (à côté du thème) et dans le menu mobile ; il ouvre la même page dans l'autre langue (`localizedPath(pathname, target)`), en conservant la query string.
- **Admin** : reste hors `[lang]`, en français, avec son propre layout racine (`app/admin/layout.tsx` porte `<html>`/`<body>`, thème et police). Passer du site à l'admin recharge la page : sans importance.
- Fichiers de métadonnées à la racine de `app/` (`robots.ts`, `sitemap.ts`, `icon.tsx`, `apple-icon.tsx`) ; `opengraph-image.tsx` et `twitter-image.tsx` passent sous `[lang]` pour exister dans chaque langue.

## 2. Textes

- `apps/web/src/i18n/` :
  - `locales.ts` : `LOCALES = ["fr", "en"]`, `type Locale`, `DEFAULT_LOCALE = "fr"`, `hasLocale()`, `localizedPath(path, locale)` (`fr` → sans préfixe, `en` → `/en` + chemin) ;
  - `dictionaries/fr.ts` : objet `as const`, source de la forme ; `type Dictionary` dérivé (chaînes élargies en `string`, fonctions conservées pour les textes à variables, ex. `price: (label) => \`...\``) ;
  - `dictionaries/en.ts` : `export const en: Dictionary` — **une clé manquante ou en trop casse la compilation** ;
  - `get-dictionary.ts` : `getDictionary(locale)` (import direct des deux objets, pas de chargement dynamique : le volume est faible) ;
  - `I18nProvider` (client) + `useI18n()` → `{ locale, t }` pour les composants client ; les composants serveur reçoivent `t` et `locale` du layout/de la page.
- Tout ce que voit l'utilisateur est traduit : landing (toutes sections, exemple et extrait de rapport), FAQ, header, menu, footer, parcours (`/commencer` et ses 7 étapes, options de profil, types de business), aperçu et verdict, partage WhatsApp, analyse payée (et si, scénarios, capital, rapport, impression, points à surveiller, code de récupération, avis, suppression), `/retrouver`, `/confidentialite`, messages d'erreur du web.
- Tutoiement en français conservé ; l'anglais utilise « you ».
- Les libellés métier aujourd'hui dispersés (`lib/business-models.ts`, `lib/scenarios.ts`, `wizard/profile-options.ts`, `analyse/report-copy.ts`, `landing/example.ts`…) gardent leurs **codes** et lisent leurs **libellés** dans le dictionnaire.
- Formats : `formatAmount(amount, currency, locale)` utilise `fr-FR` ou `en-GB` ; même règle pour les nombres (`formatNumber`) et dates. L'admin continue d'appeler `formatAmount` en `fr`.
- Correction au passage : `/commencer` contient deux `<main>` imbriqués ; la page utilisera un `<div>`.

## 3. Devises et prix en anglais

- Devise proposée par défaut à l'écran des hypothèses : **EUR en anglais, XOF en français** (modifiable, comme aujourd'hui). Les suggestions de l'IA sont demandées dans cette devise.
- Prix de l'analyse : inchangé (`ANALYSIS_PRICE_XOF`, payé en XOF via FedaPay). En anglais, libellé « 1,000 CFA francs (about €1.52) » : conversion par la **parité fixe officielle 1 € = 655,957 XOF**, constante `XOF_PER_EUR` dans le moteur financier, fonction `approxEurFromXof` testée, arrondie au centime. Jamais calculée par l'IA (règle `CLAUDE.md` #3).
- Les montants de l'idée de l'utilisateur ne sont jamais convertis (règle existante : pas de taux de change).

## 4. API et base de données

Modification de schéma (à consigner dans `DECISIONS.md`) :
- `Idea.locale String @default("fr")`, migration SQL générée par `prisma migrate diff` ; les idées existantes valent `fr`.
- `CreateIdeaDto.locale` : facultatif, `@IsIn(["fr","en"])`, défaut `fr`.

Usages :
- **IA** (`ai-prompts.ts`) : `buildHypothesesPrompt`, `buildCanvasPrompt` et `buildReportSummaryPrompt` reçoivent `locale`. Les prompts restent rédigés en français pour la partie consignes (déjà testée) ; seule la consigne de sortie change : « Rédige les textes en anglais correct » au lieu de « en français correct, avec les accents ». `SuggestHypothesesDto` / route de suggestion du canvas acceptent `locale` (même validation). Le texte de secours `templateSummary` existe en anglais.
- **Synthèse du rapport** : `locale` fait partie des faits (`ReportSummaryFacts`) donc de `factsHash` : une synthèse française n'est jamais servie pour une idée anglaise. Le contrôle « aucun chiffre » est inchangé.
- **Paiement** : `returnUrl` et la redirection du prix 0 deviennent `${primaryWebAppUrl()}${idea.locale === "en" ? "/en" : ""}/analyse/${ideaId}`.
- **Code de récupération** : `POST /recovery` renvoie aussi `locale` ; `/retrouver` redirige vers l'analyse dans la langue de l'idée.
- **Admin** : filtre « Langue » (toutes / fr / en) dans Marché ; colonne langue dans la liste et la fiche des idées. Libellés admin en français.

## 5. Référencement

- `generateMetadata` par page et par langue (titre, description, Open Graph `locale` `fr_FR`/`en_GB`, Twitter).
- `alternates.canonical` vers l'adresse de la langue courante ; `alternates.languages` : `fr`, `en`, `x-default` (→ français) sur les pages indexables.
- `sitemap.ts` : chaque page indexable en deux entrées avec `alternates.languages`.
- `robots.ts` : interdit aussi `/en/analyse/` ; `/en/retrouver` en `noindex` comme `/retrouver`.
- Image de partage et JSON-LD (Organization, WebApplication, FAQPage) dans la langue de la page ; `inLanguage` correspondant.

## 6. Découpage

1. **Fondations et pages publiques** : `i18n/`, `proxy.ts` + `resolveLocaleRoute`, déplacement sous `[lang]`, layout admin autonome, bouton FR/EN, bandeau, header, menu, footer, landing, FAQ, Confidentialité, SEO, `formatAmount` avec langue, `approxEurFromXof`.
2. **Parcours et analyse** : `/commencer` (toutes étapes), aperçu, partage, analyse payée, rapport, `/retrouver`, devise par défaut selon la langue.
3. **API et admin** : `Idea.locale`, prompts, synthèse, retour de paiement, récupération, filtre et colonne admin.

Chaque étape est livrable seule (l'anglais n'est annoncé nulle part — pas de lien FR/EN — avant la fin de l'étape 2).

## 7. Vérification

- Moteur : `approxEurFromXof` (1000 → 1,52).
- Web : tests unitaires de `resolveLocaleRoute` et `localizedPath` (vitest ajouté au package web, dev uniquement) ; compilation qui garantit la complétude du dictionnaire anglais.
- API (vitest, base de test) : `locale` enregistré et validé ; consigne de langue dans chaque prompt ; `factsHash` différent selon la langue ; `returnUrl` avec `/en` ; `POST /recovery` renvoie la langue.
- Chrome (scratchpad, serveurs 3011/3012) : parcours complet en anglais jusqu'au paiement de test et au rapport, desktop et mobile ; parcours français inchangé ; `/fr/commencer` → 308 vers `/commencer` ; `/en/robots.txt` inexistant, `/robots.txt` et `/sitemap.xml` corrects ; balises `hreflang` présentes ; bandeau affiché avec un navigateur en anglais sur une page française, puis plus après fermeture.

## Risques

- Volume de textes : ~50 composants. Le typage du dictionnaire évite les oublis de clés, pas les chaînes restées en dur : contrôle par recherche de chaînes françaises dans le rendu anglais (script Playwright qui signale les mots accentués dans `/en/*`).
- La page FedaPay reste dans la langue choisie par FedaPay : hors de notre contrôle.
- Le proxy s'exécute sur chaque requête de page : logique minimale, sans appel réseau.
