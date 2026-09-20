# Phase 6a, capture des blocs manquants du business model canvas

Statut : validé en discussion, en attente de relecture du document avant plan d'implémentation.

## Contexte

`docs/DECISIONS.md` (entrée du 2026-09-20) acte un élargissement conscient du périmètre MVP : le "rapport final" déjà prévu (`docs/USER_FLOWS.md` écran 10 ; `docs/MVP_SCOPE.md`) sera enrichi en business model canvas complet (9 blocs Osterwalder) avec recommandations capital/besoin financier. Ce travail est découpé en deux phases, sur le modèle 5a/5b :

- **Phase 6a (cette spec)** : capture des 7 blocs qualitatifs du canvas que rien dans le produit ne collecte aujourd'hui.
- **Phase 6b (hors scope ici)** : écran "capital disponible" + offre de paiement + paiement (`TestProvider` en développement) + rendu du rapport complet (canvas 9 blocs + contenu MVP existant + recommandation de besoin financier).

Sur les 9 blocs du canvas :

| Bloc | Source |
|---|---|
| Structure de coûts | Calculé par `financial-engine` (Phase 6b, jamais stocké comme texte) |
| Flux de revenus | Calculé par `financial-engine` (Phase 6b, jamais stocké comme texte) |
| Proposition de valeur | **Phase 6a** — suggéré par IA depuis la description libre, validé par l'utilisateur |
| Segments de clientèle | **Phase 6a** — idem |
| Canaux | **Phase 6a** — idem |
| Relations clients | **Phase 6a** — idem |
| Ressources clés | **Phase 6a** — idem |
| Activités clés | **Phase 6a** — idem |
| Partenaires clés | **Phase 6a** — idem |

Cette spec couvre uniquement les 7 blocs qualitatifs. Le rendu du canvas complet (mise en page 9 blocs) est un souci d'affichage de la Phase 6b — cette phase se limite à collecter et stocker le texte des 7 blocs.

## Décisions actées dans cette session

- **Format de capture : IA propose un brouillon par bloc, l'utilisateur valide/corrige.** Même mécanique que la Phase 4 (`suggestHypotheses`/`StepHypotheses`) : silencieux et non bloquant si l'IA échoue (quota dépassé, timeout...), l'utilisateur peut toujours remplir/éditer manuellement.
- **Un seul appel IA, positionné juste après la validation des hypothèses**, en parallèle de l'appel `createIdea` existant (`Promise.all`), pas en série — réduit la latence perçue (`design/UX_PRINCIPLES.md`, connexions parfois lentes). Les deux appels ne dépendent pas l'un de l'autre (aucun n'a besoin de l'`ideaId` produit par l'autre).
- **Nouvelle étape du wizard "canvas"**, insérée entre "Hypothèses" et "Résultats" (aperçu) — pas après "Scénarios". Rationnel : conceptuellement, le canvas décrit le business (comme la description libre), pas le calcul financier ; le placer juste après la validation des hypothèses garde l'écran "Résultats" comme la première récompense visuelle du parcours, inchangée.
- **Persistance : nouveau modèle Prisma `CanvasBlock`**, un enregistrement par bloc (`key`/`content`/`source`), même pattern que `Hypothesis` existant plutôt qu'un unique champ JSON — cohérence avec l'existant, permet une future requête/filtrage par bloc si besoin (rapport, admin).
- **Un seul flag `source` pour l'ensemble des 7 blocs** (pas un suivi par bloc) : si l'utilisateur édite ne serait-ce qu'un seul bloc avant de continuer, l'ensemble de la soumission est marqué `"utilisateur_edite"`. Mirrore exactement le comportement déjà existant de `wasSuggested` sur `StepHypotheses` (`SET_HYPOTHESIS` remet `wasSuggested` à `false`) — pas un nouveau concept.
- **Échec de la persistance (`PATCH`) : bloque avec message d'erreur + retry**, ne laisse pas continuer silencieusement — contrairement à l'échec de la *suggestion* IA (qui reste silencieux), un échec de *sauvegarde* perdrait du contenu qui doit apparaître dans le rapport payant (Phase 6b). Mirrore le traitement déjà existant de l'échec de `createIdea` dans `handleSubmit`.
- **Longueur des blocs plafonnée à 500 caractères** côté validation (`class-validator` `@MaxLength`) — un bloc de canvas est une note courte, pas un paragraphe ; garde l'esprit de l'arbitrage `docs/DECISIONS.md` ("pas de génération ouverte et non maîtrisée").
- **`CANVAS_BLOCK_KEYS` redéfini identiquement côté `apps/api` et `apps/web`**, pas de nouveau package partagé — même convention que `BusinessModel`/`CurrencyCode` dans `apps/web/src/lib/ideas-api.ts` (décision Phase 3, `docs/DECISIONS.md`) : ce n'est pas un calcul, ça n'a rien à faire dans `financial-engine`, et 7 clés de chaîne ne justifient pas un package dédié.
- **Aucune modification de `GET /ideas/:id`** dans cette phase — l'endpoint ne renvoie pas encore les blocs de canvas ; c'est un besoin de la Phase 6b (rendu du rapport), pas de la capture. YAGNI.

## Architecture

### Modèle de données (`apps/api/prisma/schema.prisma`)

```prisma
model CanvasBlock {
  id      String @id @default(cuid())
  ideaId  String
  idea    Idea   @relation(fields: [ideaId], references: [id], onDelete: Cascade)
  key     String
  content String
  source  String

  @@unique([ideaId, key])
}
```

Ajouter la relation inverse sur `Idea` :

```prisma
model Idea {
  // ...champs existants inchangés...
  canvasBlocks CanvasBlock[]
}
```

Migration Prisma standard (`prisma migrate dev --name add_canvas_block`).

### Backend

#### Extension du port IA (`apps/api/src/ai/ai-provider.port.ts`)

```typescript
export const CANVAS_BLOCK_KEYS = [
  "valueProposition",
  "customerSegments",
  "channels",
  "customerRelationships",
  "keyResources",
  "keyActivities",
  "keyPartners",
] as const;

export type CanvasBlockKey = (typeof CANVAS_BLOCK_KEYS)[number];

export type SuggestedCanvasBlocks = Record<CanvasBlockKey, string>;

export interface AiProvider {
  suggestHypotheses(input: AiSuggestionInput): Promise<SuggestedHypotheses | null>;
  suggestCanvasBlocks(input: AiSuggestionInput): Promise<SuggestedCanvasBlocks | null>;
}
```

Réutilise `AiSuggestionInput` déjà existant (`businessModel`, `rawDescription`, `currency`) même si `suggestCanvasBlocks` n'utilise pas `currency` — évite un second type d'entrée pour une différence d'un seul champ ignoré.

#### `GeminiProvider` (`apps/api/src/ai/gemini.provider.ts`)

Ajoute une deuxième méthode sur la même classe (même client `GoogleGenAI`, même timeout, même pattern try/catch + log + `null` en cas d'échec que `suggestHypotheses`) :

```typescript
const BUSINESS_MODEL_LABELS: Record<BusinessModel, string> = { /* déjà existant, réutilisé */ };

function buildCanvasPrompt(input: AiSuggestionInput): string {
  return [
    "Tu aides a remplir un business model canvas (methode Osterwalder) pour une idee de business, en francais.",
    `Modele de business : ${BUSINESS_MODEL_LABELS[input.businessModel]}.`,
    `Description de l'idee, en langage libre : "${input.rawDescription}"`,
    "Propose un texte court (1 a 2 phrases maximum, style note plutot que paragraphe) pour chacun des 7 blocs suivants, meme si la description est vague (fais une hypothese plausible plutot que de repondre par une phrase vide) :",
    "- valueProposition : la proposition de valeur, ce qui rend cette offre desirable",
    "- customerSegments : a qui s'adresse cette offre",
    "- channels : comment les clients decouvrent et achetent l'offre",
    "- customerRelationships : comment la relation avec les clients est entretenue dans la duree",
    "- keyResources : les ressources indispensables pour operer (materiel, competences, stock...)",
    "- keyActivities : les activites cles du quotidien pour faire tourner ce business",
    "- keyPartners : les partenaires ou fournisseurs cles necessaires",
    "Reponds uniquement avec les 7 textes, chacun en francais, sans jargon, 500 caracteres maximum par bloc.",
  ].join("\n");
}

function parseSuggestedCanvasBlocks(text: string | undefined): SuggestedCanvasBlocks | null {
  if (!text) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;

  const record = parsed as Record<string, unknown>;
  const result = {} as SuggestedCanvasBlocks;

  for (const key of CANVAS_BLOCK_KEYS) {
    const value = record[key];
    if (typeof value !== "string" || value.trim().length === 0 || value.length > 500) return null;
    result[key] = value.trim();
  }

  return result;
}
```

Et sur la classe `GeminiProvider` :

```typescript
async suggestCanvasBlocks(input: AiSuggestionInput): Promise<SuggestedCanvasBlocks | null> {
  try {
    const response = await this.client.models.generateContent({
      model: this.modelName,
      contents: buildCanvasPrompt(input),
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: Object.fromEntries(CANVAS_BLOCK_KEYS.map((key) => [key, { type: Type.STRING }])),
          required: [...CANVAS_BLOCK_KEYS],
        },
        abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    });

    return parseSuggestedCanvasBlocks(response.text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.warn(`Suggestion canvas Gemini indisponible : ${message}`);
    return null;
  }
}
```

#### Endpoint de suggestion (`apps/api/src/ai/ai.controller.ts`)

Ajoute une route sur le contrôleur existant, même DTO d'entrée que `suggest-hypotheses` (`SuggestHypothesesDto` couvre déjà `businessModel`/`rawDescription`/`currency` — réutilisé tel quel, pas de nouveau DTO) :

```typescript
@Post("suggest-canvas-blocks")
@HttpCode(HttpStatus.OK)
@UseGuards(ThrottlerGuard)
async suggestCanvasBlocks(@Body() dto: SuggestHypothesesDto) {
  const blocks = await this.aiProvider.suggestCanvasBlocks(dto);

  if (!blocks) {
    return { available: false as const };
  }

  return { available: true as const, blocks };
}
```

#### Endpoint de persistance (`apps/api/src/ideas/ideas.controller.ts` + `ideas.service.ts`)

Nouveau DTO `apps/api/src/ideas/dto/update-canvas-blocks.dto.ts` :

```typescript
import { ArrayMaxSize, ArrayMinSize, IsIn, IsNotEmpty, IsString, MaxLength, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { CANVAS_BLOCK_KEYS, type CanvasBlockKey } from "../../ai/ai-provider.port.js";

const SOURCES = ["ia_suggere", "utilisateur_edite"] as const;

export class CanvasBlockDto {
  @IsIn(CANVAS_BLOCK_KEYS)
  key!: CanvasBlockKey;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  content!: string;
}

export class UpdateCanvasBlocksDto {
  @ValidateNested({ each: true })
  @Type(() => CanvasBlockDto)
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  blocks!: CanvasBlockDto[];

  @IsIn(SOURCES)
  source!: (typeof SOURCES)[number];
}
```

Contrôleur :

```typescript
@Patch(":id/canvas-blocks")
async updateCanvasBlocks(@Param("id") id: string, @Body() dto: UpdateCanvasBlocksDto) {
  await this.ideasService.updateCanvasBlocks(id, dto);
  return { ok: true };
}
```

Service — `upsert` par bloc (protège contre un retour en arrière puis re-soumission dans le wizard, cas déjà géré ailleurs dans le produit par la nature idempotente des mutations `wizard-reducer`) :

```typescript
async updateCanvasBlocks(ideaId: string, dto: UpdateCanvasBlocksDto): Promise<void> {
  const idea = await this.prisma.idea.findUnique({ where: { id: ideaId }, select: { id: true } });
  if (!idea) {
    throw new NotFoundException(`Idee ${ideaId} introuvable.`);
  }

  await this.prisma.$transaction(
    dto.blocks.map((block) =>
      this.prisma.canvasBlock.upsert({
        where: { ideaId_key: { ideaId, key: block.key } },
        create: { ideaId, key: block.key, content: block.content, source: dto.source },
        update: { content: block.content, source: dto.source },
      }),
    ),
  );
}
```

`NotFoundException` déjà importé dans `ideas.controller.ts` (existant) ; `IdeasController` a besoin d'un import `Patch` supplémentaire depuis `@nestjs/common`.

### Frontend

#### `apps/web/src/lib/ideas-api.ts` — ajouts

```typescript
export const CANVAS_BLOCK_KEYS = [
  "valueProposition",
  "customerSegments",
  "channels",
  "customerRelationships",
  "keyResources",
  "keyActivities",
  "keyPartners",
] as const;

export type CanvasBlockKey = (typeof CANVAS_BLOCK_KEYS)[number];
export type CanvasBlocks = Record<CanvasBlockKey, string>;

export type SuggestCanvasBlocksResponse = { available: true; blocks: CanvasBlocks } | { available: false };

export async function suggestCanvasBlocks(input: {
  businessModel: BusinessModel;
  rawDescription: string;
  currency: CurrencyCode;
}): Promise<SuggestCanvasBlocksResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/ideas/suggest-canvas-blocks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      return { available: false };
    }

    return (await response.json()) as SuggestCanvasBlocksResponse;
  } catch {
    return { available: false };
  }
}

export async function saveCanvasBlocks(
  ideaId: string,
  blocks: CanvasBlocks,
  source: "ia_suggere" | "utilisateur_edite",
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/ideas/${ideaId}/canvas-blocks`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      blocks: CANVAS_BLOCK_KEYS.map((key) => ({ key, content: blocks[key] })),
      source,
    }),
  });

  if (!response.ok) {
    throw new Error(`L'enregistrement du canvas a echoue (${response.status}).`);
  }
}
```

#### `wizard-reducer.ts` — ajouts (additifs, rien de retiré)

```typescript
export type WizardStep =
  | "business-type"
  | "description"
  | "hypotheses"
  | "canvas"
  | "results"
  | "et-si"
  | "scenarios";

import type { CanvasBlockKey, CanvasBlocks } from "@/lib/ideas-api";

const EMPTY_CANVAS_BLOCKS: CanvasBlocks = {
  valueProposition: "",
  customerSegments: "",
  channels: "",
  customerRelationships: "",
  keyResources: "",
  keyActivities: "",
  keyPartners: "",
};

export interface WizardState {
  // ...champs existants inchangés...
  canvasBlocks: CanvasBlocks;
  canvasWasSuggested: boolean;
}

export type WizardAction =
  // ...actions existantes inchangées...
  | { type: "SET_CANVAS_BLOCKS"; blocks: CanvasBlocks }
  | { type: "SET_CANVAS_BLOCK"; key: CanvasBlockKey; value: string };

export const initialWizardState: WizardState = {
  // ...champs existants inchangés...
  canvasBlocks: EMPTY_CANVAS_BLOCKS,
  canvasWasSuggested: false,
};

// Dans le switch de wizardReducer, ajouter :
case "SET_CANVAS_BLOCKS":
  return { ...state, canvasBlocks: action.blocks, canvasWasSuggested: true };
case "SET_CANVAS_BLOCK":
  return {
    ...state,
    canvasBlocks: { ...state.canvasBlocks, [action.key]: action.value },
    canvasWasSuggested: false,
  };
```

#### Nouveau composant `apps/web/src/components/wizard/StepCanvas.tsx`

Même structure que `StepHypotheses.tsx` : un `<label>` + `<textarea>` par bloc (7 blocs, contre 4 champs numériques), libellés en français simple, indicateur "Suggéré par l'IA : vérifie et corrige si besoin" repris à l'identique quand `wasSuggested` est vrai, boutons Retour/Continuer, état `submitting`/`error` gérés par le parent (`commencer/page.tsx`), même convention que `StepHypotheses`.

```typescript
"use client";

import type { CanvasBlockKey, CanvasBlocks } from "@/lib/ideas-api";

const FIELDS: { key: CanvasBlockKey; label: string; placeholder: string }[] = [
  { key: "valueProposition", label: "Qu'est-ce que tu offres, et pourquoi c'est interessant ?", placeholder: "Ex : des sacs faits main, livres en 24h a Cotonou" },
  { key: "customerSegments", label: "A qui tu vends ?", placeholder: "Ex : jeunes actifs urbains, 20-35 ans" },
  { key: "channels", label: "Comment tes clients te trouvent et achetent ?", placeholder: "Ex : Instagram, bouche-a-oreille, marche local" },
  { key: "customerRelationships", label: "Comment tu gardes le contact avec eux dans la duree ?", placeholder: "Ex : WhatsApp, newsletter, programme de fidelite" },
  { key: "keyResources", label: "De quoi tu as absolument besoin pour fonctionner ?", placeholder: "Ex : machine a coudre, stock de tissu, local" },
  { key: "keyActivities", label: "Qu'est-ce que tu dois faire au quotidien pour faire tourner ca ?", placeholder: "Ex : production, livraison, reseaux sociaux" },
  { key: "keyPartners", label: "De qui tu as besoin autour de toi ?", placeholder: "Ex : fournisseur de tissu, livreur, comptable" },
];

export function StepCanvas({
  canvasBlocks,
  wasSuggested,
  onBlockChange,
  onNext,
  onBack,
  submitting,
  error,
}: {
  canvasBlocks: CanvasBlocks;
  wasSuggested: boolean;
  onBlockChange: (key: CanvasBlockKey, value: string) => void;
  onNext: () => void;
  onBack: () => void;
  submitting: boolean;
  error: string | null;
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <h1 className="text-center text-h2-mobile font-semibold md:text-h2">Ton business model</h1>
      {wasSuggested ? (
        <p className="text-center text-small text-accent-emerald">
          Suggere par l&apos;IA a partir de ta description : verifie et corrige si besoin.
        </p>
      ) : null}
      {FIELDS.map((field) => (
        <label key={field.key} className="flex flex-col gap-2 text-small text-text-secondary">
          {field.label}
          <textarea
            value={canvasBlocks[field.key]}
            onChange={(e) => onBlockChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            maxLength={500}
            rows={2}
            className="rounded-lg border border-border bg-surface p-3 text-body text-text-primary focus:border-accent-emerald focus:outline-none"
          />
        </label>
      ))}
      {error ? <p className="text-small text-error">{error}</p> : null}
      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="text-body font-medium text-text-secondary">
          Retour
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={submitting}
          className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-6 py-3 text-body font-semibold text-white disabled:opacity-40"
        >
          {submitting ? "Enregistrement..." : "Continuer"}
        </button>
      </div>
    </div>
  );
}
```

Utilise les mêmes classes Tailwind/tokens que `StepHypotheses.tsx` (`border-border`, `bg-surface`, `text-text-primary`, `accent-emerald`) — aucune couleur ou composant inventé, conforme `CLAUDE.md` règle #8.

#### `commencer/page.tsx` — modifications

`handleSubmit` déclenche `createIdea` et `suggestCanvasBlocks` en parallèle, transitionne vers `"canvas"` au lieu de `"results"` :

```typescript
async function handleSubmit() {
  if (!state.businessModel) return;
  setSubmitting(true);
  setError(null);
  try {
    const [result, canvasSuggestion] = await Promise.all([
      createIdea({
        businessModel: state.businessModel,
        rawDescription: state.rawDescription,
        currency: state.currency,
        hypotheses: state.hypotheses,
      }),
      suggestCanvasBlocks({
        businessModel: state.businessModel,
        rawDescription: state.rawDescription,
        currency: state.currency,
      }),
    ]);
    setResponse(result);
    if (canvasSuggestion.available) {
      dispatch({ type: "SET_CANVAS_BLOCKS", blocks: canvasSuggestion.blocks });
    }
    dispatch({ type: "GO_TO_STEP", step: "canvas" });
  } catch {
    setError("Le calcul a echoue. Verifie tes valeurs et reessaie.");
  } finally {
    setSubmitting(false);
  }
}

async function handleCanvasNext() {
  if (!response) return;
  setSubmitting(true);
  setError(null);
  try {
    await saveCanvasBlocks(
      response.ideaId,
      state.canvasBlocks,
      state.canvasWasSuggested ? "ia_suggere" : "utilisateur_edite",
    );
    dispatch({ type: "GO_TO_STEP", step: "results" });
  } catch {
    setError("L'enregistrement a echoue. Reessaie.");
  } finally {
    setSubmitting(false);
  }
}
```

Nouveau bloc JSX (entre le bloc `"hypotheses"` et le bloc `"results"` existants) :

```tsx
{state.step === "canvas" && (
  <StepCanvas
    canvasBlocks={state.canvasBlocks}
    wasSuggested={state.canvasWasSuggested}
    onBlockChange={(key, value) => dispatch({ type: "SET_CANVAS_BLOCK", key, value })}
    onNext={handleCanvasNext}
    onBack={() => dispatch({ type: "GO_TO_STEP", step: "hypotheses" })}
    submitting={submitting}
    error={error}
  />
)}
```

`error`/`submitting` sont déjà des états partagés du composant parent (réutilisés tels quels, pas de nouvel état dupliqué).

#### `WizardProgress.tsx` — ajout de l'étape

Insérer `{ key: "canvas", label: "Ton business model" }` dans le tableau `STEPS`, entre `"hypotheses"` et `"results"` — même type d'ajout que celui fait en Phase 5b (bug réel si oublié : `findIndex` retournerait `-1` et casserait silencieusement tous les indicateurs de progression pour les étapes suivantes).

## Gestion des erreurs

| Cas | Comportement |
|---|---|
| `suggest-canvas-blocks` indisponible (quota, timeout, réseau) | Silencieux — `StepCanvas` s'affiche avec 7 champs vides, éditables manuellement, pas de badge "suggéré par l'IA". Comportement déjà éprouvé en conditions réelles (Phase 4, "quota exceeded" observé en usage). |
| `createIdea` échoue | Inchangé — comportement déjà existant, bloque avec message d'erreur + retry sur l'écran Hypothèses. |
| `PATCH .../canvas-blocks` échoue | Bloque sur l'écran Canvas avec message d'erreur + retry (bouton "Continuer" relance `handleCanvasNext`, aucune perte de saisie car `state.canvasBlocks` reste en mémoire dans le wizard). |
| Utilisateur revient en arrière puis re-soumet | `upsert` côté backend — pas de doublons, dernier contenu soumis gagne. |

## Hors scope (explicitement, pour cette phase)

- Rendu visuel du canvas 9 blocs (mise en page façon post-it) — Phase 6b.
- Écran "capital disponible", calcul du "besoin financier" — Phase 6b.
- Offre de paiement, intégration `TestProvider`/FedaPay — Phase 6b.
- `GET /ideas/:id` renvoyant les blocs de canvas — besoin de la Phase 6b, ajouté à ce moment-là.
- Plan de lancement détaillé — reporté en V2 (`docs/DECISIONS.md`).
- Dashboard admin — sujet de brainstorm séparé, après la Phase 6b (`docs/DECISIONS.md`).

## Tests

- `apps/api` : tests unitaires `GeminiProvider.suggestCanvasBlocks` (mock `GoogleGenAI`, cas succès/JSON invalide/timeout — même structure que les tests existants de `suggestHypotheses`), tests `IdeasService.updateCanvasBlocks` (upsert, idée introuvable → `NotFoundException`), test DTO validation (`UpdateCanvasBlocksDto` — 7 blocs exactement, clés valides, longueur max).
- `apps/web` : pas de suite automatisée (précédent établi) — vérification manuelle par navigateur (Playwright), incluant explicitement le cas IA indisponible (champs vides, pas de blocage) et le cas retour arrière + re-soumission.
