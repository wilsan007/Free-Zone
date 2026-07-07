-- FreeZone Market Seed Data
-- Execute in Supabase SQL Editor after schema.sql

-- 1. Profiles
insert into profiles (email, full_name, phone, role, verification_status, preferred_lang) values
  ('contact@redseatrading.dj', 'Ahmed Ali', '+253 77 12 34 56', 'seller', 'verified', 'fr'),
  ('info@hornafricadist.dj', 'Yusuf Ibrahim', '+253 77 23 45 67', 'seller', 'verified', 'en'),
  ('sales@gulflinkimports.dj', 'Said Hassan', '+253 77 34 56 78', 'seller', 'verified', 'ar')
on conflict (email) do nothing;

-- 2. Companies
insert into companies (owner_id, name, name_am, name_ar, license_number, country, city, address, verified_on_site, rating_avg, rating_count, total_volume_usd)
select p.id, 'Red Sea Trading Co.', 'Red Sea Trading', 'Red Sea Trading',
       'DIFTZ-2024-0012', 'Djibouti', 'Djibouti Free Zone', 'Lot 12, DIFTZ, Djibouti',
       true, 4.70, 23, 1240000.00
from profiles p where p.email = 'contact@redseatrading.dj'
and not exists (select 1 from companies c where c.license_number = 'DIFTZ-2024-0012');

insert into companies (owner_id, name, name_am, name_ar, license_number, country, city, address, verified_on_site, rating_avg, rating_count, total_volume_usd)
select p.id, 'Horn of Africa Distributors', 'Horn of Africa', 'Horn of Africa',
       'DIFTZ-2024-0034', 'Djibouti', 'Djibouti Free Zone', 'Lot 27, DIFTZ, Djibouti',
       true, 4.50, 18, 890000.00
from profiles p where p.email = 'info@hornafricadist.dj'
and not exists (select 1 from companies c where c.license_number = 'DIFTZ-2024-0034');

insert into companies (owner_id, name, name_am, name_ar, license_number, country, city, address, verified_on_site, rating_avg, rating_count, total_volume_usd)
select p.id, 'Gulf Link Imports', 'Gulf Link', 'Gulf Link',
       'DIFTZ-2024-0056', 'Djibouti', 'Djibouti Free Zone', 'Lot 45, DIFTZ, Djibouti',
       false, 4.20, 7, 320000.00
from profiles p where p.email = 'sales@gulflinkimports.dj'
and not exists (select 1 from companies c where c.license_number = 'DIFTZ-2024-0056');

-- 3. Products
insert into products (seller_id, category_id, name_fr, name_en, name_am, name_ar, description_fr, description_en, hs_code, unit, unit_weight_kg, unit_volume_m3, images, stock_qty, reserved_qty, moq, price_ftl, price_ltl, currency, is_active, reliability_badge)
select c.id, cat.id, 'TV LED 43 Full HD', 'TV LED 43 Full HD', 'TV LED 43', 'TV LED 43',
  'TV LED 43 pouces Full HD', '43-inch Full HD LED TV',
  '8528.72', 'carton', 12.5, 0.08,
  array['https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800'],
  1200, 80, 10, 78.00, 95.00, 'USD', true, true
from companies c, categories cat
where c.license_number = 'DIFTZ-2024-0012' and cat.slug = 'electronics'
and not exists (select 1 from products p where p.hs_code = '8528.72' and p.seller_id = c.id);

insert into products (seller_id, category_id, name_fr, name_en, name_am, name_ar, description_fr, description_en, hs_code, unit, unit_weight_kg, unit_volume_m3, images, stock_qty, reserved_qty, moq, price_ftl, price_ltl, currency, is_active, reliability_badge)
select c.id, cat.id, 'Chargeur solaire 20W', 'Solar charger 20W', 'Solar charger', 'Solar charger',
  'Panneau solaire pliable 20W', 'Folding 20W solar panel',
  '8501.72', 'carton', 15.0, 0.05,
  array['https://images.unsplash.com/photo-1605758159397-2b1d2f2cda8a?w=800'],
  500, 25, 5, 320.00, 395.00, 'USD', true, true
from companies c, categories cat
where c.license_number = 'DIFTZ-2024-0012' and cat.slug = 'electronics'
and not exists (select 1 from products p where p.hs_code = '8501.72' and p.seller_id = c.id);

insert into products (seller_id, category_id, name_fr, name_en, name_am, name_ar, description_fr, description_en, hs_code, unit, unit_weight_kg, unit_volume_m3, images, stock_qty, reserved_qty, moq, price_ftl, price_ltl, currency, is_active, reliability_badge)
select c.id, cat.id, 'Ciment Portland 50kg', 'Portland cement 50kg', 'Cement 50kg', 'Cement 50kg',
  'Ciment Portland CEM I 42.5N', 'Portland cement CEM I 42.5N',
  '2523.29', 'palette', 2000.0, 1.2,
  array['https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=800'],
  350, 40, 5, 145.00, 175.00, 'USD', true, true
from companies c, categories cat
where c.license_number = 'DIFTZ-2024-0034' and cat.slug = 'construction'
and not exists (select 1 from products p where p.hs_code = '2523.29' and p.seller_id = c.id);

insert into products (seller_id, category_id, name_fr, name_en, name_am, name_ar, description_fr, description_en, hs_code, unit, unit_weight_kg, unit_volume_m3, images, stock_qty, reserved_qty, moq, price_ftl, price_ltl, currency, is_active, reliability_badge)
select c.id, cat.id, 'Tole galvanisee 0.5mm', 'Galvanized sheet 0.5mm', 'Galvanized sheet', 'Galvanized sheet',
  'Tole galvanisee 0.5mm 1220x2440mm', 'Galvanized sheet 0.5mm 1220x2440mm',
  '7210.49', 'bundle', 480.0, 0.15,
  array['https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800'],
  200, 10, 2, 680.00, 820.00, 'USD', true, false
from companies c, categories cat
where c.license_number = 'DIFTZ-2024-0034' and cat.slug = 'construction'
and not exists (select 1 from products p where p.hs_code = '7210.49' and p.seller_id = c.id);

insert into products (seller_id, category_id, name_fr, name_en, name_am, name_ar, description_fr, description_en, hs_code, unit, unit_weight_kg, unit_volume_m3, images, stock_qty, reserved_qty, moq, price_ftl, price_ltl, currency, is_active, reliability_badge)
select c.id, cat.id, 'Riz basmati 25kg', 'Basmati rice 25kg', 'Basmati rice', 'Basmati rice',
  'Riz basmati premium 25kg', 'Premium basmati rice 25kg',
  '1006.30', 'sac', 25.0, 0.03,
  array['https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800'],
  8000, 400, 20, 22.00, 28.00, 'USD', true, true
from companies c, categories cat
where c.license_number = 'DIFTZ-2024-0056' and cat.slug = 'food'
and not exists (select 1 from products p where p.hs_code = '1006.30' and p.seller_id = c.id);

insert into products (seller_id, category_id, name_fr, name_en, name_am, name_ar, description_fr, description_en, hs_code, unit, unit_weight_kg, unit_volume_m3, images, stock_qty, reserved_qty, moq, price_ftl, price_ltl, currency, is_active, reliability_badge)
select c.id, cat.id, 'T-shirt coton 180g', 'Cotton t-shirt 180g', 'Cotton t-shirt', 'Cotton t-shirt',
  'T-shirt 100% coton 180g', '100% cotton t-shirt 180g',
  '6109.10', 'carton', 18.0, 0.06,
  array['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800'],
  3000, 150, 10, 185.00, 230.00, 'USD', true, true
from companies c, categories cat
where c.license_number = 'DIFTZ-2024-0012' and cat.slug = 'textile'
and not exists (select 1 from products p where p.hs_code = '6109.10' and p.seller_id = c.id);

insert into products (seller_id, category_id, name_fr, name_en, name_am, name_ar, description_fr, description_en, hs_code, unit, unit_weight_kg, unit_volume_m3, images, stock_qty, reserved_qty, moq, price_ftl, price_ltl, currency, is_active, reliability_badge)
select c.id, cat.id, 'Cuisiniere gaz 2 feux', '2-burner gas stove', 'Gas stove', 'Gas stove',
  'Cuisiniere a gaz 2 feux', '2-burner gas stove',
  '7321.11', 'carton', 8.0, 0.04,
  array['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800'],
  600, 30, 5, 34.00, 42.00, 'USD', true, false
from companies c, categories cat
where c.license_number = 'DIFTZ-2024-0056' and cat.slug = 'household'
and not exists (select 1 from products p where p.hs_code = '7321.11' and p.seller_id = c.id);

insert into products (seller_id, category_id, name_fr, name_en, name_am, name_ar, description_fr, description_en, hs_code, unit, unit_weight_kg, unit_volume_m3, images, stock_qty, reserved_qty, moq, price_ftl, price_ltl, currency, is_active, reliability_badge)
select c.id, cat.id, 'Power bank 20000mAh', 'Power bank 20000mAh', 'Power bank', 'Power bank',
  'Power bank 20000mAh 2 USB', '20000mAh power bank 2 USB',
  '8507.60', 'carton', 10.0, 0.03,
  array['https://images.unsplash.com/photo-1609592424823-bd5b6b9c6c7d?w=800'],
  1500, 100, 10, 280.00, 345.00, 'USD', true, true
from companies c, categories cat
where c.license_number = 'DIFTZ-2024-0034' and cat.slug = 'electronics'
and not exists (select 1 from products p where p.hs_code = '8507.60' and p.seller_id = c.id);

-- 4. Consolidation pools
insert into consolidation_pools (destination, destination_city, product_category_compatible, status, max_weight_kg, max_volume_m3, current_weight_kg, current_volume_m3, fill_pct, deadline, estimated_departure)
select 'Ethiopia', 'Addis Ababa', 'electronics,textile,household', 'open', 24000.0, 80.0, 17280.0, 57.6, 72.0, '2025-07-10T23:59:59Z', '2025-07-09T08:00:00Z'
where not exists (select 1 from consolidation_pools where destination_city = 'Addis Ababa' and product_category_compatible = 'electronics,textile,household');

insert into consolidation_pools (destination, destination_city, product_category_compatible, status, max_weight_kg, max_volume_m3, current_weight_kg, current_volume_m3, fill_pct, deadline, estimated_departure)
select 'Ethiopia', 'Dire Dawa', 'food,construction', 'open', 24000.0, 80.0, 9600.0, 32.0, 40.0, '2025-07-14T23:59:59Z', '2025-07-13T08:00:00Z'
where not exists (select 1 from consolidation_pools where destination_city = 'Dire Dawa');

insert into consolidation_pools (destination, destination_city, product_category_compatible, status, max_weight_kg, max_volume_m3, current_weight_kg, current_volume_m3, fill_pct, deadline, estimated_departure)
select 'Ethiopia', 'Addis Ababa', 'food', 'open', 24000.0, 80.0, 21600.0, 72.0, 90.0, '2025-07-08T23:59:59Z', '2025-07-07T08:00:00Z'
where not exists (select 1 from consolidation_pools where destination_city = 'Addis Ababa' and product_category_compatible = 'food');
