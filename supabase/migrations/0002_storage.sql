-- Public bucket for farm photos. Only the owner of a listing (or an admin) can add or remove
-- files, and files must live under a folder named after that listing's id: <farm_id>/<file>.jpg
-- Not covered by `npm run test:sql` (needs Supabase's storage schema).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('farm-photos', 'farm-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Anyone can view farm photos" on storage.objects for select
  using (bucket_id = 'farm-photos');

create policy "Owners add photos to their listings" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'farm-photos'
    and ((storage.foldername(name))[1] in (select id::text from public.farms where owner_id = auth.uid())
         or public.is_admin())
  );

create policy "Owners update photos on their listings" on storage.objects for update to authenticated
  using (
    bucket_id = 'farm-photos'
    and ((storage.foldername(name))[1] in (select id::text from public.farms where owner_id = auth.uid())
         or public.is_admin())
  );

create policy "Owners delete photos on their listings" on storage.objects for delete to authenticated
  using (
    bucket_id = 'farm-photos'
    and ((storage.foldername(name))[1] in (select id::text from public.farms where owner_id = auth.uid())
         or public.is_admin())
  );
