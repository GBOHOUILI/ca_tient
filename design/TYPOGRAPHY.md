# TYPOGRAPHY.md — Typographie

## Police

**Inter** (variable font), chargée en `font-display: swap`. Fallback système : `-apple-system, "Segoe UI", Roboto, sans-serif`.

## Échelle typographique

| Rôle | Taille / interligne (desktop) | Taille (mobile) | Graisse |
|---|---|---|---|
| Display (hero) | 64px / 1.05 | 40px / 1.1 | 700 (Bold) |
| H1 | 40px / 1.15 | 30px / 1.2 | 700 |
| H2 | 32px / 1.2 | 26px / 1.25 | 600 |
| H3 | 24px / 1.3 | 20px / 1.3 | 600 |
| H4 | 20px / 1.4 | 18px / 1.4 | 600 |
| Corps large | 18px / 1.6 | 16px / 1.6 | 400 |
| Corps | 16px / 1.6 | 15px / 1.6 | 400 |
| Petit / légende | 14px / 1.5 | 13px / 1.5 | 400–500 |
| Micro (labels, tags) | 12px / 1.4 | 12px / 1.4 | 500 (Medium), letter-spacing +0.02em |

## Chiffres financiers

Les montants (CA, marge, seuil de rentabilité) sont toujours affichés avec `font-variant-numeric: tabular-nums` et un poids 600–700, pour un alignement propre dans les tableaux/graphiques et un effet "chiffre de confiance" plus affirmé que le corps de texte.

## Règles

- Deux graisses maximum par écran (ex : 400 pour le corps, 600 pour les titres/CTA) pour garder l'effet minimaliste.
- Pas de texte tout en majuscules sauf micro-labels (tags de statut, badges).
- Multi-langue : prévoir que les libellés FR sont ~15–20 % plus longs qu'en EN — les composants (boutons, cards) ne doivent pas casser avec des libellés plus longs (voir `UX_PRINCIPLES.md`).
