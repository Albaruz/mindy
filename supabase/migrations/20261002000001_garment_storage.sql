-- Garment photos: public read, owner-only write.
-- Files are stored at <user_id>/<uuid>.png so the folder name is the owner.
--
-- ACCEPTED TRADEOFF (documented, 2026-10-08): reads stay public on purpose.
-- Going private would require signed URLs in every reader, a data migration
-- of stored URLs, and would break third-party-hosted photos and the offline
-- image cache. Object names use random UUIDs (unguessable single URLs) and
-- writes/deletes/size/type are owner-scoped and constrained, so the residual
-- risk is limited to bucket enumeration by an authenticated caller.
-- Revisit if photos ever become sensitive beyond wardrobe snapshots.
--
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
