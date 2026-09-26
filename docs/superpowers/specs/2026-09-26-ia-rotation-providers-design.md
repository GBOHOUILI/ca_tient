# Rotation de clés et de providers IA — Design

Date : 2026-09-26
Statut : validé en conversation (recommandations acceptées), à relire avant plan d'implémentation.

## Contexte et objectif

Les deux suggestions IA du wizard (`suggestHypotheses`, Phase 4 ; `suggestCanvasBlocks`, Phase 6a) reposent sur **une seule clé Gemini**. Le quota free-tier a déjà été atteint en conditions réelles (observé Phase 4 et pendant la vérification Phase 6a le 2026-09-26) : dans ce cas l'utilisateur retombe sur une saisie 100 % manuelle.

Objectif : maximiser la disponibilité des suggestions IA sans coût, en reprenant le mécanisme éprouvé du CLI `zero-to-one-ai` (`modules/llm/index.js`) :

- **pool de clés par provider** (`GEMINI_API_KEY`, `GEMINI_API_KEY_2`, …) avec rotation automatique quand une clé atteint son quota ;
- **chaîne de providers** : quand toutes les clés d'un provider sont indisponibles, on passe au suivant.

Critère de succès : tant qu'au moins une clé d'un des providers configurés est disponible, les suggestions arrivent dans le budget de temps ; sinon, le repli silencieux actuel (champs vides, saisie manuelle) est inchangé.

## Décisions (validées)

| Sujet | Décision |
|---|---|
| Chaîne | **Gemini → Groq → Mistral**, ordre fixe. Trois free-tiers avec mode JSON natif. Claude (payant), Cohere, OpenRouter (`:free` instable) et Ollama (pas de serveur local en prod) écartés. |
| Budget de temps | **15 s au total** par suggestion, **6 s max par tentative** (`min(6 s, temps restant)`). Budget épuisé → `null` (repli silencieux actuel). |
| État des clés | En mémoire du processus (un seul serveur au MVP). Pas de Redis. |
| Transport | Gemini : SDK `@google/genai` existant (structured output). Groq et Mistral : **`fetch` natif**, un seul adaptateur OpenAI-compatible. Aucune nouvelle dépendance. |
| Clés | Variables d'environnement `<PROVIDER>_API_KEY`, puis `_2` … `_10`. Provider sans aucune clé = ignoré. |
| Modèles | Configurables : `GEMINI_MODEL` (défaut `gemini-2.5-flash`, existant), `GROQ_MODEL` (défaut `llama-3.3-70b-versatile`), `MISTRAL_MODEL` (défaut `mistral-small-latest`). |

### Classement des erreurs

| Erreur | Effet |
|---|---|
| 429 / quota dépassé | Clé mise **en pause** (`Retry-After` ou délai « retry in Xs » s'il est fourni, sinon **60 s**), on essaie la clé suivante du même provider. |
| 401 / 403 | Clé **désactivée** jusqu'au redémarrage, clé suivante. |
| Timeout, 5xx, erreur réseau | Provider suivant (pas de retry avec backoff : on protège le budget de temps). |
| Réponse reçue mais JSON invalide / hors bornes | Provider suivant (le parseur strict existant rejette la réponse). |

Pas de retry exponentiel comme dans le CLI : dans un wizard web, la latence compte plus que l'insistance sur un provider.

## Architecture

Le contrat consommé par le reste de l'app ne change pas : `AiProvider` (`ai-provider.port.ts`) avec `suggestHypotheses` / `suggestCanvasBlocks`, injecté via `AI_PROVIDER`. `AiController` et ses tests sont inchangés.

```
AiController ──> AI_PROVIDER = FallbackAiProvider
                       │  construit le prompt + parse la réponse (ai-prompts.ts)
                       │  parcourt les backends dans l'ordre, sous budget de temps
                       ▼
                 LlmBackend[]  (gemini, groq, mistral — seulement ceux qui ont des clés)
                       │  chacun possède son KeyPool
                       ▼
                 appel HTTP/SDK → texte JSON brut ou LlmError typée
```

### Unités (`apps/api/src/ai/`)

- **`ai-prompts.ts`** (nouveau, extrait de `gemini.provider.ts`) : `buildHypothesesPrompt`, `buildCanvasPrompt`, `parseSuggestedHypotheses`, `parseSuggestedCanvasBlocks`, et la description du schéma JSON attendu pour chaque tâche (`HYPOTHESES_JSON_SCHEMA`, `CANVAS_JSON_SCHEMA`, format neutre `{ properties, required, type par champ }`). Les prompts terminent par la forme JSON attendue en toutes lettres, indispensable pour Groq/Mistral qui n'appliquent pas de schéma (`json_object` garantit seulement du JSON valide). Aucune logique réseau.
- **`key-pool.ts`** (nouveau) : `KeyPool` construit depuis un préfixe d'env (`KeyPool.fromEnv("GROQ_API_KEY")`), horloge injectable pour les tests. API : `available(): string[]` (clés non en pause ni désactivées, dans l'ordre), `pause(key, ms)`, `disable(key)`, `size`. Ne logge jamais une clé ; les logs utilisent l'index (`clé #2`).
- **`llm-backend.ts`** (nouveau) : interface `LlmBackend { name; pool: KeyPool; generateJson(req: { prompt; schema; apiKey; signal }): Promise<string> }` et classe `LlmError { kind: "rate_limited" | "unauthorized" | "unavailable"; retryAfterMs? }`.
- **`gemini.backend.ts`** (remplace `gemini.provider.ts`) : `@google/genai` avec `responseMimeType: "application/json"` + `responseSchema` converti depuis le schéma neutre. Traduit les erreurs SDK (statut 429 / 401 / 403, sinon `unavailable`).
- **`openai-compatible.backend.ts`** (nouveau) : `fetch` sur `POST {baseUrl}/chat/completions` avec `response_format: { type: "json_object" }`, `temperature: 0.3`, `Authorization: Bearer`. Instancié deux fois : Groq (`https://api.groq.com/openai/v1`) et Mistral (`https://api.mistral.ai/v1`). Lit `choices[0].message.content`. Traduit 429 (+ en-tête `Retry-After`), 401/403, le reste en `unavailable`.
- **`fallback-ai.provider.ts`** (nouveau, implémente `AiProvider`) : pour chaque tâche, fixe `deadline = now + 15 s`, parcourt les backends puis les clés disponibles de chacun ; chaque tentative reçoit `AbortSignal.timeout(min(6 s, deadline − now))` ; applique le classement des erreurs ci-dessus ; parse avec le parseur de la tâche ; renvoie le premier résultat valide, sinon `null`. Un `logger.warn` par échec (provider + index de clé + raison), jamais le contenu de la clé ni la description utilisateur.
- **`ai.module.ts`** : `AI_PROVIDER` passe en `useFactory` qui construit les trois backends, **ne garde que ceux dont le pool a au moins une clé**, et instancie `FallbackAiProvider`. Aucun backend configuré → le provider renvoie toujours `null` (même comportement qu'aujourd'hui sans clé) et un `logger.warn` au démarrage.

## Flux (exemple)

1. `suggestCanvasBlocks` → Gemini clé #1 → 429 « retry in 40s » → clé #1 en pause 40 s.
2. Gemini clé #2 → timeout à 6 s → provider suivant.
3. Groq clé #1 → JSON valide mais un bloc vide → rejeté par `parseSuggestedCanvasBlocks` → provider suivant.
4. Mistral clé #1 → JSON valide → renvoyé (temps total ≈ 8 s).
5. Requête suivante : Gemini clé #1 toujours en pause → sautée ; clé #2 retentée.

## Règles projet respectées

- **CLAUDE.md #3** : aucun chiffre affiché n'est produit par l'IA sans validation — inchangé : les hypothèses suggérées restent des propositions éditables, le calcul reste dans `financial-engine`. Les parseurs stricts s'appliquent à **tous** les providers.
- **Pas de dépendance nouvelle** : `fetch` natif (Node ≥ 18).
- **Throttling** : `ThrottlerGuard` (10 req/min/IP) inchangé sur les deux endpoints.

## Documentation à mettre à jour

- `docs/DECISIONS.md` : nouvelle entrée datée qui **révise** la décision 2026-09-19 (Groq écarté pour fiabilité JSON) : la validation stricte par parseur + passage au provider suivant sur réponse invalide lève l'objection ; Gemini reste premier de chaîne.
- `docs/AI_ENGINE.md` (section Architecture) : chaîne, pool de clés, budget de temps.
- `apps/api/.env.example` : `GEMINI_API_KEY_2`, `GROQ_API_KEY`, `GROQ_MODEL`, `MISTRAL_API_KEY`, `MISTRAL_MODEL`, avec le commentaire sur les suffixes `_2`…`_10`.
- `tasks/TODO.md`, `tasks/CHANGELOG.md`.

## Tests (vitest, sans réseau)

- `key-pool.spec.ts` : chargement `_2`…`_10` (trous ignorés, vides ignorés) ; pause puis retour après le délai (horloge simulée) ; désactivation définitive ; ordre conservé.
- `ai-prompts.spec.ts` : reprend les cas de parsing existants de `gemini.provider.spec.ts` (JSON invalide, champ manquant, négatif, non entier, bloc vide, > 500 caractères).
- `openai-compatible.backend.spec.ts` (`fetch` mocké) : 200 → contenu ; 429 avec `Retry-After` → `rate_limited` + `retryAfterMs` ; 401 → `unauthorized` ; 500 → `unavailable` ; corps de requête (`response_format`, modèle, en-tête Bearer).
- `gemini.backend.spec.ts` (SDK mocké, même technique qu'aujourd'hui) : succès, 429 → `rate_limited`, erreur générique → `unavailable`.
- `fallback-ai.provider.spec.ts` (backends factices, horloge simulée) : clé 1 en 429 → clé 2 du même provider ; toutes les clés Gemini en 429 → Groq ; 401 → clé désactivée et plus jamais réessayée ; JSON invalide → provider suivant ; budget de 15 s épuisé → `null` sans appeler les providers restants ; aucun backend → `null`.
- `ai.controller.spec.ts` : inchangé, doit rester vert.

## Hors scope

- Persistance de l'état des clés (Redis, base) : inutile avec un seul processus.
- Ordre de chaîne configurable par env : YAGNI tant qu'on n'a pas de besoin concret.
- Cache des réponses (présent dans le CLI) : les descriptions sont uniques par utilisateur, gain quasi nul.
- Métriques / tableau de bord d'état des clés.
