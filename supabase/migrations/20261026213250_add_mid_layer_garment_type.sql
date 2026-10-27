-- Add a washable mid-layer garment type and reclassify existing garments
-- whose specific type identifies them as cardigans or vests.
--
-- The specificType detail is intentionally preserved. Ambiguous garments
-- (for example, generic jackets) remain outerwear and are not guessed.

alter table public.garments
  drop constraint if exists garments_garment_type_check;

update public.garments
set garment_type = 'mid_layer',
    extra_tags = case
      when extra_tags ->> 'aiCategory' = 'outerwear'
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('aiCategory', 'mid_layer')
      else coalesce(extra_tags, '{}'::jsonb)
    end
where lower(btrim(extra_tags ->> 'specificType')) in (
    'cardigan',
    'cardigans',
    'long cardigan',
    'open-front cardigan',
    'cárdigan',
    'cárdigans',
    'rebeca',
    'rebecas',
    'vest',
    'vests',
    'floral vest',
    'chaleco',
    'chalecos',
    'waistcoat',
    'sweater vest',
    'sweater-vest',
    'knit vest',
    'knitted vest',
    'chaleco de punto'
  )
  and (garment_type is null or garment_type in ('outerwear', 'mid_layer'));

alter table public.garments
  add constraint garments_garment_type_check
  check (
    garment_type is null
    or garment_type in ('top', 'bottom', 'dress', 'outerwear', 'mid_layer', 'footwear')
  );
