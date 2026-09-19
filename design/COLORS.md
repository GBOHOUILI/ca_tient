# COLORS.md — Palette

Base neutre en gris (zinc), un accent "futuriste/premium" et un accent "énergie", plus les couleurs sémantiques financières. Rien de générique type SaaS-bleu-par-défaut, et surtout rien qui rappelle l'identité visuelle de Claude/Anthropic.

## Neutres (zinc)

| Token | Hex | Usage |
|---|---|---|
| `zinc-950` | `#0A0A0B` | Fond principal — mode sombre |
| `zinc-900` | `#131316` | Surfaces / cards — mode sombre |
| `zinc-800` | `#1F1F23` | Bordures, séparateurs — mode sombre |
| `zinc-400` | `#A1A1AA` | Texte secondaire — mode sombre |
| `zinc-50`  | `#FAFAFA` | Fond principal — mode clair |
| `zinc-100` | `#F4F4F5` | Surfaces / cards — mode clair |
| `zinc-200` | `#E4E4E7` | Bordures, séparateurs — mode clair |
| `zinc-950` (texte) | `#18181B` | Texte primaire — mode clair |
| `zinc-500` | `#71717A` | Texte secondaire — mode clair |

## Accent principal — "Signal Émeraude" (futuriste, premium)

| Token | Hex | Usage |
|---|---|---|
| `emerald-500` | `#059669` | CTA principal, liens, focus ring, glow du hero 3D |
| `emerald-600` | `#047857` | Hover/active des CTA |
| `emerald-300` | `#34D399` | Accent doux, halos, dégradés |

## Accent secondaire — "Pulse Cyan" (énergie)

| Token | Hex | Usage |
|---|---|---|
| `cyan-400` | `#22E5C9` | Highlights de données, lignes de graphique, accents de scène 3D |
| `cyan-600` | `#0FA890` | Version foncée pour mode clair (contraste) |

Les deux accents forment un dégradé signature (`emerald-500 → cyan-400`), utilisé pour : le logo/wordmark, le fond du hero (Three.js), les CTA premium, les états de succès de paiement.

## Couleurs sémantiques (résultats financiers)

| Token | Hex (dark) | Hex (light) | Usage |
|---|---|---|---|
| `success` | `#22C55E` | `#16A34A` | "Ça tient" — résultat positif, seuil de rentabilité atteint |
| `warning` | `#F5A623` | `#D97706` | Hypothèse fragile / variable sensible |
| `error` | `#EF4444` | `#DC2626` | "Ça ne tient pas" — résultat négatif |

**Attention à ne pas confondre le vert de marque et le vert sémantique** : `emerald-500` (`#059669`, plus profond/teal) sert à la marque et aux CTA ; `success` (`#22C55E`, plus vif/jaune-vert) sert uniquement à indiquer un résultat financier positif. Les deux doivent rester visuellement distincts à l'écran (ne pas utiliser `success` comme couleur de bouton, ni `emerald-500` comme indicateur de résultat).

## Règles

- Le mode sombre est la référence par défaut du produit (cohérent avec l'effet "premium/futuriste") ; le mode clair est une déclinaison complète, pas un mode dégradé.
- L'accent émeraude ne sert jamais pour du texte de contenu long — seulement CTA, focus, glow, éléments d'accroche.
- Toute combinaison texte/fond doit respecter un contraste WCAG AA minimum (4.5:1 pour le texte courant, 3:1 pour les grands titres).
- Ne jamais utiliser l'orange corail / le beige crème (identité visuelle Claude) comme couleur de marque du produit.
