# PAYMENT.md — Paiement (FedaPay)

## Fournisseur retenu pour le MVP

**FedaPay** (l'IFU professionnel a été obtenu). Kkiapay reste une option future si le RCCM est obtenu (Kkiapay exige une entreprise enregistrée avec registre de commerce + IFU pour un compte marchand actif au Bénin).

## Principe d'abstraction

```
PaymentService
   ├── FedaPayProvider
   ├── KkiapayProvider   (futur, si éligibilité obtenue)
   └── TestProvider       (développement / démo)
```

L'interface utilisateur et le reste du produit ne doivent pas changer selon le provider actif — seul le provider branché derrière `PaymentService` change.

## Flux de paiement (source de vérité)

```
Utilisateur
   ↓
Clique "Payer"
   ↓
Backend crée une intention de paiement (pas de confiance au frontend)
   ↓
Provider (FedaPay) génère la transaction / le lien de paiement / le token
   ↓
Utilisateur paie sur la page FedaPay
   ↓
Webhook FedaPay → backend
   ↓
Backend vérifie la transaction (signature + statut) côté serveur
   ↓
payment.status = SUCCESS
   ↓
Analysis = UNLOCKED
```

**Règle absolue :** un paiement n'est considéré comme valide qu'après confirmation côté serveur (webhook + vérification), jamais uniquement parce que le frontend affiche un état "payé".

## Éléments techniques à couvrir dans l'implémentation

- **Création de transaction** : génération du lien de paiement / token via l'API FedaPay.
- **Statuts de transaction** à gérer explicitement : pending, approved (approuvé), failed/canceled.
- **Webhook** : réception, vérification de la signature (`X-FEDAPAY-SIGNATURE`), traitement idempotent (un même événement reçu plusieurs fois ne doit pas déverrouiller deux fois / dupliquer l'accès).
- **Idempotence** : chaque paiement est lié à un identifiant unique de session d'analyse ; un webhook rejoué ne doit pas créer d'effet de bord.
- **Échec / annulation** : l'utilisateur revient à l'écran d'offre, aucune donnée saisie n'est perdue, il peut retenter le paiement.
- **Remboursement éventuel** : à documenter si un cas d'usage se présente (non prioritaire pour le MVP).
- **Sécurité** : le endpoint de webhook doit être protégé (vérification de signature obligatoire, pas d'accès public non authentifié aux actions de déverrouillage).

## Mode développement

Un `TestProvider` simule un paiement réussi immédiatement (`payment.status = SUCCESS`) pour permettre de développer et tester tout le reste du produit sans dépendre du compte marchand FedaPay en production.
