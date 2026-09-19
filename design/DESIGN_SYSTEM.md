# DESIGN_SYSTEM.md — Système de design

## Direction artistique

Moderne, futuriste, énergique, **premium**, orienté confiance. Le design doit lever le doute de l'utilisateur avant même qu'il lise le texte — via la précision visuelle (alignements nets, dégradés maîtrisés, mouvement discret mais présent), pas via la surcharge d'éléments. Minimaliste dans la structure, spectaculaire dans le hero (effet "waouh" via Three.js — voir `PROMPTS.md`).

**Ne pas** reproduire l'identité visuelle de Claude/Anthropic (pas de orange corail, pas de style "assistant IA générique"). "Ça tient ?" a sa propre identité : gris zinc + dégradé émeraude→cyan.

## Fondations

- **Grille** : 12 colonnes desktop, 4 colonnes mobile, gouttières 24px (desktop) / 16px (mobile).
- **Espacements** : échelle en base 4px — 4, 8, 12, 16, 24, 32, 48, 64, 96.
- **Border-radius** : `8px` (inputs, petits boutons), `16px` (cards), `24px` (modales, sections hero). Pas d'angles droits sur les surfaces interactives — participe à l'effet "premium doux".
- **Ombres** : douces et colorées plutôt que grises pures en mode sombre — ex : `box-shadow: 0 8px 32px rgba(5, 150, 105, 0.18)` sur les éléments interactifs actifs, pour un effet "glow" cohérent avec l'accent émeraude.
- **Glassmorphism maîtrisé** : `backdrop-filter: blur(16px)` + fond semi-transparent (`rgba(19,19,22,0.6)` en dark) sur les barres de navigation et cards flottantes du hero — utilisé avec parcimonie, pas sur tout le produit.

## Mode sombre / mode clair

- Mode sombre = référence produit (activé par défaut, respecte `prefers-color-scheme` à la première visite, puis préférence mémorisée).
- Bascule dark/light accessible en permanence (header), transition animée en douceur (`transition: background-color 200ms ease, color 200ms ease`), jamais de flash blanc/noir brutal.
- Chaque composant de `COMPONENTS.md` doit être spécifié dans les deux modes — aucun composant "dark only".

## Mouvement / animation

- Micro-interactions : 150–250ms, easing `cubic-bezier(0.16, 1, 0.3, 1)` ("ease-out-expo" doux) — jamais de rebond exagéré (pas de bounce cartoon, incompatible avec "premium").
- La scène Three.js du hero (voir `PROMPTS.md`) est le seul élément à mouvement continu ; tout le reste du produit est animé uniquement en réaction à une action utilisateur (hover, clic, apparition au scroll).
- Respect de `prefers-reduced-motion` : la scène 3D bascule sur une version statique (image de fallback ou animation figée) si l'utilisateur l'a demandé au niveau système.

## Responsive

- Mobile-first. Points de rupture : `640px` (sm), `768px` (md), `1024px` (lg), `1280px` (xl).
- La scène Three.js du hero est allégée sur mobile (moins de particules/polygones, ou remplacée par une version 2D/vidéo légère) pour préserver la performance et la batterie — voir `PROMPTS.md` et `skills/frontend.md`.
- Aucun tableau de données ne doit "casser" le layout mobile : scroll horizontal contrôlé ou réorganisation en cards sur petits écrans.

## Multi-langue

- Prévoir FR et EN au minimum dès le MVP (marché initial béninois francophone + ouverture régionale/internationale).
- Aucun texte en dur dans les composants — passage systématique par un système d'i18n (voir `skills/frontend.md`).
- Le design doit tolérer une variation de longueur de texte de ±20 % sans rupture visuelle (boutons, cards, navigation).
