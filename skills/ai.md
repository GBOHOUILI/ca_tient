# skills/ai.md

- Respecter strictement le rôle défini dans `docs/AI_ENGINE.md` : l'IA comprend, suggère, explique — elle ne calcule jamais un chiffre final affiché à l'utilisateur.
- Fournisseur IA derrière une interface interchangeable (pas d'appel direct à un SDK propriétaire dispersé dans le code métier).
- Prompts versionnés et documentés (ne pas modifier silencieusement un prompt de production sans trace dans `docs/DECISIONS.md` si le changement est structurant).
- Le rapport final généré doit être produit dans la langue choisie par l'utilisateur (voir `design/UX_PRINCIPLES.md`) et respecter le ton défini (direct, rassurant, sans jargon inutile).
- Prévoir un mode dégradé (formulaire manuel) si le fournisseur IA est indisponible — ne jamais bloquer tout le parcours sur une dépendance IA en panne.
