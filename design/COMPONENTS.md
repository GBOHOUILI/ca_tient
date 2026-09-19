# COMPONENTS.md — Composants

## Boutons

- **Primaire** : fond dégradé `emerald-500 → cyan-400` (léger, angle 90°), texte blanc, radius 8px, padding `12px 24px`, poids 600. Glow au hover (`box-shadow` émeraude, voir `DESIGN_SYSTEM.md`).
- **Secondaire** : fond transparent, bordure `1px solid zinc-800` (dark) / `zinc-200` (light), texte primaire. Hover : bordure `emerald-500`.
- **Ghost/texte** : pas de fond ni bordure, texte accent émeraude, souligné au hover uniquement.
- **États** : `disabled` (opacité 40%, pas de glow), `loading` (spinner fin remplaçant le texte, largeur du bouton figée pour éviter le layout shift).

## Inputs

- Fond légèrement distinct du fond de page (`zinc-900` sur `zinc-950`, `zinc-100` sur `zinc-50`), bordure 1px, radius 8px, padding `12px 16px`.
- Focus : bordure `emerald-500` + ring léger (`box-shadow` 3px émeraude à 20% d'opacité) — jamais de simple `outline` navigateur brut.
- Erreur : bordure `error`, message d'erreur en dessous en `caption` rouge.
- Champs numériques financiers (prix, coûts, volumes) : alignement à droite, `tabular-nums`, unité affichée en suffixe discret (ex: "FCFA").

## Cards

- Radius 16px, fond surface (`zinc-900`/`zinc-100`), bordure 1px très discrète.
- Card "résultat financier" : bordure gauche de 3px colorée selon le sens du résultat (`success`/`warning`/`error`) — lisible en un coup d'œil sans lire le chiffre.
- Card flottante du hero : effet glass (voir `DESIGN_SYSTEM.md`).

## Graphiques

- Lignes/aires : dégradé `emerald-500 → cyan-400` pour la courbe principale (ex: seuil de rentabilité), couleurs sémantiques (`success`/`error`) pour les zones au-dessus/en dessous du seuil.
- Grille très discrète (`zinc-800`/`zinc-200`), pas de bordure de graphique lourde.
- Tooltips : fond glass, `tabular-nums`, coin arrondi 8px.

## États système

- **Loading** : skeleton (rectangles pulsants basse opacité) plutôt que spinner plein écran, sauf pendant la vérification de paiement (voir ci-dessous).
- **Vérification de paiement en cours** : état dédié, pas un simple spinner — animation de confiance (ex : cercle qui se remplit progressivement + texte rassurant "Vérification sécurisée de ton paiement…"), car c'est le moment de plus grande anxiété utilisateur.
- **Succès** : accent `success`, une micro-animation de confirmation (check qui se dessine), jamais de confettis ou d'effet too-much — cohérent avec le ton premium/sobre.
- **Erreur** : accent `error`, message actionnable ("Réessayer" toujours visible), jamais un message technique brut (pas de stack trace, pas de code d'erreur brut sans traduction humaine).

## Navigation

- Header sticky, fond glass au scroll (transparent en haut de page), toggle dark/light + sélecteur de langue toujours visibles.
- Pas de sidebar dans le MVP — parcours linéaire (voir `docs/USER_FLOWS.md`), la navigation reste minimale pour ne pas diluer le focus sur le tunnel de conversion.
