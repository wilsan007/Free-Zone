# FreeZone Market — Stratégie anti-contournement (désintermédiation)

> Le problème : un importateur repère un stock sur la plateforme, obtient le nom du vendeur,
> puis conclut l'affaire par WhatsApp et vire l'argent en direct. La plateforme a servi de
> catalogue gratuit. C'est LE risque n° 1 de toute marketplace B2B — et les grandes plateformes
> l'ont résolu par la même équation : **rendre le contournement plus coûteux que la commission.**

## Ce qu'on apprend des grandes plateformes

| Plateforme | Mécanisme | Transposition FreeZone |
|---|---|---|
| **Alibaba — Trade Assurance** | La protection (remboursement, litige, garantie) n'existe QUE si le paiement passe par la plateforme | ✅ Protection FreeZone : escrow, remboursement, médiation 72 h, documents douaniers — affichée sur chaque fiche produit et chaque commande |
| **Upwork / Fiverr** | Coordonnées masquées dans la messagerie tant qu'aucun contrat payé ; détection + sanctions | ✅ Messagerie RFQ avec masquage **côté serveur** des téléphones, e-mails, IBAN, liens et mentions WhatsApp/Telegram (multilingue FR/AM/AR) jusqu'au paiement séquestré ; tentatives journalisées dans l'audit log |
| **Airbnb** | Identité et adresse exactes révélées après réservation payée | ✅ `public_profiles` : le nom de l'entreprise est public (confiance), mais téléphone/e-mail ne se débloquent qu'après escrow |
| **Faire (wholesale)** | Avantages financiers réservés à la plateforme : paiement à 60 jours, retours gratuits | 🔜 Phase 2 : conditions de paiement différées pour les acheteurs bien notés, financées par un partenaire |
| **Uber Freight / Kobo360** | Le transporteur est payé vite et de façon fiable par la plateforme, pas par le client | 🔜 Paiement transporteur séquestré : acompte au chargement, solde à la livraison |

## Le principe directeur : la carotte d'abord, le bâton ensuite

Une plateforme qui ne fait que bloquer pousse les utilisateurs à partir. L'ordre des armes :

1. **De la valeur qu'on ne peut pas répliquer hors plateforme** (positif)
2. **De la friction sur la fuite** (défensif)
3. **Des sanctions** (dernier recours)

---

## 1. La valeur impossible à répliquer hors plateforme

### 1.1 Protection FreeZone (implémenté — composant `PlatformProtection`)
Affichée sur la fiche produit, au moment de la commande et sur le suivi :
- Paiement séquestré : le vendeur n'est payé qu'à la livraison confirmée.
- Remboursement garanti si marchandise non conforme documentée.
- Médiation des litiges sous 72 h avec preuves photos horodatées.
- Dossier douanier unique (facture, T1, certificat d'origine) partagé entre les parties.
- Avec le rappel explicite : « Hors plateforme, aucune de ces protections ne s'applique. »

**Pourquoi ça marche ici particulièrement** : dans le commerce Djibouti–Éthiopie, le risque de
contrepartie est élevé (distance, frontière, change). L'acheteur qui paie en direct un vendeur
qu'il n'a jamais rencontré prend un risque réel. L'escrow ne vend pas de la technologie, il vend
du sommeil.

### 1.2 Le groupage est structurellement captif (implémenté — RPC `create_order`)
C'est l'atout le plus fort du modèle : **impossible à contourner par nature.**
- Un petit importateur seul ne peut pas remplir un camion ; le pool de consolidation n'existe
  que sur la plateforme, avec sa jauge en temps réel.
- Le rattachement au pool se fait automatiquement à la commande (destination + classe de
  compatibilité + capacité restante) — un acheteur hors plateforme n'a simplement pas accès
  au camion partagé ni à son tarif.
- Plus il y a d'acheteurs groupage, plus les départs sont fréquents, plus le service est
  attractif : effet de réseau direct.

### 1.3 La réputation ne se gagne QUE sur la plateforme (implémenté — politique RLS)
Un avis ne peut être déposé que sur une commande réellement séquestrée (statut
`escrow_funded` ou au-delà — c'est vérifié en base, pas dans l'interface). Conséquences :
- Un vendeur qui traite hors plateforme n'accumule ni note, ni volume affiché, ni badge —
  il reste invisible face à ses concurrents mieux notés.
- Un acheteur sans historique n'obtient ni plafonds élevés ni (phase 2) conditions de paiement.
- Le classement du catalogue favorisera les vendeurs à fort volume ON-platform : la visibilité
  elle-même devient la récompense.

### 1.4 La logistique intégrée (implémenté partiellement)
Tracking, transporteurs vérifiés, documents douaniers rattachés à la commande. Hors plateforme,
l'acheteur doit tout réorganiser lui-même — appels, transitaire, aucune visibilité.

### 1.5 À venir (phase 2 — inscrites dans la feuille de route)
- **Commissions dégressives** : plus un vendeur transige sur la plateforme, plus sa commission
  baisse (3 % → 1,5 %). Contourner = perdre son palier.
- **Paiement différé acheteurs** (modèle Faire) : net-30/60 réservé aux acheteurs avec
  historique séquestré.
- **Assurance marchandise** incluse au-delà d'un volume trimestriel on-platform.
- **Accès prioritaire aux pools** (départs plus fréquents) pour les fidèles.

---

## 2. La friction sur la fuite (implémenté)

### 2.1 Coordonnées verrouillées en base — pas dans l'interface
- `profiles` n'est plus lisible publiquement ; la vue `public_profiles` expose l'identité
  **sans** téléphone ni e-mail. Même un client modifié ne peut pas les lire (RLS).
- Le déblocage du contact est un événement serveur (`contact_unlocked`) : il n'a lieu qu'une
  fois une commande séquestrée entre CES deux parties — au moment où la coordination logistique
  devient légitime.

### 2.2 Messagerie surveillée côté serveur — le point décisif
- Tout message passe par la RPC `send_message` : détection et masquage des téléphones, e-mails,
  IBAN/SWIFT, URLs et mentions d'applications (WhatsApp, Telegram… y compris écrites en
  amharique et en arabe) **avant** stockage de la version visible.
- La contrepartie lit via la vue `thread_messages` qui ne sert JAMAIS le texte original tant
  que le contact n'est pas débloqué. Le corps original n'atteint pas le navigateur adverse.
- Le module client (`antileak.ts`) ne sert qu'à avertir l'expéditeur en temps réel — la
  décision appartient au serveur.
- Chaque tentative est journalisée (`audit_log`, action `MESSAGE_LEAK_FLAGGED`) avec le motif :
  base objective pour la gradation des sanctions.

### 2.3 Transactions atomiques côté serveur
La commande (prix, réservation de stock, rattachement au pool) est une fonction PostgreSQL
unique : le client n'envoie ni prix ni total. Pas de survente, pas de manipulation de prix,
pas de commande fantôme pour débloquer un contact (le déblocage exige le statut *séquestré*,
pas juste *créé*).

---

## 3. Les sanctions (à activer à l'ouverture publique)

Gradation recommandée, fondée sur l'audit log :
1. **Avertissement pédagogique** automatique au 1er signalement (rappel de la protection perdue).
2. **Baisse de visibilité** dans le catalogue au-delà de N signalements sur 30 jours.
3. **Suspension temporaire** de la messagerie, puis du compte en cas de récidive manifeste.
4. **Clause contractuelle** dans les CGU : le contournement documenté autorise la suspension
   et (pour les vendeurs) la perte du badge vérifié — l'arme d'Upwork.

À ne PAS faire : bloquer brutalement dès le premier message ambigu (faux positifs → fuite de
clients légitimes). Le masquage silencieux + avertissement suffit au début.

---

## 4. Mesurer (sinon on pilote à l'aveugle)

Indicateurs à suivre dès le lancement (les données existent déjà) :
- **Taux de fuite messagerie** : messages signalés / messages totaux, par utilisateur.
- **Taux de conversion RFQ → commande séquestrée** : si un vendeur a beaucoup de conversations
  et zéro commande, il transige probablement à côté.
- **Récurrence acheteur** : un acheteur actif qui cesse de commander mais continue de consulter
  les fiches d'un même vendeur = signal de fuite.
- Revue mensuelle des `MESSAGE_LEAK_FLAGGED` de l'audit log.

---

## État d'implémentation

| Mécanisme | État |
|---|---|
| Escrow (machine à états des commandes) | ✅ schéma + RPC (paiement réel : phase banque) |
| Protection FreeZone visible (fiche produit, commande, suivi) | ✅ implémenté |
| Coordonnées verrouillées (RLS + `public_profiles`) | ⚠️ code prêt — **exécuter `supabase/migration_v2_securite_transactions.sql`** |
| Messagerie masquée côté serveur + audit | ⚠️ idem — même script |
| Commande atomique serveur (prix, stock, pool) | ⚠️ idem — même script |
| Avis réservés aux transactions séquestrées | ⚠️ idem — même script |
| Groupage captif (pools + jauges + rattachement auto) | ✅ implémenté (rattachement via la RPC) |
| Commissions dégressives, paiement différé, sanctions | 🔜 phase 2 |
