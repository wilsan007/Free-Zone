-- ============================================================
-- FreeZone Market — Schéma base de données Supabase / PostgreSQL
-- Version 0.1 — MVP Phase 1
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. PROFILES (utilisateurs — liés à auth.users)
-- ============================================================
create type user_role as enum ('seller', 'buyer_bulk', 'buyer_small', 'transporter', 'admin');
create type verification_status as enum ('pending', 'verified', 'rejected', 'suspended');

create table profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email text not null unique,
  full_name text not null,
  phone text,
  role user_role not null default 'buyer_small',
  verification_status verification_status not null default 'pending',
  preferred_lang text not null default 'fr' check (preferred_lang in ('fr','en','am','ar')),
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select using (auth.uid() = auth_user_id);
create policy "Users can update own profile"
  on profiles for update using (auth.uid() = auth_user_id);
create policy "Anyone can read verified profiles"
  on profiles for select using (verification_status = 'verified');
create policy "Anyone can read all profiles for MVP"
  on profiles for select using (true);

-- ============================================================
-- 2. COMPANIES (entreprises des vendeurs / transporteurs)
-- ============================================================
create table companies (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  name_am text,
  name_ar text,
  license_number text not null,
  country text not null default 'Djibouti',
  city text not null,
  address text,
  warehouse_photos text[],
  verified_on_site boolean not null default false,
  rating_avg numeric(3,2) not null default 0,
  rating_count integer not null default 0,
  total_volume_usd numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create index idx_companies_owner on companies(owner_id);

alter table companies enable row level security;

create policy "Anyone can read companies"
  on companies for select using (true);
create policy "Owners can manage own company"
  on companies for all using (auth.uid() = owner_id);

-- ============================================================
-- 3. CATEGORIES
-- ============================================================
create table categories (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  name_fr text not null,
  name_en text not null,
  name_am text not null,
  name_ar text not null,
  icon text
);

alter table categories enable row level security;
create policy "Anyone can read categories"
  on categories for select using (true);

-- ============================================================
-- 4. PRODUCTS
-- ============================================================
create type incoterm_type as enum ('EXW', 'FCA', 'DAP');

create table products (
  id uuid primary key default uuid_generate_v4(),
  seller_id uuid not null references companies(id) on delete cascade,
  category_id uuid not null references categories(id) on delete restrict,
  name_fr text not null,
  name_en text not null,
  name_am text,
  name_ar text,
  description_fr text,
  description_en text,
  hs_code text,
  unit text not null default 'carton',
  unit_weight_kg numeric(10,3) not null default 0,
  unit_volume_m3 numeric(10,4) not null default 0,
  images text[] not null default '{}',
  stock_qty integer not null default 0,
  reserved_qty integer not null default 0,
  moq integer not null default 1,
  price_ftl numeric(12,2) not null,
  price_ltl numeric(12,2) not null,
  currency text not null default 'USD',
  is_active boolean not null default true,
  reliability_badge boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_non_negative check (stock_qty >= 0),
  constraint reserved_le_stock check (reserved_qty <= stock_qty),
  constraint prices_positive check (price_ftl > 0 and price_ltl > 0)
);

create index idx_products_seller on products(seller_id);
create index idx_products_category on products(category_id);
create index idx_products_active on products(is_active) where is_active = true;

alter table products enable row level security;

create policy "Anyone can read active products"
  on products for select using (is_active = true);
create policy "Sellers can manage own products"
  on products for all using (
    exists (
      select 1 from companies c
      where c.id = products.seller_id and c.owner_id = auth.uid()
    )
  );

-- Trigger: update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger products_updated_at
  before update on products
  for each row execute function update_updated_at();

-- ============================================================
-- 5. CONSOLIDATION POOLS (groupage)
-- ============================================================
create type pool_status as enum ('open', 'full', 'dispatched', 'closed');

create table consolidation_pools (
  id uuid primary key default uuid_generate_v4(),
  destination text not null default 'Ethiopia',
  destination_city text not null,
  product_category_compatible text not null,
  status pool_status not null default 'open',
  max_weight_kg numeric(12,2) not null,
  max_volume_m3 numeric(12,2) not null,
  current_weight_kg numeric(12,2) not null default 0,
  current_volume_m3 numeric(12,2) not null default 0,
  fill_pct numeric(5,2) not null default 0,
  deadline timestamptz not null,
  estimated_departure timestamptz,
  created_at timestamptz not null default now()
);

create index idx_pools_status on consolidation_pools(status);
create index idx_pools_destination on consolidation_pools(destination_city);

alter table consolidation_pools enable row level security;
create policy "Anyone can read open pools"
  on consolidation_pools for select using (true);

-- ============================================================
-- 6. ORDERS
-- ============================================================
create type order_type as enum ('ftl', 'ltl');
create type order_status as enum (
  'created', 'escrow_funded', 'preparing', 'loaded',
  'in_transit', 'delivered', 'funds_released', 'disputed', 'cancelled'
);

create table orders (
  id uuid primary key default uuid_generate_v4(),
  buyer_id uuid not null references profiles(id) on delete restrict,
  seller_id uuid not null references companies(id) on delete restrict,
  product_id uuid not null references products(id) on delete restrict,
  order_type order_type not null,
  status order_status not null default 'created',
  qty integer not null check (qty > 0),
  unit_price numeric(12,2) not null check (unit_price > 0),
  total_amount numeric(14,2) not null check (total_amount > 0),
  currency text not null default 'USD',
  incoterm incoterm_type not null default 'FCA',
  pool_id uuid references consolidation_pools(id) on delete set null,
  shipment_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_orders_buyer on orders(buyer_id);
create index idx_orders_seller on orders(seller_id);
create index idx_orders_status on orders(status);
create index idx_orders_pool on orders(pool_id);

alter table orders enable row level security;

create policy "Buyers can read own orders"
  on orders for select using (auth.uid() = buyer_id);
create policy "Sellers can read orders for own products"
  on orders for select using (
    exists (
      select 1 from companies c
      where c.id = orders.seller_id and c.owner_id = auth.uid()
    )
  );
create policy "Buyers can create orders"
  on orders for insert with check (auth.uid() = buyer_id);

create trigger orders_updated_at
  before update on orders
  for each row execute function update_updated_at();

-- ============================================================
-- 7. SHIPMENTS
-- ============================================================
create type shipment_status as enum (
  'pending', 'loaded', 'exited_free_zone', 'at_border',
  'customs_cleared', 'in_transit', 'delivered'
);

create table shipments (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references orders(id) on delete set null,
  pool_id uuid references consolidation_pools(id) on delete set null,
  transporter_id uuid references profiles(id) on delete set null,
  status shipment_status not null default 'pending',
  origin text not null default 'Djibouti Free Zone',
  destination text not null,
  incoterm incoterm_type not null default 'FCA',
  freight_cost numeric(12,2),
  currency text not null default 'USD',
  tracking_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_shipments_order on shipments(order_id);
create index idx_shipments_transporter on shipments(transporter_id);

alter table shipments enable row level security;

create policy "Parties can read shipments"
  on shipments for select using (
    auth.uid() = transporter_id
    or exists (select 1 from orders o where o.id = shipment_id and o.buyer_id = auth.uid())
    or exists (
      select 1 from orders o
      join companies c on c.id = o.seller_id
      where o.id = shipment_id and c.owner_id = auth.uid()
    )
  );

-- ============================================================
-- 8. FREIGHT OFFERS
-- ============================================================
create type freight_status as enum ('open', 'assigned', 'completed', 'cancelled');

create table freight_offers (
  id uuid primary key default uuid_generate_v4(),
  shipment_id uuid not null references shipments(id) on delete cascade,
  transporter_id uuid not null references profiles(id) on delete cascade,
  offered_price numeric(12,2) not null check (offered_price > 0),
  currency text not null default 'USD',
  status freight_status not null default 'open',
  created_at timestamptz not null default now()
);

create index idx_freight_shipment on freight_offers(shipment_id);

alter table freight_offers enable row level security;

create policy "Transporters can read and create own offers"
  on freight_offers for all using (auth.uid() = transporter_id);
create policy "Buyers and sellers can read offers for their shipments"
  on freight_offers for select using (
    exists (
      select 1 from shipments s
      where s.id = freight_offers.shipment_id
      and (
        s.transporter_id = auth.uid()
        or exists (select 1 from orders o where o.id = s.order_id and o.buyer_id = auth.uid())
        or exists (
          select 1 from orders o
          join companies c on c.id = o.seller_id
          where o.id = s.order_id and c.owner_id = auth.uid()
        )
      )
    )
  );

-- ============================================================
-- 9. SHIPMENT DOCUMENTS
-- ============================================================
create type doc_type as enum (
  'commercial_invoice', 'packing_list', 'certificate_of_origin',
  'exit_declaration', 't1_transit', 'import_declaration',
  'e_cmr', 'other'
);

create table shipment_documents (
  id uuid primary key default uuid_generate_v4(),
  shipment_id uuid not null references shipments(id) on delete cascade,
  doc_type doc_type not null,
  file_url text not null,
  uploaded_by uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index idx_docs_shipment on shipment_documents(shipment_id);

alter table shipment_documents enable row level security;

create policy "Parties can read documents"
  on shipment_documents for select using (
    exists (
      select 1 from shipments s
      where s.id = shipment_documents.shipment_id
      and (
        s.transporter_id = auth.uid()
        or exists (select 1 from orders o where o.id = s.order_id and o.buyer_id = auth.uid())
        or exists (
          select 1 from orders o
          join companies c on c.id = o.seller_id
          where o.id = s.order_id and c.owner_id = auth.uid()
        )
      )
    )
  );

-- ============================================================
-- 10. REVIEWS
-- ============================================================
create table reviews (
  id uuid primary key default uuid_generate_v4(),
  reviewer_id uuid not null references profiles(id) on delete cascade,
  reviewed_entity_id uuid not null,
  entity_type text not null check (entity_type in ('seller','buyer','transporter')),
  order_id uuid references orders(id) on delete set null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz not null default now()
);

create index idx_reviews_entity on reviews(reviewed_entity_id, entity_type);

alter table reviews enable row level security;

create policy "Anyone can read reviews"
  on reviews for select using (true);
create policy "Users can create reviews for own orders"
  on reviews for insert with check (
    auth.uid() = reviewer_id
    and exists (
      select 1 from orders o
      where o.id = reviews.order_id
      and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
    )
  );

-- ============================================================
-- 11. DISPUTES
-- ============================================================
create type dispute_status as enum ('open', 'under_review', 'resolved', 'escalated');

create table disputes (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  raised_by uuid not null references profiles(id) on delete cascade,
  reason text not null,
  status dispute_status not null default 'open',
  resolution text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table disputes enable row level security;

create policy "Parties can read disputes for own orders"
  on disputes for select using (
    auth.uid() = raised_by
    or exists (
      select 1 from orders o
      where o.id = disputes.order_id
      and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
    )
  );

-- ============================================================
-- 12. AUDIT LOG (immuable)
-- ============================================================
create table audit_log (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_actor on audit_log(actor_id);
create index idx_audit_entity on audit_log(entity_type, entity_id);

alter table audit_log enable row level security;
-- Audit log is admin-only
create policy "Admins can read audit log"
  on audit_log for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ============================================================
-- 13. STOCK RESERVATIONS (pour éviter la survente)
-- ============================================================
create table stock_reservations (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  order_id uuid references orders(id) on delete cascade,
  qty integer not null check (qty > 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index idx_reservations_product on stock_reservations(product_id);
create index idx_reservations_expires on stock_reservations(expires_at);

alter table stock_reservations enable row level security;

create policy "Sellers can read reservations for own products"
  on stock_reservations for select using (
    exists (
      select 1 from products p
      join companies c on c.id = p.seller_id
      where p.id = stock_reservations.product_id and c.owner_id = auth.uid()
    )
  );

-- ============================================================
-- SEED DATA
-- ============================================================
insert into categories (slug, name_fr, name_en, name_am, name_ar, icon) values
  ('electronics', 'Électronique', 'Electronics', 'ኤሌክትሮኒክስ', 'إلكترونيات', '📱'),
  ('construction', 'Matériaux de construction', 'Construction materials', 'ግንባታ ቁሶች', 'مواد البناء', '🧱'),
  ('food', 'Alimentaire sec', 'Dry food', 'ደረቅ ምግባር', 'أغذية جافة', '🍚'),
  ('textile', 'Textile', 'Textile', 'ጨርቅ', 'نسيج', '👕'),
  ('household', 'Articles ménagers', 'Household goods', 'የቤት ዕቃዎች', 'أدوات منزلية', '🏠')
on conflict (slug) do nothing;
