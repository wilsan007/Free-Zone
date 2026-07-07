# FreeZone Market — Plateforme de commerce de la Zone Franche de Djibouti

> Document de conception v0.1 — 7 juillet 2026
> Marketplace B2B connectant les entreprises installées dans la zone franche de Djibouti (DIFTZ),
> les importateurs éthiopiens (gros et petits volumes) et les transporteurs du corridor Djibouti–Addis-Abeba.

---

## 1. Vision et opportunité

Environ **95 % du commerce extérieur éthiopien** transite par les ports de Djibouti. La zone franche
internationale de Djibouti (DIFTZ) héberge des centaines d'entreprises qui stockent des marchandises
destinées principalement au marché éthiopien. Aujourd'hui, ce commerce repose sur des relations
informelles : déplacements physiques, appels téléphoniques, intermédiaires, aucune visibilité sur
les stocks réellement disponibles, et une logistique organisée au cas par cas.

**FreeZone Market** digitalise l'ensemble de la chaîne :

1. **Visibilité des stocks** : les entreprises de la zone franche publient leurs stocks disponibles en temps réel.
2. **Achat à distance** : les importateurs éthiopiens achètent depuis Addis-Abeba, Dire Dawa, etc., sans se déplacer.
3. **Logistique intégrée** : des transporteurs vérifiés prennent en charge la cargaison jusqu'à destination.
4. **Deux régimes d'achat** :
   - **Gros volumes (FTL — Full Truck Load)** : achat de lots/cargaisons complètes, tarif de gros, camion dédié déclenché immédiatement.
   - **Petites quantités (groupage / LTL)** : achat de petits lots à tarif différencié ; la plateforme **consolide** les commandes de plusieurs acheteurs vers la même destination et déclenche le camion quand le seuil de remplissage est atteint.

### Inspirations (les « géants » dont on adapte le modèle)

| Plateforme | Ce qu'on lui emprunte |
|---|---|
| **Alibaba / 1688.com** | Marketplace B2B, fiches produits par paliers de prix (MOQ), **Trade Assurance** (séquestre/escrow), vérification des vendeurs (badges « Verified Supplier ») |
| **Faire** | Achat de gros en petites quantités, conditions de paiement flexibles pour petits acheteurs |
| **Uber Freight / Convoy** | Marketplace de fret : matching automatique camion ↔ cargaison, prix dynamique, tracking |
| **Lori Systems / Kobo360** (Afrique) | Digitalisation du fret routier africain : gestion des corridors, documents de transit, paiement des transporteurs, réalités terrain (connectivité faible, cash, checkpoints) |
| **Flexport** | Tour de contrôle documentaire : chaque expédition a un dossier unique (facture, T1, certificat d'origine, e-CMR) visible par toutes les parties |

---

## 2. Les acteurs

| Acteur | Rôle | Vérification à l'inscription (KYB/KYC) |
|---|---|---|
| **Vendeur** (entreprise zone franche) | Publie stocks, fixe prix gros/détail, prépare les expéditions | Licence DIFTZ/DPFZA, registre de commerce, pièce du gérant, visite d'entrepôt (badge « Vérifié sur site ») |
| **Acheteur gros** (importateur éthiopien) | Achète des lots complets, régime FTL | Licence d'importation éthiopienne, TIN, KYB bancaire |
| **Acheteur petit volume** | Achète de petites quantités, régime groupage | Pièce d'identité + licence commerciale simplifiée ; plafonds d'achat progressifs |
| **Transporteur** | Flottes ou chauffeurs indépendants, corridor routier (Galafi/Galile) ou rail Addis–Djibouti | Carte grise, assurance, licence transport international, permis chauffeur, historique de courses |
| **Transitaire / agent en douane** (optionnel mais clé) | Gère T1, déclarations, passage frontière | Agrément douanes Djibouti + Éthiopie |
| **Admin plateforme** | Modération, litiges, conformité, finance | — |

**Principe de confiance (le plus important)** : personne ne vend, n'achète ni ne transporte sans
vérification documentaire. C'est ce qui a fait le succès d'Alibaba Trade Assurance : la plateforme
se porte garante de l'identité et du flux d'argent.

---

## 3. Articulation fonctionnelle

### 3.1 Module Catalogue & Stocks

- Fiches produits normalisées : catégorie, code SH (douane), photos, unité (carton, palette, conteneur), poids/volume (essentiel pour le groupage).
- **Deux grilles de prix par produit** : prix « lot complet » (FTL) et prix « petite quantité » (majoré, avec MOQ minimum).
- Stock temps réel : décrément automatique à chaque commande confirmée, **réservation temporaire** (ex. 48 h) pendant le paiement pour éviter la survente.
- Intégration future avec les ERP/Excel des vendeurs (import CSV au début, API ensuite).
- Badge de fiabilité du stock : les vendeurs dont le stock affiché correspond au stock réel gardent leur badge ; les annulations pour rupture le font perdre.

### 3.2 Module Commande — régime GROS (FTL)

1. L'importateur consulte les stocks, filtre par produit/prix/vendeur/disponibilité.
2. Négociation possible via **RFQ** (demande de cotation) intégrée — pas de WhatsApp hors plateforme, sinon on perd la traçabilité et la commission.
3. Commande → paiement en **séquestre (escrow)** → le vendeur prépare la marchandise.
4. La plateforme publie l'offre de fret aux transporteurs (ou l'acheteur choisit le sien).
5. Chargement contrôlé (photos, bon de chargement signé numériquement), documents douaniers rattachés au dossier.
6. Tracking GPS jusqu'à destination ; **libération de l'escrow** à la confirmation de livraison (ou à la sortie de zone franche, selon l'Incoterm choisi — voir §5).

### 3.3 Module Commande — régime PETITES QUANTITÉS (groupage)

C'est la vraie innovation locale. Fonctionnement du **moteur de consolidation** :

1. Chaque petite commande payée entre dans un **pool de groupage** défini par : destination (ex. Addis-Abeba, Dire Dawa), type de marchandise compatible (pas de produits alimentaires avec des produits chimiques), et fenêtre de temps.
2. La plateforme affiche à l'acheteur **la jauge de remplissage du prochain camion** (« Camion Addis-Abeba : 72 % rempli — départ estimé sous 3 jours ») — transparence totale, comme la barre de progression d'un financement participatif. C'est ce qui rend l'attente acceptable.
3. Quand le seuil (poids/volume/valeur) est atteint **ou** que la date limite du pool arrive, le camion est déclenché. Si le pool n'est pas plein à la date limite : départ quand même (coût réparti) ou report avec accord des acheteurs — règle choisie à la commande.
4. Consolidation physique dans un **entrepôt de groupage** partenaire en zone franche (point faible à sécuriser contractuellement dès le départ : il faut un opérateur d'entreposage partenaire).
5. Chaque colis est étiqueté (QR code), scanné au chargement et au déchargement ; **dégroupage** au point de livraison en Éthiopie (hub partenaire à Addis) puis retrait ou livraison dernier kilomètre.
6. Prix transport = quote-part au prorata poids/volume, connue **avant** l'achat.

### 3.4 Module Transport

- **Bourse de fret** : les offres (FTL et camions de groupage) sont publiées ; les transporteurs vérifiés font des offres ou acceptent un prix fixé (modèle Uber Freight : prix instantané basé sur l'historique du corridor).
- Application mobile chauffeur : **offline-first** (la connectivité sur le corridor est intermittente), GPS, photos de chargement/livraison, signature électronique du destinataire, e-CMR.
- Étapes trackées : sortie zone franche → frontière (Galafi/Galile) → dédouanement → arrivée hub / livraison.
- Paiement transporteur séquestré lui aussi : acompte au chargement, solde à la livraison confirmée. (Modèle Kobo360 : c'est la rapidité de paiement des chauffeurs qui fidélise l'offre de transport.)
- Alternative rail : intégration du chemin de fer Addis–Djibouti pour les gros volumes (phase 2).

### 3.5 Module Paiements & Escrow — le nerf de la guerre

**Contrainte majeure : le contrôle des changes éthiopien.** Le birr n'est pas librement convertible ;
les importateurs éthiopiens paient normalement via lettres de crédit (LC) ou permis de devises délivrés
par les banques sous supervision de la Banque Nationale d'Éthiopie. **La plateforme ne doit jamais
devenir un canal de contournement du contrôle des changes** — c'est le risque juridique n° 1.

Approche par paliers :

1. **Phase 1 (pragmatique)** : la plateforme structure la transaction et les documents, le paiement
   passe par les **canaux bancaires officiels** (LC, virement documenté). L'escrow est un compte
   séquestre chez une banque partenaire à Djibouti (en USD ou FDJ, le franc Djibouti étant arrimé à l'USD).
   La plateforme confirme « fonds reçus » et orchestre la libération.
2. **Phase 2** : partenariat avec des banques éthiopiennes (CBE, Awash, Dashen…) pour pré-valider
   les permis de devises directement dans le parcours d'achat, et intégration mobile money (Telebirr côté
   frais locaux éthiopiens, D-Money/Waafi côté Djibouti pour les frais locaux et le paiement des transporteurs).
3. **Financement (phase 3)** : crédit de stock pour les acheteurs récurrents bien notés (modèle Faire
   « buy now, pay in 60 days »), adossé à un partenaire financier.

Règles d'escrow :
- Libération vendeur : selon l'Incoterm — à la remise au transporteur (EXW/FCA) ou à la livraison (DAP).
- Litige : gel des fonds + procédure de médiation avec preuves horodatées (photos, scans, GPS).
- Aucune transaction hors plateforme pour les utilisateurs vérifiés (clause contractuelle + détection de fuite : messages avec numéros de téléphone/coordonnées bancaires signalés).

### 3.6 Module Documents & Douane

Chaque expédition = **un dossier numérique unique** partagé entre vendeur, acheteur, transporteur, transitaire :
facture commerciale, liste de colisage, certificat d'origine, déclaration de sortie de zone franche,
document de transit (T1), déclaration d'importation éthiopienne, e-CMR. Statuts visibles par tous
(« en attente de T1 », « dédouané », « en route »). C'est le modèle « tour de contrôle » de Flexport,
et c'est ce qui supprime 80 % des appels téléphoniques.

Intégrations cibles : guichet unique de Djibouti (Djibouti Port Community System), systèmes douaniers
(ASYCUDA côté Djibouti, eSW/ESL côté Éthiopie) — en phase 2/3, manuel avec upload de PDF au début.

### 3.7 Confiance, notation, litiges

- Notation bilatérale (vendeur ↔ acheteur ↔ transporteur) après chaque transaction, critères concrets : conformité de la marchandise, respect des délais, état à la livraison.
- Historique public : volume traité, taux de litige, ancienneté.
- Procédure de litige encadrée (72 h pour signaler, preuves photo obligatoires au chargement ET au déchargement — cela protège tout le monde).
- Assurance marchandise optionnelle à la commande (partenaire assureur, phase 2).

---

## 4. Sécurité

**Sécurité transactionnelle**
- Escrow systématique — aucun paiement direct entre parties.
- KYB documentaire + visites physiques d'entrepôts pour le badge « vérifié ».
- Plafonds progressifs : un nouveau compte ne peut pas traiter 500 000 USD le premier jour.
- Détection anti-fraude : comptes multiples, stocks fantômes (vendeur qui annule souvent), collusion acheteur-vendeur pour blanchir.
- Conformité **AML/CFT** : screening des sanctions, seuils de déclaration, piste d'audit complète — indispensable vu la sensibilité de la région et pour garder la confiance des banques partenaires.

**Sécurité technique**
- Authentification : 2FA obligatoire (TOTP ou SMS/WhatsApp), sessions courtes pour les rôles financiers.
- RBAC strict : un employé d'un vendeur ne voit que les données de son entreprise ; rôles séparés (catalogue / finance / expédition).
- Chiffrement TLS partout, chiffrement au repos des documents (les factures commerciales sont sensibles).
- Journal d'audit immuable de toute action financière et documentaire.
- Sauvegardes chiffrées multi-régions ; les documents douaniers doivent être conservés plusieurs années (obligation légale).

**Sécurité physique/opérationnelle**
- QR codes scellés sur les colis groupage, photos horodatées et géolocalisées à chaque transfert de responsabilité.
- Le transfert de responsabilité est explicite dans l'app : « le transporteur X accepte la garde de 14 colis, état constaté : … ».

---

## 5. Cadre juridique (à valider avec un conseil local — points identifiés)

1. **Statut de la plateforme** : idéalement une société enregistrée en zone franche (licence DPFZA), agissant comme *intermédiaire technique et commissionnaire*, PAS comme acheteur-revendeur (sinon la plateforme porte le risque marchandise et douanier).
2. **Vente en zone franche** : les marchandises en zone franche sont hors territoire douanier djiboutien ; la vente sur la plateforme est une vente à l'export — les Incoterms proposés doivent être limités et clairs (EXW entrepôt zone franche / FCA / DAP Addis-Abeba) pour que chacun sache qui paie douane et transport.
3. **Contrôle des changes éthiopien** : voir §3.5 — la plateforme documente et facilite les paiements officiels, elle ne les contourne pas. Prévoir une revue juridique côté Banque Nationale d'Éthiopie.
4. **Transit** : convention de transit Djibouti–Éthiopie, documents T1, garanties de transit — le partenariat avec des transitaires agréés est obligatoire au lancement.
5. **CGU tripartites** : contrats-cadres électroniques vendeur/acheteur/transporteur, clause de médiation, droit applicable (Djibouti), signature électronique.
6. **Données personnelles** : politique de confidentialité, consentement, hébergement des données (souveraineté à discuter — un hébergement avec réplication régionale est un argument commercial auprès de la DPFZA).

---

## 6. Expérience utilisateur

- **Multilingue dès le départ** : français, anglais, **amharique**, arabe (et somali/afar en phase 2). Le sélecteur de langue est visible sur chaque écran.
- **Mobile-first et léger** : la majorité des importateurs éthiopiens utiliseront un téléphone Android milieu de gamme avec une connexion 3G/4G instable. Pages < 200 Ko, images compressées, mode dégradé hors ligne (consultation du suivi).
- **Trois interfaces distinctes** (ne jamais mélanger) :
  - *Acheteur* : recherche → fiche produit → choix gros/groupage → paiement → suivi. Cinq écrans, pas plus.
  - *Vendeur* : tableau de bord stocks, commandes à préparer, revenus, litiges.
  - *Transporteur* : app mobile dédiée, offres de fret, courses en cours, paiements.
- **La jauge de groupage** comme élément central de l'UX petits volumes : visible avant l'achat (« votre colis partira quand le camion sera plein — actuellement 72 % »), notifications WhatsApp/SMS à chaque étape (canal que tout le monde a déjà).
- **Confiance visible** : badges de vérification, photos réelles d'entrepôts, notes, volume traité — l'acheteur qui ne peut pas toucher la marchandise doit « voir » la fiabilité.
- Onboarding guidé avec vérification en < 48 h et statut de la vérification affiché.

---

## 7. Architecture technique

**Principe : monolithe modulaire d'abord, découpage ensuite.** Un marketplace + escrow + groupage
n'a pas besoin de microservices au lancement ; il a besoin d'être fiable et rapide à faire évoluer.

```
┌────────────────────────────────────────────────────────────┐
│  Web app (Next.js, PWA, i18n FR/EN/AM/AR)                  │
│  App chauffeur (React Native / Expo, offline-first)        │
└────────────────────────┬───────────────────────────────────┘
                         │ API (REST + webhooks)
┌────────────────────────┴───────────────────────────────────┐
│  Backend modulaire (Node/TypeScript ou équivalent)         │
│  ├─ identity (KYB, RBAC, 2FA)                              │
│  ├─ catalog (produits, stocks, réservations)               │
│  ├─ orders (FTL + RFQ)                                     │
│  ├─ consolidation (pools de groupage, jauges, déclencheur) │
│  ├─ freight (bourse de fret, matching, tracking)           │
│  ├─ payments (escrow, états, rapprochement bancaire)       │
│  ├─ documents (dossier d'expédition, statuts douaniers)    │
│  └─ trust (notes, litiges, anti-fraude, audit log)         │
├────────────────────────────────────────────────────────────┤
│  PostgreSQL (source de vérité, transactions ACID pour      │
│  stock/escrow) + Redis (jauges temps réel, files)          │
│  Stockage objet chiffré (documents, photos)                │
└────────────────────────────────────────────────────────────┘
```

Points d'architecture critiques :
- **Réservation de stock et escrow = transactions ACID**, jamais « eventual consistency » sur l'argent ou le stock.
- Le **moteur de consolidation** est un processus événementiel : chaque commande payée émet un événement, le pool recalcule sa jauge, le déclenchement (seuil ou date) crée l'offre de fret automatiquement.
- Tout état financier est une **machine à états explicite** (commande : créée → payée-séquestre → en préparation → chargée → en transit → livrée → fonds libérés / litige) avec journal immuable.
- Tracking GPS : ingestion tolérante aux trous réseau (le téléphone bufferise et renvoie).
- Notifications : WhatsApp Business API + SMS en repli.

---

## 8. Modèle économique

| Source | Détail |
|---|---|
| Commission transaction | 1–3 % sur le gros (marges fines), 5–8 % sur le groupage (service plus riche) |
| Marge logistique | Écart entre prix acheteur et prix transporteur sur le groupage |
| Abonnement vendeur | Gratuit au début (il faut l'offre !), puis premium : mise en avant, statistiques, API stock |
| Services (phase 2+) | Assurance, financement, dédouanement assisté, entreposage |

**Stratégie d'amorçage** (le problème de l'œuf et de la poule) : commencer côté **offre** — signer
15–20 vendeurs de la zone franche avec de vrais stocks photographiés et vérifiés, sur 2–3 catégories
liquides (électronique, matériaux de construction, alimentaire sec), puis aller chercher les acheteurs
éthiopiens de ces catégories avec une offre groupage imbattable. Un corridor, quelques catégories,
puis élargir.

---

## 9. Feuille de route MVP

**Phase 0 — validation terrain (4–6 semaines)**
Interviews : 10 vendeurs zone franche, 10 importateurs éthiopiens (gros + petits), 5 transporteurs,
1 transitaire, 1 banque djiboutienne. Valider : volumes, catégories, sensibilité prix groupage,
faisabilité escrow bancaire, circuit documentaire réel.

**Phase 1 — MVP (3–4 mois)**
- Catalogue + stocks + vérification vendeurs (manuelle).
- Commandes FTL avec escrow bancaire « orchestré manuellement » (la banque fait, la plateforme trace).
- Groupage v1 : pools sur UNE destination (Addis-Abeba), jauge visible, déclenchement semi-manuel.
- Transport : transporteurs partenaires pré-signés (pas encore de bourse ouverte), tracking par l'app chauffeur.
- Documents : upload PDF + statuts.
- Langues : FR + EN + AM.

**Phase 2 (6–12 mois)** : bourse de fret ouverte, paiements bancaires intégrés, mobile money pour les
frais locaux, notation complète, assurance, deuxième destination, API stocks vendeurs.

**Phase 3** : financement des acheteurs, intégrations douanières (ASYCUDA/eSW), rail, extension
régionale (Somaliland, Soudan du Sud ?).

---

## 10. Risques principaux et parades

| Risque | Parade |
|---|---|
| Contrôle des changes éthiopien bloque les paiements | Circuit bancaire officiel intégré dès la conception ; conseil juridique éthiopien ; ne jamais toucher au marché parallèle |
| Stocks affichés ≠ stocks réels → confiance détruite | Réservation ACID, badge fiabilité, pénalités d'annulation vendeur |
| Contournement de la plateforme après le premier contact | Escrow + assurance + litiges = valeur qu'on ne trouve pas hors plateforme ; détection de fuite dans la messagerie |
| Pool de groupage qui ne se remplit jamais | Date limite avec règles claires ; amorcer avec du fret propre ; limiter les destinations au début |
| Perte/vol sur le corridor | Transfert de responsabilité tracé, photos géolocalisées, assurance, transporteurs vérifiés uniquement |
| Dépendance à un entrepôt de groupage | Contrat solide avec un opérateur DIFTZ dès la phase 1, deuxième site en phase 2 |
