-- Private garment photos: public read, owner-only write.
-- Files are stored at <user_id>/<uuid>.png so the folder name is the owner.
-- Apply with: supabase db push (or paste into the Supabase SQL editor).

insert into storage.buckets (id, name, public)
values ('garments', 'garments', true)
on conflict (id) do nothing;

drop policy if exists "garments_storage_public_read" on storage.objects;
create policy "garments_storage_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'garments');

drop policy if exists "garments_storage_insert_own" on storage.objects;
create policy "garments_storage_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'garments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "garments_storage_update_own" on storage.objects;
create policy "garments_storage_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'garments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'garments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "garments_storage_delete_own" on storage.objects;
create policy "garments_storage_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'garments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
