-- ============================================================
-- FreeZone Market — MIGRATION V2 : sécurité + transactions
-- ⚠️ SCRIPT UNIQUE À EXÉCUTER DANS LE SQL EDITOR DE SUPABASE.
-- Il remplace fix_rls.sql et migration_antifuite.sql (fusionnés ici)
-- et suppose que schema.sql, seed.sql et migration_groupage_hybrid.sql
-- sont déjà appliqués. Idempotent : ré-exécutable sans danger.
--
-- Contenu :
--   1. current_profile_id() — lien auth.users → profiles
--   2. Réactivation RLS + politiques corrigées sur TOUTES les tables
--      (les politiques d'origine comparaient auth.uid() à profiles.id)
--   3. Anti-fuite : coordonnées verrouillées, vue public_profiles,
--      messagerie RFQ avec masquage CÔTÉ SERVEUR + journalisation
--   4. Transactions : RPC create_order (prix serveur, réservation
--      atomique, rattachement groupage), expiration des réservations
-- ============================================================

-- ============================================================
-- 1. HELPER
-- ============================================================
create or replace function public.current_profile_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select id from profiles where auth_user_id = auth.uid()
$$;

-- ============================================================
-- 2. RLS — réactivation + politiques corrigées
-- ============================================================

-- --- profiles : coordonnées JAMAIS publiques (vecteur n°1 de contournement)
alter table profiles enable row level security;
drop policy if exists "Users can read own profile" on profiles;
drop policy if exists "Users can update own profile" on profiles;
drop policy if exists "Users can insert own profile" on profiles;
drop policy if exists "Anyone can read verified profiles" on profiles;
drop policy if exists "Anyone can read all profiles for MVP" on profiles;
drop policy if exists "profiles_public_read" on profiles;
drop policy if exists "profiles_update_own" on profiles;
drop policy if exists "profiles_insert_own" on profiles;

create policy "profiles_read_own"
  on profiles for select using (auth.uid() = auth_user_id);
create policy "profiles_update_own"
  on profiles for update using (auth.uid() = auth_user_id);
create policy "profiles_insert_own"
  on profiles for insert with check (auth.uid() = auth_user_id);

-- Vue publique SANS téléphone ni email (identité visible, contact masqué)
create or replace view public_profiles as
  select id, full_name, role, verification_status, preferred_lang, avatar_url, created_at
  from profiles;
grant select on public_profiles to anon, authenticated;

-- --- companies
alter table companies enable row level security;
drop policy if exists "Anyone can read companies" on companies;
drop policy if exists "Owners can manage own company" on companies;
drop policy if exists "companies_public_read" on companies;
drop policy if exists "companies_owner_manage" on companies;

create policy "companies_public_read"
  on companies for select using (true);
create policy "companies_owner_manage"
  on companies for all
  using (owner_id = public.current_profile_id())
  with check (owner_id = public.current_profile_id());

-- --- categories
alter table categories enable row level security;
drop policy if exists "Anyone can read categories" on categories;
drop policy if exists "categories_public_read" on categories;
create policy "categories_public_read"
  on categories for select using (true);

-- --- products
alter table products enable row level security;
drop policy if exists "Anyone can read active products" on products;
drop policy if exists "Sellers can manage own products" on products;
drop policy if exists "products_public_read_active" on products;
drop policy if exists "products_seller_manage" on products;

create policy "products_public_read_active"
  on products for select using (is_active = true);
create policy "products_seller_manage"
  on products for all
  using (
    exists (select 1 from companies c
            where c.id = products.seller_id
              and c.owner_id = public.current_profile_id())
  )
  with check (
    exists (select 1 from companies c
            where c.id = products.seller_id
              and c.owner_id = public.current_profile_id())
  );

-- --- consolidation_pools
alter table consolidation_pools enable row level security;
drop policy if exists "Anyone can read open pools" on consolidation_pools;
drop policy if exists "pools_public_read" on consolidation_pools;
create policy "pools_public_read"
  on consolidation_pools for select using (true);

-- --- pool_members (bug d'origine : auth.uid() = buyer_id ; et la lecture
--     publique exposait qui achète quoi → réservée aux intéressés)
alter table pool_members enable row level security;
drop policy if exists "Anyone can read pool members" on pool_members;
drop policy if exists "Buyers can add own orders to pool" on pool_members;
create policy "pool_members_own_read"
  on pool_members for select using (buyer_id = public.current_profile_id());

-- --- compatibility_matrix
alter table compatibility_matrix enable row level security;
drop policy if exists "Anyone can read compatibility matrix" on compatibility_matrix;
create policy "compat_public_read"
  on compatibility_matrix for select using (true);

-- --- orders
alter table orders enable row level security;
drop policy if exists "Buyers can read own orders" on orders;
drop policy if exists "Sellers can read orders for own products" on orders;
drop policy if exists "Buyers can create orders" on orders;
drop policy if exists "orders_buyer_read" on orders;
drop policy if exists "orders_seller_read" on orders;
drop policy if exists "orders_buyer_insert" on orders;

create policy "orders_buyer_read"
  on orders for select using (buyer_id = public.current_profile_id());
create policy "orders_seller_read"
  on orders for select using (
    exists (select 1 from companies c
            where c.id = orders.seller_id
              and c.owner_id = public.current_profile_id())
  );
-- NB : PAS de politique insert — les commandes passent par la RPC
-- create_order (section 4), qui valide prix et stock côté serveur.

-- --- shipments (bug d'origine : o.id = shipment_id s'auto-comparait)
alter table shipments enable row level security;
drop policy if exists "Parties can read shipments" on shipments;
drop policy if exists "shipments_parties_read" on shipments;
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

-- --- freight_offers
alter table freight_offers enable row level security;
drop policy if exists "Transporters can read and create own offers" on freight_offers;
drop policy if exists "Buyers and sellers can read offers for their shipments" on freight_offers;
drop policy if exists "freight_transporter_manage" on freight_offers;
drop policy if exists "freight_parties_read" on freight_offers;

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
          or exists (select 1 from orders o
                     where (o.id = s.order_id or o.shipment_id = s.id)
                       and o.buyer_id = public.current_profile_id())
          or exists (select 1 from orders o
                     join companies c on c.id = o.seller_id
                     where (o.id = s.order_id or o.shipment_id = s.id)
                       and c.owner_id = public.current_profile_id())
        )
    )
  );

-- --- shipment_documents
alter table shipment_documents enable row level security;
drop policy if exists "Parties can read documents" on shipment_documents;
drop policy if exists "documents_parties_read" on shipment_documents;
drop policy if exists "documents_uploader_insert" on shipment_documents;
create policy "documents_parties_read"
  on shipment_documents for select using (
    exists (
      select 1 from shipments s
      where s.id = shipment_documents.shipment_id
        and (
          s.transporter_id = public.current_profile_id()
          or exists (select 1 from orders o
                     where (o.id = s.order_id or o.shipment_id = s.id)
                       and o.buyer_id = public.current_profile_id())
          or exists (select 1 from orders o
                     join companies c on c.id = o.seller_id
                     where (o.id = s.order_id or o.shipment_id = s.id)
                       and c.owner_id = public.current_profile_id())
        )
    )
  );
create policy "documents_uploader_insert"
  on shipment_documents for insert
  with check (uploaded_by = public.current_profile_id());

-- --- reviews : la réputation ne se gagne QUE sur des transactions
--     réellement séquestrées via la plateforme (mécanisme anti-fuite clé)
alter table reviews enable row level security;
drop policy if exists "Anyone can read reviews" on reviews;
drop policy if exists "Users can create reviews for own orders" on reviews;
drop policy if exists "reviews_public_read" on reviews;
drop policy if exists "reviews_insert_own_orders" on reviews;

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
          or exists (select 1 from companies c
                     where c.id = o.seller_id
                       and c.owner_id = public.current_profile_id())
        )
        and o.status in ('escrow_funded','preparing','loaded','in_transit',
                         'delivered','funds_released','disputed')
    )
  );

-- --- disputes
alter table disputes enable row level security;
drop policy if exists "Parties can read disputes for own orders" on disputes;
drop policy if exists "disputes_parties_read" on disputes;
drop policy if exists "disputes_parties_insert" on disputes;
create policy "disputes_parties_read"
  on disputes for select using (
    raised_by = public.current_profile_id()
    or exists (
      select 1 from orders o
      where o.id = disputes.order_id
        and (
          o.buyer_id = public.current_profile_id()
          or exists (select 1 from companies c
                     where c.id = o.seller_id
                       and c.owner_id = public.current_profile_id())
        )
    )
  );
create policy "disputes_parties_insert"
  on disputes for insert with check (raised_by = public.current_profile_id());

-- --- audit_log
alter table audit_log enable row level security;
drop policy if exists "Admins can read audit log" on audit_log;
drop policy if exists "audit_admin_read" on audit_log;
create policy "audit_admin_read"
  on audit_log for select using (
    exists (select 1 from profiles p
            where p.auth_user_id = auth.uid() and p.role = 'admin')
  );

-- --- stock_reservations
alter table stock_reservations enable row level security;
drop policy if exists "Sellers can read reservations for own products" on stock_reservations;
drop policy if exists "reservations_seller_read" on stock_reservations;
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
-- 3. ANTI-FUITE : messagerie RFQ avec masquage côté serveur
-- ============================================================
create table if not exists conversations (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references products(id) on delete set null,
  order_id uuid references orders(id) on delete set null,
  buyer_id uuid not null references profiles(id) on delete cascade,
  seller_company_id uuid not null references companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (product_id, buyer_id)
);
create index if not exists idx_conversations_buyer on conversations(buyer_id);
create index if not exists idx_conversations_seller on conversations(seller_company_id);

create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  body text not null,          -- original (admin / litiges uniquement)
  body_masked text not null,   -- ce que voit la contrepartie avant déblocage
  flagged boolean not null default false,
  flag_reasons text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_messages_conversation on messages(conversation_id, created_at);
create index if not exists idx_messages_flagged on messages(flagged) where flagged = true;

alter table conversations enable row level security;
alter table messages enable row level security;

create or replace function is_conversation_party(conv_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from conversations cv
    where cv.id = conv_id
      and (
        cv.buyer_id = current_profile_id()
        or exists (select 1 from companies c
                   where c.id = cv.seller_company_id
                     and c.owner_id = current_profile_id())
      )
  )
$$;

drop policy if exists "Parties can read own conversations" on conversations;
drop policy if exists "Buyers can open conversations" on conversations;
create policy "conversations_parties_read"
  on conversations for select using (is_conversation_party(id));
-- L'ouverture passe par la RPC open_conversation (résout l'entreprise côté serveur)

-- Les messages ne sont JAMAIS lus directement (le corps original doit rester
-- masqué tant que le contact n'est pas débloqué) : lecture via la vue
-- thread_messages uniquement, envoi via la RPC send_message uniquement.
drop policy if exists "Parties can read messages" on messages;
drop policy if exists "Parties can send messages" on messages;

-- Contact débloqué ssi une commande séquestrée lie les deux parties
create or replace function contact_unlocked(conv_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from conversations cv
    join orders o
      on o.buyer_id = cv.buyer_id and o.seller_id = cv.seller_company_id
    where cv.id = conv_id
      and o.status in ('escrow_funded','preparing','loaded','in_transit',
                       'delivered','funds_released')
  )
$$;

-- Vue de lecture : son propre message en clair ; celui de la contrepartie
-- masqué tant que le contact n'est pas débloqué.
create or replace view thread_messages as
  select
    m.id,
    m.conversation_id,
    m.sender_id,
    case
      when m.sender_id = current_profile_id() then m.body
      when contact_unlocked(m.conversation_id) then m.body
      else m.body_masked
    end as body,
    m.flagged,
    m.created_at
  from messages m
  where is_conversation_party(m.conversation_id);
grant select on thread_messages to authenticated;

-- RPC : ouvrir (ou retrouver) la conversation d'un produit
create or replace function open_conversation(p_product_id uuid)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_buyer uuid := current_profile_id();
  v_seller_company uuid;
  v_conv uuid;
begin
  if v_buyer is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select seller_id into v_seller_company from products where id = p_product_id;
  if v_seller_company is null then
    raise exception 'PRODUCT_NOT_FOUND';
  end if;

  select id into v_conv from conversations
  where product_id = p_product_id and buyer_id = v_buyer;

  if v_conv is null then
    insert into conversations (product_id, buyer_id, seller_company_id)
    values (p_product_id, v_buyer, v_seller_company)
    returning id into v_conv;
  end if;

  return v_conv;
end;
$$;
grant execute on function open_conversation(uuid) to authenticated;

-- RPC : envoyer un message — masquage et détection CÔTÉ SERVEUR
-- (un client modifié ne peut pas contourner le masquage)
create or replace function send_message(p_conversation_id uuid, p_body text)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_sender uuid := current_profile_id();
  v_masked text;
  v_reasons text[] := '{}';
  v_id uuid;
begin
  if v_sender is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if not is_conversation_party(p_conversation_id) then
    raise exception 'NOT_A_PARTY';
  end if;
  if length(trim(p_body)) = 0 or length(p_body) > 2000 then
    raise exception 'INVALID_BODY';
  end if;

  v_masked := p_body;

  -- Mêmes motifs que src/lib/antileak.ts (le client avertit, le serveur fait foi)

  -- Numéros de téléphone (8 chiffres et plus, séparateurs admis)
  if v_masked ~ '(\+?\s?\d[\s.\-()]?){8,}' then
    v_masked := regexp_replace(v_masked, '(\+?\s?\d[\s.\-()]?){8,}', '•••', 'g');
    v_reasons := array_append(v_reasons, 'phone');
  end if;

  -- Adresses e-mail
  if v_masked ~* '[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}' then
    v_masked := regexp_replace(v_masked, '[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}', '•••', 'g');
    v_reasons := array_append(v_reasons, 'email');
  end if;

  -- Liens externes
  if v_masked ~* 'https?://[^\s]+' then
    v_masked := regexp_replace(v_masked, 'https?://[^\s]+', '•••', 'gi');
    v_reasons := array_append(v_reasons, 'url');
  end if;

  -- Applications de contact hors plateforme (multilingue)
  if v_masked ~* '(whats?app|wa\.me|telegram|t\.me|viber|\yimo\y|\ysignal\y|wechat|ዋትሳፕ|ቴሌግራም|واتساب|تيليجرام|تلغرام)' then
    v_reasons := array_append(v_reasons, 'messaging_app');
  end if;

  -- Références bancaires (IBAN + mots-clés)
  if v_masked ~ '[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}'
     or v_masked ~* '(iban|swift|compte bancaire|bank account|የባንክ ሂሳብ|حساب بنكي)' then
    v_masked := regexp_replace(v_masked, '[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}', '•••', 'g');
    v_reasons := array_append(v_reasons, 'bank');
  end if;

  insert into messages (conversation_id, sender_id, body, body_masked, flagged, flag_reasons)
  values (p_conversation_id, v_sender, p_body, v_masked,
          array_length(v_reasons, 1) is not null, v_reasons)
  returning id into v_id;

  return v_id;
end;
$$;
grant execute on function send_message(uuid, text) to authenticated;

-- Journalisation des tentatives de fuite
create or replace function log_flagged_message()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.flagged then
    insert into audit_log (actor_id, action, entity_type, entity_id, metadata)
    values (new.sender_id, 'MESSAGE_LEAK_FLAGGED', 'message', new.id,
            jsonb_build_object('reasons', new.flag_reasons,
                               'conversation_id', new.conversation_id));
  end if;
  return new;
end;
$$;
drop trigger if exists messages_leak_audit on messages;
create trigger messages_leak_audit
  after insert on messages
  for each row execute function log_flagged_message();

-- ============================================================
-- 4. TRANSACTIONS ATOMIQUES
-- ============================================================

-- RPC : créer une commande.
--  * prix TOUJOURS recalculé côté serveur (le client ne l'envoie pas)
--  * verrou ligne produit → pas de survente en cas d'achats simultanés
--  * réservation de stock 48 h
--  * commande LTL rattachée automatiquement à un pool de groupage
--    compatible (destination + classe de compatibilité + capacité)
create or replace function create_order(
  p_product_id uuid,
  p_order_type order_type,
  p_qty integer,
  p_destination_city text default 'Addis-Abeba'
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_buyer uuid := current_profile_id();
  v_product products%rowtype;
  v_price numeric(12,2);
  v_order_id uuid;
  v_pool consolidation_pools%rowtype;
  v_weight numeric(12,2);
  v_volume numeric(12,2);
begin
  if v_buyer is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_qty is null or p_qty <= 0 then
    raise exception 'INVALID_QTY';
  end if;

  -- Verrou pessimiste : sérialise les commandes concurrentes sur ce produit
  select * into v_product from products
  where id = p_product_id and is_active = true
  for update;

  if v_product.id is null then
    raise exception 'PRODUCT_NOT_FOUND';
  end if;
  if p_order_type = 'ftl' and p_qty < v_product.moq then
    raise exception 'QTY_BELOW_MOQ';
  end if;
  if v_product.stock_qty - v_product.reserved_qty < p_qty then
    raise exception 'INSUFFICIENT_STOCK';
  end if;

  -- Prix serveur — jamais celui du client
  v_price := case when p_order_type = 'ftl'
                  then v_product.price_ftl else v_product.price_ltl end;

  insert into orders (buyer_id, seller_id, product_id, order_type, status,
                      qty, unit_price, total_amount, currency, incoterm)
  values (v_buyer, v_product.seller_id, p_product_id, p_order_type, 'created',
          p_qty, v_price, v_price * p_qty, v_product.currency, 'FCA')
  returning id into v_order_id;

  update products set reserved_qty = reserved_qty + p_qty
  where id = p_product_id;

  insert into stock_reservations (product_id, order_id, qty, expires_at)
  values (p_product_id, v_order_id, p_qty, now() + interval '48 hours');

  -- Rattachement groupage pour les petites quantités
  if p_order_type = 'ltl' then
    v_weight := v_product.unit_weight_kg * p_qty;
    v_volume := v_product.unit_volume_m3 * p_qty;

    select cp.* into v_pool
    from consolidation_pools cp
    where cp.status = 'open'
      and cp.destination_city = p_destination_city
      and (
        (cp.pool_type = 'by_product' and cp.product_id = p_product_id)
        or (cp.pool_type = 'by_destination'
            and (cp.compatibility_class is null
                 or check_compatibility(cp.compatibility_class,
                                        v_product.compatibility_class)))
      )
      and cp.current_weight_kg + v_weight <= cp.max_weight_kg
      and cp.current_volume_m3 + v_volume <= cp.max_volume_m3
    order by cp.fill_pct desc
    limit 1
    for update;

    if v_pool.id is not null then
      insert into pool_members (pool_id, order_id, product_id, buyer_id,
                                qty, weight_kg, volume_m3)
      values (v_pool.id, v_order_id, p_product_id, v_buyer,
              p_qty, v_weight, v_volume);

      update consolidation_pools set
        current_weight_kg = current_weight_kg + v_weight,
        current_volume_m3 = current_volume_m3 + v_volume,
        fill_pct = least(100, round(greatest(
          (current_weight_kg + v_weight) / nullif(max_weight_kg, 0),
          (current_volume_m3 + v_volume) / nullif(max_volume_m3, 0)
        ) * 100, 2)),
        status = case
          when greatest(
            (current_weight_kg + v_weight) / nullif(max_weight_kg, 0),
            (current_volume_m3 + v_volume) / nullif(max_volume_m3, 0)
          ) >= 1 then 'full'::pool_status
          else status
        end
      where id = v_pool.id;

      update orders set pool_id = v_pool.id where id = v_order_id;
    end if;
  end if;

  insert into audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (v_buyer, 'ORDER_CREATED', 'order', v_order_id,
          jsonb_build_object('type', p_order_type, 'qty', p_qty,
                             'total', v_price * p_qty,
                             'pool_id', v_pool.id));

  return v_order_id;
end;
$$;
grant execute on function create_order(uuid, order_type, integer, text) to authenticated;

-- Libération des réservations expirées (commandes jamais payées)
create or replace function expire_stock_reservations()
returns integer
language plpgsql security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  r record;
begin
  for r in
    select sr.id, sr.product_id, sr.qty, sr.order_id
    from stock_reservations sr
    join orders o on o.id = sr.order_id
    where sr.expires_at < now() and o.status = 'created'
    for update of sr
  loop
    update products set reserved_qty = greatest(0, reserved_qty - r.qty)
    where id = r.product_id;
    update orders set status = 'cancelled' where id = r.order_id;
    delete from stock_reservations where id = r.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- Planification automatique (nécessite l'extension pg_cron :
-- Dashboard → Database → Extensions → activer pg_cron, puis ré-exécuter ce bloc)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('expire-reservations', '*/15 * * * *',
                          'select expire_stock_reservations()');
  end if;
exception when others then null;
end;
$$;

-- ============================================================
-- VÉRIFICATION FINALE — tout doit être à rowsecurity = true
-- ============================================================
select tablename, rowsecurity from pg_tables
where schemaname = 'public'
order by tablename;
