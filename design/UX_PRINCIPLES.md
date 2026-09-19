# UX_PRINCIPLES.md — Principes d'expérience

## Lever le doute (principe directeur du produit)

- Chaque écran affiche clairement où en est l'utilisateur dans le parcours (indicateur de progression discret, pas intrusif).
- Aucune surprise sur le prix : les 1 000 FCFA sont visibles dès la landing page et rappelés avant le paiement — jamais un prix caché ou une majoration de dernière minute.
- Le vocabulaire est simple, jamais jargonneux ; un utilisateur sans bagage financier doit comprendre "seuil de rentabilité" grâce au contexte visuel (voir `COMPONENTS.md` → cards résultat).
- Le moment du paiement est traité comme le pic d'anxiété du parcours : état de vérification explicite et rassurant, jamais un simple freeze de l'interface.

## Responsive

- Mobile-first, testé prioritairement sur les résolutions courantes en Afrique de l'Ouest (écrans Android d'entrée/milieu de gamme, connexions parfois lentes) — la scène Three.js du hero ne doit jamais bloquer le premier rendu utile (voir `skills/frontend.md` pour le budget de performance).
- Tap targets ≥ 44px sur mobile.

## Accessibilité

- Contraste WCAG AA minimum partout (voir `COLORS.md`).
- Navigation clavier complète sur le tunnel de paiement (aucune étape critique ne doit dépendre uniquement de la souris/du tactile).
- `prefers-reduced-motion` respecté (voir `DESIGN_SYSTEM.md`).
- Textes alternatifs sur tout élément graphique porteur de sens (ex : graphique de sensibilité).

## Multi-langue

- FR et EN au lancement. Détection automatique de la langue du navigateur, override manuel possible et mémorisé.
- Les résultats chiffrés (formats de nombre, séparateur décimal, devise FCFA) sont formatés selon la locale active, pas seulement le texte de l'interface.
- Le rapport final généré par l'IA (voir `docs/AI_ENGINE.md`) est produit dans la langue choisie par l'utilisateur.

## Ton éditorial

- Direct, rassurant, jamais infantilisant ni "startup buzzword". On parle à quelqu'un qui a une vraie idée et une vraie inquiétude financière.
- Les messages d'erreur et d'attente sont écrits comme s'adresserait un conseiller compétent et honnête, pas un bot générique.
