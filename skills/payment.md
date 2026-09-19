# skills/payment.md

- Implémenter `PaymentService` avec `FedaPayProvider` et `TestProvider` derrière une interface commune (voir `docs/PAYMENT.md`).
- Vérification de signature obligatoire sur le endpoint webhook (`X-FEDAPAY-SIGNATURE`) — rejeter toute requête non signée correctement.
- Traitement idempotent : un webhook reçu plusieurs fois pour le même événement ne doit produire l'effet de déblocage qu'une seule fois.
- Ne jamais marquer un paiement `success` depuis une route appelée par le frontend — uniquement depuis la vérification serveur du webhook (ou un polling qui interroge directement l'API FedaPay côté serveur, jamais un flag transmis par le client).
- Gérer explicitement les statuts pending/failed/canceled avec un retour utilisateur clair (voir `design/COMPONENTS.md` → états système).
- Utiliser `TestProvider` par défaut en environnement de développement.
