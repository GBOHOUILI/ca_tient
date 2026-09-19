# Phase 4, extraction IA des hypothèses

Statut : validé en discussion, en attente de relecture du document avant plan d'implémentation.

## Contexte

`docs/USER_FLOWS.md` écran 4 (Hypothèses) : « L'IA propose les variables pertinentes ; l'utilisateur les confirme/corrige. » La Phase 3 (livrée) a construit ce même écran en saisie 100% manuelle (champs à 0), en notant explicitement que la Phase 4 le préremplirait sans changer le contrat (`docs/superpowers/specs/2026-09-19-phase-3-parcours-utilisateur-design.md`, section Contexte).

`docs/AI_ENGINE.md` et `skills/ai.md` posent les garde-fous : fournisseur IA interchangeable, l'IA ne calcule jamais un chiffre affiché (le moteur déterministe de la Phase 2 reste seul à produire CA/marge/résultat/seuil), mode dégradé obligatoire si le fournisseur est indisponible.

Aucun fournisseur IA n'était choisi avant cette session.

## Décisions actées dans cette session

- **Fournisseur : Google Gemini (famille Flash), SDK officiel `@google/genai`.** Choisi pour son mode structured output natif (`responseSchema`), qui force une réponse JSON conforme à un schéma et réduit fortement le risque d'extraction mal formée par rapport à un parsing de texte libre. Free-tier généreux, cohérent avec `docs/AI_ENGINE.md` (« privilégier une API économique / free-tier tant que le volume le permet »). Groq écarté : modèles open-source moins fiables pour du JSON strict sans validation additionnelle.
- **Déclenchement automatique**, pas de bouton explicite : l'appel IA part dès que l'utilisateur quitte l'écran Description (clic « Continuer »), avant l'affichage de l'écran Hypothèses. Colle au libellé de `docs/USER_FLOWS.md` (« l'IA propose »).
- **Mode dégradé silencieux.** Si l'appel échoue, timeout, ou si la réponse ne passe pas la validation : l'écran Hypothèses s'affiche normalement avec les champs à 0 (comportement Phase 3 inchangé), sans message d'erreur bloquant. Jamais de blocage du parcours sur une panne IA (`skills/ai.md`).
- **Aucun changement du contrat `POST /ideas` ni du schéma Prisma.** Que les hypothèses viennent d'une suggestion IA acceptée telle quelle ou d'une saisie 100% manuelle, l'utilisateur est réputé les avoir confirmées au moment de la soumission (c'est le sens de « l'utilisateur confirme/corrige » dans `docs/USER_FLOWS.md`) : `Hypothesis.source` reste `"utilisateur_saisi"` à la persistance. Éviter une distinction de provenance plus fine (ex. `ia_suggere` vs `utilisateur_saisi`) n'est pas demandé par le MVP scope actuel et toucherait un contrat déjà acté sans nécessité.
- **Rate-limiting sur le nouvel endpoint** (`@nestjs/throttler`, ex. 10 req/min/IP). L'endpoint est public et non authentifié (pas de compte utilisateur au MVP) mais consomme un quota IA free-tier partagé : sans garde-fou, n'importe qui peut l'épuiser.

## Architecture (`apps/api/src/ai/`)

Nouveau module `AiModule`, isolé du reste du domaine (aucune dépendance à `IdeasModule` dans ce sens : c'est `IdeasModule` qui pourra dépendre d'`AiModule` si besoin plus tard, pas l'inverse).

- `ai-provider.port.ts` — interface :
  ```typescript
  export interface SuggestedHypotheses {
    price: number;
    volume: number;
    variableCostPerUnit: number;
    fixedCosts: number;
  }

  export const AI_PROVIDER = Symbol("AI_PROVIDER");

  export interface AiProvider {
    suggestHypotheses(input: {
      businessModel: BusinessModel;
      rawDescription: string;
      currency: CurrencyCode;
    }): Promise<SuggestedHypotheses | null>;
  }
  ```
  `null` signifie « pas de suggestion disponible » (échec, timeout, réponse invalide) — jamais d'exception qui remonterait jusqu'au controller pour ce cas attendu.
- `gemini.provider.ts` — `GeminiProvider implements AiProvider`, utilise `@google/genai` avec `responseMimeType: "application/json"` + `responseSchema` correspondant à `SuggestedHypotheses`. Timeout 8s (`AbortSignal.timeout(8000)` passé au SDK). Toute erreur (réseau, quota, JSON hors schéma) est attrapée, loguée côté serveur, et traduite en retour `null`.
- Revalidation de la réponse Gemini avec les mêmes contraintes que `HypothesesDto` (entiers, `price > 0`, reste `>= 0`) avant de la considérer valide — le `responseSchema` de Gemini garantit la forme JSON, pas les bornes métier.
- `ai.module.ts` : `{ provide: AI_PROVIDER, useClass: GeminiProvider }`, exporte `AI_PROVIDER`. Clé (`GEMINI_API_KEY`) lue depuis l'environnement, jamais exposée au frontend.
- Prompt : versionné dans le code (constante dédiée, pas de template externe pour ce volume), rappelle explicitement le modèle de business, la devise et sa plus petite unité (XOF = pas de sous-unité, EUR/USD/GBP/NGN/GHS = centimes, cf. `financial-engine.types.ts`), et demande des entiers dans cette unité. Toute modification structurante du prompt en production sera tracée dans `docs/DECISIONS.md` (`skills/ai.md`).

## API

Nouvel endpoint, **stateless, rien n'est persisté**, servi par un `AiController` propre à `AiModule` (pas ajouté à `IdeasController`/`IdeasModule`, pour garder `AiModule` isolé comme décrit ci-dessus — Nest route sur le chemin déclaré, pas sur l'appartenance à un module) :

- `POST /ideas/suggest-hypotheses`
  - Body : `{ businessModel: BusinessModel; rawDescription: string; currency: CurrencyCode }` (DTO dédié, réutilise les mêmes contraintes que `CreateIdeaDto` pour ces 3 champs)
  - Réponse succès : `{ available: true; hypotheses: { price, volume, variableCostPerUnit, fixedCosts } }`
  - Réponse échec/indisponible : `{ available: false }` — toujours 200, jamais 500 pour ce cas attendu (une panne IA n'est pas une erreur serveur du point de vue du contrat HTTP)
  - Rate-limited (`@nestjs/throttler`, 10 req/min/IP)
- `POST /ideas` et `GET /ideas/:id` : **inchangés** (voir spec Phase 3).

## Frontend (`apps/web/src/app/commencer/` et `apps/web/src/components/wizard/`)

- `suggestHypotheses()` ajouté à `apps/web/src/lib/ideas-api.ts`, même pattern que `createIdea()`.
- Nouvelle action reducer `SET_HYPOTHESES` (remplace les 4 champs d'un coup) dans `wizard-reducer.ts`, à côté de `SET_HYPOTHESIS` (champ unique, saisie manuelle) déjà existant.
- Le passage Description -> Hypothèses (actuellement synchrone, `onNext` direct) devient asynchrone dans `commencer/page.tsx` : appelle `suggestHypotheses`, dispatch `SET_HYPOTHESES` puis `GO_TO_STEP hypotheses` si `available: true`, sinon dispatch direct `GO_TO_STEP hypotheses` (champs restent à 0). Un seul point d'échec possible, jamais de blocage.
- État de chargement local sur le bouton « Continuer » de `StepDescription` pendant l'appel (même pattern que `submitting` déjà utilisé pour la soumission finale de la Phase 3).
- `StepHypotheses` affiche un texte contextuel discret quand les valeurs proviennent de l'IA (« Suggéré par l'IA, vérifie et corrige si besoin ») — état UI local (`wasSuggested: boolean` dans le wizard state), jamais persisté ni envoyé à l'API.

## Tests

- `GeminiProvider` : seul composant du projet où le SDK est mocké (appeler une vraie API externe payante/à quota dans la suite de tests n'est pas praticable, contrairement à Prisma/Postgres qui tournent en local sans coût). Tests : réponse valide -> `SuggestedHypotheses`, réponse hors schéma -> `null`, timeout -> `null`, erreur SDK -> `null`.
- `AiController` (HTTP) : `AI_PROVIDER` mocké via le token DI, teste les deux réponses (`available: true`/`false`) et le rate-limiting (dépassement de quota -> 429).
- Frontend : pas de suite automatisée (cohérent Phase 3), vérification manuelle : cas succès (hypothèses préremplies), cas échec simulé (champs à 0, aucun blocage).

## Hors scope (rappel)

- Distinction de provenance des hypothèses en base (`ia_suggere` vs `utilisateur_saisi`) — voir décision ci-dessus.
- Bouton de nouvelle suggestion / regénération sur l'écran Hypothèses.
- Clarifications conversationnelles IA (poser des questions à l'utilisateur si la description est trop vague) — mentionné dans `docs/AI_ENGINE.md` comme capacité de l'IA mais hors scope de `tasks/TODO.md` Phase 4 (« Extraction des hypothèses depuis la description libre » uniquement).
- Génération des scénarios prudent/réaliste/ambitieux/crise par l'IA (Phase 5, le moteur les supporte déjà).

## Risques / points d'attention

- Le `responseSchema` Gemini garantit la forme JSON mais pas la pertinence métier (une description très vague peut produire des valeurs incohérentes) — atténué par la revalidation des bornes côté serveur et par le fait que l'utilisateur reste toujours en position de tout corriger avant soumission.
- La conversion en plus petite unité de devise (centimes pour EUR/USD/GBP/NGN/GHS) demandée au modèle dans le prompt est un point de fragilité pour les devises hors XOF (marché initial, sans sous-unité) : accepté comme limitation connue pour ce MVP, l'utilisateur révise de toute façon les valeurs.
- Free-tier Gemini : quota partagé par toute l'application, pas par utilisateur — le rate-limiting par IP limite l'abus individuel mais pas un pic de trafic légitime qui épuiserait le quota global ; acceptable pour le volume attendu au MVP, à revoir si le produit scale.
