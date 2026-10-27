-- A specific cardigan/vest label takes precedence over an earlier generic
-- category classification, including rows previously stored as "top".

update public.garments
set garment_type = 'mid_layer',
    extra_tags = coalesce(extra_tags, '{}'::jsonb)
      || jsonb_build_object('aiCategory', 'mid_layer')
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
  and garment_type is distinct from 'mid_layer';
