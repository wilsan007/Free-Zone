-- ============================================================
-- FreeZone Market — Réactivation RLS avec politiques corrigées
-- À exécuter dans le Supabase SQL Editor (remplace disable_rls.sql,
-- qui laissait la base entièrement ouverte en écriture anonyme).
--
-- Corrige aussi 3 bugs des politiques de schema.sql :
--  1. auth.uid() était comparé à profiles.id / companies.owner_id,
--     qui ne sont PAS l'id auth.users → politiques jamais vraies.
--     On passe par current_profile_id() (profiles.auth_user_id).
--  2. Politique shipments : "o.id = shipment_id" se résolvait en
--     o.id = o.shipment_id (auto-comparaison) → corrigée.
--  3. Politique reviews : o.seller_id est un id de companies, pas
--     un auth.uid() → corrigée via la jointure companies.
-- ============================================================

-- Helper : profil courant à partir de la session auth
create or replace function public.current_profile_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select id from profiles where auth_user_id = auth.uid()
$$;

-- ------------------------------------------------------------
-- PROFILES
-- ------------------------------------------------------------
alter table profiles enable row level security;
drop policy if exists "Users can read own profile" on profiles;
drop policy if exists "Users can update own profile" on profiles;
drop policy if exists "Anyone can read verified profiles" on profiles;
drop policy if exists "Anyone can read all profiles for MVP" on profiles;

create policy "profiles_public_read"
  on profiles for select using (true);
create policy "profiles_update_own"
  on profiles for update using (auth.uid() = auth_user_id);
create policy "profiles_insert_own"
  on profiles for insert with check (auth.uid() = auth_user_id);

-- ------------------------------------------------------------
-- COMPANIES
-- ------------------------------------------------------------
alter table companies enable row level security;
drop policy if exists "Anyone can read companies" on companies;
drop policy if exists "Owners can manage own company" on companies;

create policy "companies_public_read"
  on companies for select using (true);
create policy "companies_owner_manage"
  on companies for all
  using (owner_id = public.current_profile_id())
  with check (owner_id = public.current_profile_id());

-- ------------------------------------------------------------
-- CATEGORIES (lecture seule pour tous, écriture service role)
-- ------------------------------------------------------------
alter table categories enable row level security;
drop policy if exists "Anyone can read categories" on categories;

create policy "categories_public_read"
  on categories for select using (true);

-- ------------------------------------------------------------
-- PRODUCTS
-- ------------------------------------------------------------
alter table products enable row level security;
drop policy if exists "Anyone can read active products" on products;
drop policy if exists "Sellers can manage own products" on products;

create policy "products_public_read_active"
  on products for select using (is_active = true);
create policy "products_seller_manage"
  on products for all
  using (
    exists (
      select 1 from companies c
      where c.id = products.seller_id
        and c.owner_id = public.current_profile_id()
    )
  )
  with check (
    exists (
      select 1 from companies c
      where c.id = products.seller_id
        and c.owner_id = public.current_profile_id()
    )
  );

-- ------------------------------------------------------------
-- CONSOLIDATION POOLS (lecture publique, écriture service role)
-- ------------------------------------------------------------
alter table consolidation_pools enable row level security;
drop policy if exists "Anyone can read open pools" on consolidation_pools;

create policy "pools_public_read"
  on consolidation_pools for select using (true);

-- ------------------------------------------------------------
-- ORDERS
-- ------------------------------------------------------------
alter table orders enable row level security;
drop policy if exists "Buyers can read own orders" on orders;
drop policy if exists "Sellers can read orders for own products" on orders;
drop policy if exists "Buyers can create orders" on orders;

create policy "orders_buyer_read"
  on orders for select using (buyer_id = public.current_profile_id());
create policy "orders_seller_read"
  on orders for select using (
    exists (
      select 1 from companies c
      where c.id = orders.seller_id
        and c.owner_id = public.current_profile_id()
    )
  );
create policy "orders_buyer_insert"
  on orders for insert with check (buyer_id = public.current_profile_id());

-- ------------------------------------------------------------
-- SHIPMENTS
-- ------------------------------------------------------------
alter table shipments enable row level security;
drop policy if exists "Parties can read shipments" on shipments;

create policy "shipments_parties_read"
  on shipments for select using (
    transporter_id = public.current_profile_id()
    or exists (
      select 1 from orders o
      where (o.id = shipments.order_id or o.shipment_id = shipments.id)
        and o.buyer_id = public.current_profile_id()
    )
    or exists (
      select 1 from orders o
      join companies c on c.id = o.seller_id
      where (o.id = shipments.order_id or o.shipment_id = shipments.id)
        and c.owner_id = public.current_profile_id()
    )
  );

-- ------------------------------------------------------------
-- FREIGHT OFFERS
-- ------------------------------------------------------------
alter table freight_offers enable row level security;
drop policy if exists "Transporters can read and create own offers" on freight_offers;
drop policy if exists "Buyers and sellers can read offers for their shipments" on freight_offers;

create policy "freight_transporter_manage"
  on freight_offers for all
  using (transporter_id = public.current_profile_id())
  with check (transporter_id = public.current_profile_id());
create policy "freight_parties_read"
  on freight_offers for select using (
    exists (
      select 1 from shipments s
      where s.id = freight_offers.shipment_id
        and (
          s.transporter_id = public.current_profile_id()
          or exists (
            select 1 from orders o
            where (o.id = s.order_id or o.shipment_id = s.id)
              and o.buyer_id = public.current_profile_id()
          )
          or exists (
            select 1 from orders o
            join companies c on c.id = o.seller_id
            where (o.id = s.order_id or o.shipment_id = s.id)
              and c.owner_id = public.current_profile_id()
          )
        )
    )
  );

-- ------------------------------------------------------------
-- SHIPMENT DOCUMENTS
-- ------------------------------------------------------------
alter table shipment_documents enable row level security;
drop policy if exists "Parties can read documents" on shipment_documents;

create policy "documents_parties_read"
  on shipment_documents for select using (
    exists (
      select 1 from shipments s
      where s.id = shipment_documents.shipment_id
        and (
          s.transporter_id = public.current_profile_id()
          or exists (
            select 1 from orders o
            where (o.id = s.order_id or o.shipment_id = s.id)
              and o.buyer_id = public.current_profile_id()
          )
          or exists (
            select 1 from orders o
            join companies c on c.id = o.seller_id
            where (o.id = s.order_id or o.shipment_id = s.id)
              and c.owner_id = public.current_profile_id()
          )
        )
    )
  );
create policy "documents_uploader_insert"
  on shipment_documents for insert
  with check (uploaded_by = public.current_profile_id());

-- ------------------------------------------------------------
-- REVIEWS
-- ------------------------------------------------------------
alter table reviews enable row level security;
drop policy if exists "Anyone can read reviews" on reviews;
drop policy if exists "Users can create reviews for own orders" on reviews;

create policy "reviews_public_read"
  on reviews for select using (true);
create policy "reviews_insert_own_orders"
  on reviews for insert with check (
    reviewer_id = public.current_profile_id()
    and exists (
      select 1 from orders o
      where o.id = reviews.order_id
        and (
          o.buyer_id = public.current_profile_id()
          or exists (
            select 1 from companies c
            where c.id = o.seller_id
              and c.owner_id = public.current_profile_id()
          )
        )
    )
  );

-- ------------------------------------------------------------
-- DISPUTES
-- ------------------------------------------------------------
alter table disputes enable row level security;
drop policy if exists "Parties can read disputes for own orders" on disputes;

create policy "disputes_parties_read"
  on disputes for select using (
    raised_by = public.current_profile_id()
    or exists (
      select 1 from orders o
      where o.id = disputes.order_id
        and (
          o.buyer_id = public.current_profile_id()
          or exists (
            select 1 from companies c
            where c.id = o.seller_id
              and c.owner_id = public.current_profile_id()
          )
        )
    )
  );
create policy "disputes_parties_insert"
  on disputes for insert with check (raised_by = public.current_profile_id());

-- ------------------------------------------------------------
-- AUDIT LOG (lecture admin, écriture service role uniquement)
-- ------------------------------------------------------------
alter table audit_log enable row level security;
drop policy if exists "Admins can read audit log" on audit_log;

create policy "audit_admin_read"
  on audit_log for select using (
    exists (
      select 1 from profiles p
      where p.auth_user_id = auth.uid() and p.role = 'admin'
    )
  );

-- ------------------------------------------------------------
-- STOCK RESERVATIONS
-- ------------------------------------------------------------
alter table stock_reservations enable row level security;
drop policy if exists "Sellers can read reservations for own products" on stock_reservations;

create policy "reservations_seller_read"
  on stock_reservations for select using (
    exists (
      select 1 from products p
      join companies c on c.id = p.seller_id
      where p.id = stock_reservations.product_id
        and c.owner_id = public.current_profile_id()
    )
  );

-- ============================================================
-- Vérification rapide (doit lister toutes les tables avec rowsecurity = true)
-- ============================================================
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
