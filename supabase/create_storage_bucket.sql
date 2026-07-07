-- Script à exécuter dans Supabase SQL Editor
-- Crée le bucket de stockage pour les images de produits

-- 1. Créer le bucket (public pour que les images soient accessibles)
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- 2. Politique : tout le monde peut lire les images (public)
create policy "Public read access for product images"
on storage.objects for select
using (bucket_id = 'product-images');

-- 3. Politique : les utilisateurs authentifiés peuvent uploader
create policy "Authenticated users can upload product images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'product-images');

-- 4. Politique : les utilisateurs peuvent supprimer leurs propres images
create policy "Users can delete own product images"
on storage.objects for delete
to authenticated
using (bucket_id = 'product-images' and owner = auth.uid());
