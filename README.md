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
3. `supabase/fix_rls.sql` — **obligatoire** : réactive le Row Level Security avec les politiques
   corrigées. Sans lui, la base est ouverte en écriture anonyme.

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
- [x] Pools de groupage avec jauge de remplissage
- [x] Multilingue FR / EN / AM / AR
- [x] Schéma complet : commandes, expéditions, offres de fret, documents, litiges, audit
- [ ] Authentification (Supabase Auth) et espaces vendeur / acheteur / transporteur
- [ ] Tunnel de commande avec séquestre (escrow) orchestré
- [ ] Bourse de fret active et tracking
