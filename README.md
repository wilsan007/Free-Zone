# FreeZone Market

Marketplace B2B de la zone franche de Djibouti : les entreprises installées en zone franche (DIFTZ)
publient leurs stocks en temps réel, les importateurs éthiopiens achètent en gros (FTL, camion dédié)
ou en petites quantités (groupage/LTL avec jauge de remplissage), et des transporteurs vérifiés
assurent le corridor Djibouti–Addis-Abeba.

La conception complète (acteurs, modules, escrow, cadre juridique, feuille de route) est dans
[CONCEPT.md](CONCEPT.md).

## Stack

- **Next.js 15** (App Router, React 19, TypeScript)
- **Tailwind CSS v4**
- **Supabase** (PostgreSQL + RLS, Auth à venir)
- i18n maison : français, anglais, amharique, arabe

## Démarrage

```bash
npm install
cp .env.example .env.local   # puis renseigner les clés Supabase
npm run dev                  # http://localhost:3000
```

### Base de données (Supabase SQL Editor, dans cet ordre)

1. `supabase/schema.sql` — tables, types, index, triggers, catégories de base
2. `supabase/seed.sql` — données de démonstration (vendeurs, produits, pools de groupage)
3. `supabase/migration_groupage_hybrid.sql` — pools par produit/destination, classes de
   compatibilité, membres de pool
4. `supabase/migration_v2_securite_transactions.sql` — **obligatoire** : RLS corrigé +
   anti-fuite (coordonnées verrouillées, messagerie masquée côté serveur) + RPC de commande
   atomique. Sans lui, la base est ouverte en écriture anonyme.
5. `supabase/migration_v3_score_confiance.sql` — score de confiance dynamique des vendeurs
   (vue `company_trust_scores` + triggers avis/volume)
6. `supabase/create_storage_bucket.sql` — bucket public des images produits
7. `supabase/create_test_users.sql` — comptes de démonstration (optionnel)

La stratégie anti-contournement complète est décrite dans
[STRATEGIE_ANTIFUITE.md](STRATEGIE_ANTIFUITE.md).

## Structure

```
src/
├── app/                  # pages (App Router)
│   ├── page.tsx          # accueil
│   ├── catalog/          # catalogue + fiche produit
│   ├── groupage/         # pools de consolidation (jauges)
│   └── freight/          # espace transporteurs
├── components/           # Header, ProductCard, ConsolidationGauge…
│   └── views/            # vues client des pages
└── lib/
    ├── supabase/         # clients server/browser + requêtes
    ├── types/            # types de la base de données
    └── i18n/             # traductions fr/en/am/ar + contexte
supabase/                 # schéma SQL, seed, politiques RLS
```

## État d'avancement (phase 1 du CONCEPT)

- [x] Catalogue avec stocks temps réel et double grille de prix (FTL / LTL)
- [x] Pools de groupage hybrides (par produit / par destination) avec jauge et classes de compatibilité
- [x] Multilingue FR / EN / AM / AR
- [x] Schéma complet : commandes, expéditions, offres de fret, documents, litiges, audit
- [x] Authentification (Supabase Auth), tableau de bord vendeur, ajout de produits avec upload d'images
- [x] Tunnel de commande atomique (RPC serveur : prix, réservation 48 h, rattachement au pool)
- [x] Anti-contournement : coordonnées verrouillées, messagerie RFQ masquée côté serveur, protection FreeZone
- [x] Score de confiance dynamique (avis, volume, ancienneté, réactivité — malus litiges et fuites) + paliers de commission dégressive
- [ ] Paiement séquestre réel (banque partenaire) et libération des fonds
- [ ] Bourse de fret active et tracking transporteur
