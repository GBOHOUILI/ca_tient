# skills/testing.md

## Priorités de test

1. **Moteur financier** (`skills/financial-engine.md`) — priorité absolue, couverture proche de 100 % sur les formules, y compris les cas limites.
2. **Paiement** (`skills/payment.md`) — tests sur la vérification de signature, l'idempotence des webhooks, et les transitions de statut (pending → success / pending → failed).
3. **Parcours utilisateur critique** — test end-to-end du tunnel landing → paiement → analyse débloquée, avec `TestProvider`.

## Ce qui peut rester plus léger pour le MVP

- Tests visuels/UI détaillés (peuvent attendre après la validation de l'hypothèse commerciale — voir `docs/BUSINESS_RULES.md`).
- Tests de charge poussés (le MVP vise 10–20 utilisateurs réels dans un premier temps, voir `docs/ROADMAP.md`).
