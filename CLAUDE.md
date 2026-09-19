# CLAUDE.md — Règles fondamentales du projet « Ça tient ? »

Tu travailles sur **Ça tient ?**. Lis d'abord ce fichier, puis les documents pertinents dans `/docs`, `/design` et `/skills` avant d'écrire du code. Ces documents constituent la source de vérité du projet.

## Règles non négociables

1. **Ne modifie pas** l'architecture, le business model, le système de paiement ou le design system sans vérifier les décisions déjà prises dans `docs/DECISIONS.md`.
2. **Ne crée pas** de fonctionnalité hors MVP (voir `docs/MVP_SCOPE.md`) sans instruction explicite.
3. **Les calculs financiers ne sont jamais confiés à l'IA.** Le backend applique des formules déterministes et testées (`docs/FINANCIAL_ENGINE.md`). L'IA peut expliquer ou proposer des hypothèses, jamais produire un chiffre affiché à l'utilisateur.
4. **Le paiement précède toujours l'analyse.** Aucune analyse détaillée n'est accessible avant confirmation serveur du paiement (`docs/PAYMENT.md`).
5. **Un paiement n'est valide qu'après vérification côté serveur** (webhook + vérification), jamais sur la seule confiance du frontend.
6. **Prix fixe : 1 000 FCFA par analyse.** Pas d'abonnement, pas de frais cachés dans le MVP.
7. **FedaPay est le fournisseur de paiement du MVP**, mais le code doit rester assez abstrait (`PaymentService` + providers interchangeables) pour permettre d'ajouter Kkiapay ou un autre fournisseur plus tard sans réécrire le produit.
8. **N'invente pas de couleurs, typographies ou composants à la volée.** Utilise `design/DESIGN_SYSTEM.md`, `design/COLORS.md`, `design/TYPOGRAPHY.md`, `design/COMPONENTS.md`.
9. **Stack imposée :** Next.js + TypeScript (frontend), NestJS (backend), PostgreSQL (base de données). Ne change pas de stack sans qu'une entrée `docs/DECISIONS.md` ne le documente.
10. **Toute nouvelle décision structurante** (schéma de données, choix technique majeur, changement de règle métier) doit être consignée dans `docs/DECISIONS.md`.

## Workflow attendu

- Avance document par document / fonctionnalité par fonctionnalité, pas par gros prompt monolithique.
- Avant de livrer une fonctionnalité, vérifie sa cohérence avec `docs/BUSINESS_RULES.md` et `docs/USER_FLOWS.md`.
- Consigne les tâches dans `tasks/TODO.md` et les changements notables dans `tasks/CHANGELOG.md`.

## Ce que ce projet n'est PAS

Voir `docs/MVP_SCOPE.md` — section "Ce qu'on ne construit pas dans le MVP".
