# PROMPTS.md — Direction visuelle 3D (Three.js) & prompts

## Objectif de la scène hero

Créer l'effet "waouh" dès la landing page, sans nuire à la performance ni au ton premium/sobre du reste du produit. La scène doit évoquer : données financières qui prennent forme, précision, mouvement contrôlé — pas un décor gratuit.

## Direction artistique de la scène

- **Concept** : un nuage de points / une grille de particules qui réagit légèrement au mouvement de la souris (parallax doux, pas de suivi agressif), avec un dégradé de couleur `emerald-500 → cyan-400` sur les particules/lignes, sur fond `zinc-950`.
- **Variante possible** : une forme abstraite façon "courbe de croissance" en fil de fer (wireframe) qui se déforme doucement, suggérant un graphique financier qui prend vie sans être un vrai graphique de données.
- **Mouvement** : lent, continu, hypnotique — jamais saccadé ni distrayant. Le texte du hero doit rester parfaitement lisible par-dessus (overlay avec dégradé de fond si besoin pour garantir le contraste).
- **Mode clair** : version allégée en luminosité/opacité de la même scène (mêmes couleurs d'accent, fond clair) — pas une scène différente, une déclinaison cohérente.

## Contraintes techniques (voir aussi `skills/frontend.md`)

- Utiliser **Three.js** (`WebGLRenderer`), avec fallback statique (image ou dégradé CSS animé) si WebGL n'est pas disponible ou si `prefers-reduced-motion` est actif.
- Nombre de particules/polygones adapté à l'appareil : version allégée automatique sur mobile et sur les GPU faibles (détection basique via `navigator.hardwareConcurrency` ou taille d'écran).
- La scène ne doit jamais bloquer le First Contentful Paint : chargement différé (lazy) après le texte et le CTA du hero.
- Cible : 60fps sur desktop, dégradation acceptée à 30fps sur mobile d'entrée de gamme plutôt qu'un freeze.
- Nettoyage strict du contexte WebGL au démontage du composant (pas de fuite mémoire en SPA).

## Où utiliser du 3D / du mouvement fort, et où ne pas en mettre

- **Oui** : hero de la landing page, éventuellement l'écran de succès de paiement (variante très allégée, quelques particules qui convergent).
- **Non** : formulaire de saisie des hypothèses, écran de paiement lui-même (priorité absolue : clarté et confiance, zéro distraction), rapport final (lisibilité avant tout).

## Ton du rapport généré par l'IA (rappel)

Le rapport (voir `docs/AI_ENGINE.md`) reste sobre et textuel — l'effet "waouh" est un outil d'acquisition (landing), pas un habillage de l'analyse elle-même, où la confiance se joue sur la clarté, pas sur le spectacle.
