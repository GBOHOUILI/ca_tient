# AI_ENGINE.md — Rôle de l'IA

## Ce que l'IA fait

- Comprendre la description libre de l'utilisateur.
- Identifier le modèle économique probable (e-commerce, formation, e-book, service, produit physique, autre).
- Proposer les variables pertinentes pour ce modèle.
- Repérer les informations manquantes et poser des questions de clarification.
- Générer les scénarios à partir des règles définies dans `FINANCIAL_ENGINE.md` (l'IA choisit/ajuste les paramètres de variation si besoin, mais ne calcule jamais elle-même le résultat).
- Expliquer les résultats renvoyés par le moteur en langage simple, pour le rapport final.

## Ce que l'IA ne fait JAMAIS

- Elle n'invente ni ne modifie silencieusement un calcul financier.
- Elle ne renvoie jamais un chiffre (CA, marge, seuil de rentabilité) directement à l'utilisateur sans qu'il soit passé par le moteur déterministe.
- Elle ne décide pas seule qu'un paiement a réussi.

## Architecture

- Fournisseur IA interchangeable (couche d'abstraction, pas de dépendance dure à un seul provider).
- Pour le MVP : privilégier une API économique / free-tier tant que le volume le permet.
- Prévoir un mode dégradé si le fournisseur IA est indisponible (a minima, formulaire manuel de saisie des hypothèses sans extraction automatique).
- Chaîne de providers **Gemini → Groq → Mistral** derrière le port `AiProvider` (`FallbackAiProvider`, `apps/api/src/ai/`) : chaque provider a un pool de clés en rotation (`<PROVIDER>_API_KEY`, `_2` … `_10`), budget de 15 s par suggestion (8 s max par tentative). Si tout échoue, repli silencieux : l'utilisateur saisit lui-même (voir `docs/DECISIONS.md`, 2026-09-26).
- Toute réponse IA, quel que soit le provider, est validée par un parseur strict (`ai-prompts.ts`) avant d'être proposée à l'utilisateur.
