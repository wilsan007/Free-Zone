-- Script à exécuter dans Supabase SQL Editor
-- Définit les mots de passe, crée les profils et assigne les rôles

-- 1. Définir les mots de passe pour test1, test2 et zdouce
update auth.users
set encrypted_password = crypt('FreeZone2024!', gen_salt('bf')),
    email_confirmed_at = now()
where email in ('test1@demo.dj', 'test2@demo.dj', 'zdouce.zz@gmail.com');

-- 2. Assigner les rôles et créer les profils

-- test1@demo.dj → VENDEUR (seller)
insert into profiles (auth_user_id, email, full_name, phone, role, verification_status, preferred_lang)
select id, email, 'Vendeur Test', '+253 77 00 00 01', 'seller', 'verified', 'fr'
from auth.users
where email = 'test1@demo.dj'
and not exists (select 1 from profiles p where p.auth_user_id = auth.users.id);

-- Créer une company pour le vendeur test1
insert into companies (owner_id, name, name_am, name_ar, license_number, country, city, address, verified_on_site, rating_avg, rating_count, total_volume_usd)
select p.id, 'Vendeur Test Co.', 'Vendeur Test', 'Vendeur Test',
       'DIFTZ-2024-TEST', 'Djibouti', 'Djibouti Free Zone', 'Lot Test, DIFTZ',
       true, 5.00, 1, 0
from profiles p
where p.email = 'test1@demo.dj'
and not exists (select 1 from companies c where c.license_number = 'DIFTZ-2024-TEST');

-- test2@demo.dj → IMPORTATEUR (buyer_bulk)
insert into profiles (auth_user_id, email, full_name, phone, role, verification_status, preferred_lang)
select id, email, 'Importateur Test', '+251 91 00 00 02', 'buyer_bulk', 'verified', 'fr'
from auth.users
where email = 'test2@demo.dj'
and not exists (select 1 from profiles p where p.auth_user_id = auth.users.id);

-- zdouce.zz@gmail.com → GROUPAGE (buyer_small)
-- Met à jour le profil existant si besoin
update profiles
set role = 'buyer_small',
    verification_status = 'verified'
where email = 'zdouce.zz@gmail.com';

-- Si le profil n'existe pas encore, le créer
insert into profiles (auth_user_id, email, full_name, phone, role, verification_status, preferred_lang)
select id, email, 'Awaleh Osman', '+253 77 00 00 03', 'buyer_small', 'verified', 'fr'
from auth.users
where email = 'zdouce.zz@gmail.com'
and not exists (select 1 from profiles p where p.auth_user_id = auth.users.id);

-- 3. Vérification
select au.email, p.full_name, p.role, p.verification_status
from auth.users au
left join profiles p on p.auth_user_id = au.id
where au.email in ('test1@demo.dj', 'test2@demo.dj', 'zdouce.zz@gmail.com');
