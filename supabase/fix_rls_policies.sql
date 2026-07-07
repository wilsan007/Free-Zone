-- ============================================================
-- Correction des politiques RLS
-- Le problème: companies.owner_id référence profiles.id
-- mais auth.uid() retourne auth.users.id
-- Solution: joindre via profiles.auth_user_id
-- ============================================================

-- 1. Products: remplacer la policy "Sellers can manage own products"
drop policy if exists "Sellers can manage own products" on products;

create policy "Sellers can manage own products"
  on products for all using (
    exists (
      select 1 from companies c
      join profiles p on p.id = c.owner_id
      where c.id = products.seller_id and p.auth_user_id = auth.uid()
    )
  );

-- 2. Orders: "Sellers can read orders for own products"
drop policy if exists "Sellers can read orders for own products" on orders;

create policy "Sellers can read orders for own products"
  on orders for select using (
    exists (
      select 1 from companies c
      join profiles p on p.id = c.owner_id
      where c.id = orders.seller_id and p.auth_user_id = auth.uid()
    )
  );

-- 3. Orders: "Sellers can update orders for own products"
drop policy if exists "Sellers can update orders for own products" on orders;

create policy "Sellers can update orders for own products"
  on orders for update using (
    exists (
      select 1 from companies c
      join profiles p on p.id = c.owner_id
      where c.id = orders.seller_id and p.auth_user_id = auth.uid()
    )
  );

-- 4. Stock reservations: "Sellers can read reservations for own products"
drop policy if exists "Sellers can read reservations for own products" on stock_reservations;

create policy "Sellers can read reservations for own products"
  on stock_reservations for select using (
    exists (
      select 1 from products pr
      join companies c on c.id = pr.seller_id
      join profiles p on p.id = c.owner_id
      where pr.id = stock_reservations.product_id and p.auth_user_id = auth.uid()
    )
  );

-- 5. Companies: permettre aux owners de lire et modifier leur company
drop policy if exists "Owners can read own company" on companies;
drop policy if exists "Owners can update own company" on companies;

create policy "Owners can read own company"
  on companies for select using (
    exists (
      select 1 from profiles p
      where p.id = companies.owner_id and p.auth_user_id = auth.uid()
    )
  );

create policy "Owners can update own company"
  on companies for update using (
    exists (
      select 1 from profiles p
      where p.id = companies.owner_id and p.auth_user_id = auth.uid()
    )
  );

-- 6. Orders: politiques pour les buyers (buyer_id = profiles.id, pas auth.users.id)
drop policy if exists "Buyers can read own orders" on orders;

create policy "Buyers can read own orders"
  on orders for select using (
    exists (
      select 1 from profiles p
      where p.id = orders.buyer_id and p.auth_user_id = auth.uid()
    )
  );

drop policy if exists "Buyers can create orders" on orders;

create policy "Buyers can create orders"
  on orders for insert with check (
    exists (
      select 1 from profiles p
      where p.id = orders.buyer_id and p.auth_user_id = auth.uid()
    )
  );

-- 7. Orders: sellers peuvent update les commandes de leurs produits
drop policy if exists "Sellers can update order status" on orders;

create policy "Sellers can update order status"
  on orders for update using (
    exists (
      select 1 from companies c
      join profiles p on p.id = c.owner_id
      where c.id = orders.seller_id and p.auth_user_id = auth.uid()
    )
  );

-- 8. Vérification
select 'RLS policies fixed' as status;
