# skills/frontend.md

## Stack

Next.js (App Router) + TypeScript. Styling via Tailwind CSS configuré avec les tokens de `design/COLORS.md` et `design/TYPOGRAPHY.md` (ne pas utiliser de couleurs/tailles arbitraires hors tokens). Police Inter chargée via `next/font`.

## Design system

- Toujours consulter `design/DESIGN_SYSTEM.md` et `design/COMPONENTS.md` avant de créer un nouveau composant visuel — ne pas réinventer un style de bouton/card qui existe déjà.
- Implémenter le dark/light mode via une classe sur `<html>` (`class="dark"`) + variables CSS, avec détection de `prefers-color-scheme` à la première visite puis persistance du choix (cookie ou localStorage).

## Three.js (hero)

- Suivre strictement `design/PROMPTS.md` pour la direction artistique et les contraintes de performance.
- Charger le composant 3D en dynamique (`next/dynamic`, `ssr: false`) pour ne pas pénaliser le rendu serveur.
- Prévoir un fallback CSS (dégradé animé léger) si WebGL indisponible ou `prefers-reduced-motion` actif.

## Internationalisation

- FR et EN au minimum (voir `design/UX_PRINCIPLES.md`). Utiliser une librairie i18n standard pour l'écosystème Next.js (ex: `next-intl`) — aucun texte en dur dans les composants.
- Les formats de nombre/devise passent par l'API `Intl` selon la locale active.

## Performance

- Budget indicatif : First Contentful Paint < 2s sur mobile milieu de gamme / réseau 3G-4G moyen.
- Images optimisées (`next/image`), lazy loading systématique hors above-the-fold.
- La scène 3D ne doit jamais faire partie du chemin critique de rendu du texte et du CTA principal.

## État et données

- Aucun calcul financier côté frontend ne doit être traité comme source de vérité — toujours redemander/afficher le résultat renvoyé par le backend (voir `docs/FINANCIAL_ENGINE.md`).
- Le paiement suit strictement le flux de `docs/PAYMENT.md` : le frontend ne fait jamais confiance à son propre état local pour débloquer l'analyse.
