-- ============================================================
-- Migration : Groupage hybride (par produit + par destination)
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- 1. Ajouter le type compatibility_class
create type compatibility_class as enum (
  'food',           -- Alimentaire (café, thé, céréales, conserves)
  'chemical_safe',  -- Chimique non-dangereux (peintures, détergents, cosmétiques)
  'chemical_haz',   -- Chimique dangereux / ADR (inflammables, corrosifs, gaz)
  'electronics',    -- Électronique (téléphones, composants, appareils)
  'textile',        -- Textile (vêtements, tissus, chaussures)
  'general'         -- Matériel général (outils, pièces, équipement)
);

-- 2. Ajouter compatibility_class aux catégories (valeur par défaut basée sur le slug)
alter table categories add column compatibility_class compatibility_class not null default 'general';

-- Mapper les catégories existantes
update categories set compatibility_class = 'electronics' where slug = 'electronics';
update categories set compatibility_class = 'general' where slug = 'construction';
update categories set compatibility_class = 'food' where slug = 'food';
update categories set compatibility_class = 'textile' where slug = 'textile';
update categories set compatibility_class = 'general' where slug = 'household';

-- 3. Ajouter compatibility_class aux produits (hérite de la catégorie par défaut)
alter table products add column compatibility_class compatibility_class not null default 'general';

-- Synchroniser les produits existants avec leur catégorie
update products p
set compatibility_class = c.compatibility_class
from categories c
where p.category_id = c.id;

-- 4. Ajouter pool_type aux consolidation_pools
create type pool_type as enum ('by_product', 'by_destination');

alter table consolidation_pools add column pool_type pool_type not null default 'by_destination';
alter table consolidation_pools add column compatibility_class compatibility_class;
alter table consolidation_pools add column product_id uuid references products(id) on delete set null;
alter table consolidation_pools add column max_deadline_days integer not null default 7;

-- Les pools existants deviennent 'by_destination' par défaut
update consolidation_pools set pool_type = 'by_destination' where pool_type is null;

-- 5. Créer la table pool_members (trace quels produits/commandes sont dans quel pool)
create table pool_members (
  id uuid primary key default uuid_generate_v4(),
  pool_id uuid not null references consolidation_pools(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  product_id uuid not null references products(id) on delete cascade,
  buyer_id uuid not null references profiles(id) on delete cascade,
  qty integer not null check (qty > 0),
  weight_kg numeric(12,2) not null default 0,
  volume_m3 numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create index idx_pool_members_pool on pool_members(pool_id);
create index idx_pool_members_buyer on pool_members(buyer_id);

alter table pool_members enable row level security;
create policy "Anyone can read pool members"
  on pool_members for select using (true);
create policy "Buyers can add own orders to pool"
  on pool_members for insert with check (auth.uid() = buyer_id);

-- 6. Table de compatibilité entre classes
-- Définit quelles classes peuvent être groupées ensemble
create table compatibility_matrix (
  class_a compatibility_class not null,
  class_b compatibility_class not null,
  compatible boolean not null default false,
  primary key (class_a, class_b)
);

-- Règles de compatibilité (symétrique)
-- food: uniquement avec food
-- chemical_haz: uniquement avec chemical_haz (même classe)
-- chemical_safe: avec chemical_safe, general, electronics, textile
-- electronics: avec electronics, textile, general, chemical_safe
-- textile: avec textile, electronics, general, chemical_safe
-- general: avec general, electronics, textile, chemical_safe

insert into compatibility_matrix (class_a, class_b, compatible) values
  -- food n'est compatible qu'avec food
  ('food', 'food', true),
  -- chemical_haz uniquement avec chemical_haz
  ('chemical_haz', 'chemical_haz', true),
  -- chemical_safe
  ('chemical_safe', 'chemical_safe', true),
  ('chemical_safe', 'general', true),
  ('chemical_safe', 'electronics', true),
  ('chemical_safe', 'textile', true),
  -- electronics
  ('electronics', 'electronics', true),
  ('electronics', 'textile', true),
  ('electronics', 'general', true),
  ('electronics', 'chemical_safe', true),
  -- textile
  ('textile', 'textile', true),
  ('textile', 'electronics', true),
  ('textile', 'general', true),
  ('textile', 'chemical_safe', true),
  -- general
  ('general', 'general', true),
  ('general', 'electronics', true),
  ('general', 'textile', true),
  ('general', 'chemical_safe', true)
on conflict (class_a, class_b) do nothing;

alter table compatibility_matrix enable row level security;
create policy "Anyone can read compatibility matrix"
  on compatibility_matrix for select using (true);

-- 7. Fonction pour vérifier la compatibilité
create or replace function check_compatibility(
  p_class_a compatibility_class,
  p_class_b compatibility_class
) returns boolean as $$
begin
  return exists (
    select 1 from compatibility_matrix
    where class_a = p_class_a and class_b = p_class_b and compatible = true
  );
end;
$$ language plpgsql stable;

-- 8. Vérification
select 'Migration OK' as status;
