-- Harden the garments bucket: cap object size at 10 MB (mirrors the app's
-- MAX_FILE_SIZE_BYTES) and allow only PNG (the upload pipeline re-encodes
-- every photo to PNG via canvas, so legitimate uploads always match).
-- Zero breakage: read/write policies are untouched.
--
-- Apply with: supabase db push  (or paste into the Supabase SQL editor).
-- Dashboard alternative: Storage -> garments bucket -> Edit bucket ->
-- set file size limit + allowed MIME types.

update storage.buckets
set file_size_limit = 10485760,
  allowed_mime_types = array['image/png']
where id = 'garments';
