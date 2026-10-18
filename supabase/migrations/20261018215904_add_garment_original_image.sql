-- Keep the user-uploaded photo when a processed display image is generated.
alter table public.garments
  add column if not exists original_image_url text;

update public.garments
set original_image_url = image_url
where original_image_url is null;
