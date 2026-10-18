-- Store multi-valued style and cut classifications as first-class garment fields.
-- Legacy scalar columns remain as the primary value for compatibility.
alter table public.garments
  add column if not exists styles text[] not null default '{}',
  add column if not exists cut_lengths text[] not null default '{}';

update public.garments
set styles = case
    when jsonb_typeof(extra_tags -> 'styles') = 'array'
      then array(select jsonb_array_elements_text(extra_tags -> 'styles'))
    when style is null then '{}'
    else array[style]
  end,
  cut_lengths = case
    when jsonb_typeof(extra_tags -> 'cuts') = 'array'
      then array(select jsonb_array_elements_text(extra_tags -> 'cuts'))
    when cut_length is null then '{}'
    else array[cut_length]
  end,
  extra_tags = coalesce(extra_tags, '{}'::jsonb) - 'styles' - 'cuts';

alter table public.garments drop constraint if exists garments_styles_check;
alter table public.garments add constraint garments_styles_check
  check (styles <@ array['casual', 'formal', 'sport', 'elegant', 'streetwear', 'party']::text[]);

alter table public.garments drop constraint if exists garments_cut_lengths_check;
alter table public.garments add constraint garments_cut_lengths_check
  check (cut_lengths <@ array['slim', 'regular', 'relaxed', 'oversized', 'cropped', 'long']::text[]);
