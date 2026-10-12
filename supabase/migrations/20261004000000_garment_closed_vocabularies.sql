-- Closed garment vocabularies: every tag column mirrors the TypeScript
-- closed enums in src/types/garment.ts. Specific names/shades
-- (sneakers, turquoise) map to their base spectrum value; the original
-- detail is preserved in extra_tags (specificType, colorShade, ...).
--
-- This migration is self-sufficient: it normalizes existing rows FIRST
-- (steps 1-7) and only then adds the CHECK constraints (step 8), so it
-- never fails on legacy free-text data. Every UPDATE is idempotent and
-- scoped with WHERE, so re-running it is safe.
--
-- Order matters: specific mappings run before the catch-all NULL
-- fallbacks at the end of each block.

-- ---------------------------------------------------------------------------
-- 0. Case / whitespace normalization: closed values stored as "Top" or
-- " SUMMER " become comparable for the mappings below.
-- ---------------------------------------------------------------------------
update public.garments set garment_type = lower(btrim(garment_type))
  where garment_type is not null and garment_type <> lower(btrim(garment_type));
update public.garments set style = lower(btrim(style))
  where style is not null and style <> lower(btrim(style));
update public.garments set cut_length = lower(btrim(cut_length))
  where cut_length is not null and cut_length <> lower(btrim(cut_length));
update public.garments set color = lower(btrim(color))
  where color is not null and color <> lower(btrim(color));
update public.garments set material = lower(btrim(material))
  where material is not null and material <> lower(btrim(material));
update public.garments set season = lower(btrim(season))
  where season is not null and season <> lower(btrim(season));

-- ---------------------------------------------------------------------------
-- 1. garment_type -> top | bottom | dress | outerwear | footwear.
-- Detail preserved in extra_tags.specificType (only when still unset).
-- ---------------------------------------------------------------------------
update public.garments
  set garment_type = 'top',
    extra_tags = case
      when (extra_tags ->> 'specificType') is null
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('specificType', garment_type)
      else extra_tags
    end
  where garment_type in (
    't-shirt', 'tshirt', 'tee', 'shirt', 'blouse', 'sweater', 'hoodie',
    'sweatshirt', 'polo', 'tank', 'jersey', 'sudadera', 'camisa',
    'camiseta', 'blusa'
  );

update public.garments
  set garment_type = 'bottom',
    extra_tags = case
      when (extra_tags ->> 'specificType') is null
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('specificType', garment_type)
      else extra_tags
    end
  where garment_type in (
    'pants', 'jeans', 'trousers', 'shorts', 'skirt', 'leggings',
    'chinos', 'joggers', 'pantalon', 'pantalones', 'vaquero',
    'vaqueros', 'falda', 'faldas', 'bermudas', 'mallas'
  );

update public.garments
  set garment_type = 'dress',
    extra_tags = case
      when (extra_tags ->> 'specificType') is null
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('specificType', garment_type)
      else extra_tags
    end
  where garment_type in ('gown', 'jumpsuit', 'overalls', 'mono', 'vestido', 'vestidos')
    and garment_type <> 'dress';

update public.garments
  set garment_type = 'outerwear',
    extra_tags = case
      when (extra_tags ->> 'specificType') is null
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('specificType', garment_type)
      else extra_tags
    end
  where garment_type in (
    'jacket', 'coat', 'blazer', 'parka', 'vest', 'windbreaker',
    'cardigan', 'abrigo', 'abrigos', 'chaqueta', 'chaquetas',
    'cazadora', 'americana', 'chaleco', 'gabardina', 'rebeca'
  );

-- Footwear rename: macro value becomes 'footwear'. Specific names keep
-- their detail (sneakers stays searchable via extra_tags + taxonomy).
update public.garments set garment_type = 'footwear'
  where garment_type = 'shoes';

update public.garments
  set garment_type = 'footwear',
    extra_tags = case
      when (extra_tags ->> 'specificType') is null
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('specificType', garment_type)
      else extra_tags
    end
  where garment_type in (
    'shoe', 'sneakers', 'boots', 'sandals', 'heels', 'loafers',
    'trainers', 'flats', 'zapato', 'zapatos', 'zapatilla', 'zapatillas',
    'bota', 'botas', 'botin', 'botines', 'sandalia', 'sandalias',
    'tacon', 'tacones', 'deportiva', 'deportivas', 'mocasines',
    'bailarinas'
  );

-- Legacy AI category follows the same rename.
update public.garments
  set extra_tags = extra_tags || '{"aiCategory":"footwear"}'::jsonb
  where extra_tags ->> 'aiCategory' = 'shoes';

-- Catch-all: anything still outside the closed list is nulled, keeping
-- the original text as detail so no information is lost.
update public.garments
  set extra_tags = case
      when (extra_tags ->> 'specificType') is null
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('specificType', garment_type)
      else extra_tags
    end,
    garment_type = null
  where garment_type is not null
    and garment_type not in ('top', 'bottom', 'dress', 'outerwear', 'footwear');

-- ---------------------------------------------------------------------------
-- 2. color -> 13 base spectra. Shades preserved in extra_tags.colorShade.
-- ---------------------------------------------------------------------------
update public.garments
  set color = 'black',
    extra_tags = case
      when (extra_tags ->> 'colorShade') is null and color <> 'black'
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('colorShade', color)
      else extra_tags
    end
  where color in ('negro', 'negros');

update public.garments
  set color = 'white',
    extra_tags = case
      when (extra_tags ->> 'colorShade') is null and color <> 'white'
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('colorShade', color)
      else extra_tags
    end
  where color in ('blanco', 'blancos');

update public.garments
  set color = 'gray',
    extra_tags = case
      when (extra_tags ->> 'colorShade') is null and color <> 'gray'
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('colorShade', color)
      else extra_tags
    end
  where color in ('grey', 'gris', 'grises');

update public.garments
  set color = 'beige',
    extra_tags = case
      when (extra_tags ->> 'colorShade') is null and color <> 'beige'
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('colorShade', color)
      else extra_tags
    end
  where color in ('nude', 'crudo');

update public.garments
  set color = 'brown',
    extra_tags = case
      when (extra_tags ->> 'colorShade') is null and color <> 'brown'
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('colorShade', color)
      else extra_tags
    end
  where color in ('marron', 'marrones', 'camel', 'tan');

update public.garments
  set color = 'navy',
    extra_tags = case
      when (extra_tags ->> 'colorShade') is null and color <> 'navy'
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('colorShade', color)
      else extra_tags
    end
  where color = 'marino';

update public.garments
  set color = 'blue',
    extra_tags = case
      when (extra_tags ->> 'colorShade') is null and color <> 'blue'
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('colorShade', color)
      else extra_tags
    end
  where color in (
    'azul', 'azules', 'celeste', 'denim', 'turquoise', 'turquesa', 'teal'
  );

update public.garments
  set color = 'red',
    extra_tags = case
      when (extra_tags ->> 'colorShade') is null and color <> 'red'
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('colorShade', color)
      else extra_tags
    end
  where color in ('rojo', 'rojos', 'burgundy', 'burdeos', 'granate');

update public.garments
  set color = 'pink',
    extra_tags = case
      when (extra_tags ->> 'colorShade') is null and color <> 'pink'
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('colorShade', color)
      else extra_tags
    end
  where color in ('rosa', 'rosas', 'fuchsia', 'fucsia');

update public.garments
  set color = 'green',
    extra_tags = case
      when (extra_tags ->> 'colorShade') is null and color <> 'green'
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('colorShade', color)
      else extra_tags
    end
  where color in ('verde', 'verdes', 'olive', 'oliva', 'khaki');

update public.garments
  set color = 'yellow',
    extra_tags = case
      when (extra_tags ->> 'colorShade') is null and color <> 'yellow'
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('colorShade', color)
      else extra_tags
    end
  where color in ('amarillo', 'amarillos', 'mustard', 'mostaza');

update public.garments
  set color = 'orange',
    extra_tags = case
      when (extra_tags ->> 'colorShade') is null and color <> 'orange'
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('colorShade', color)
      else extra_tags
    end
  where color in ('naranja', 'terracotta', 'teja');

update public.garments
  set color = 'purple',
    extra_tags = case
      when (extra_tags ->> 'colorShade') is null and color <> 'purple'
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('colorShade', color)
      else extra_tags
    end
  where color in ('morado', 'morados', 'lila', 'lilac', 'violet');

update public.garments
  set extra_tags = case
      when (extra_tags ->> 'colorShade') is null
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('colorShade', color)
      else extra_tags
    end,
    color = null
  where color is not null
    and color not in (
      'black', 'white', 'gray', 'beige', 'brown', 'navy', 'blue',
      'red', 'pink', 'green', 'yellow', 'orange', 'purple'
    );

-- ---------------------------------------------------------------------------
-- 3. material -> 12 closed values. Variants in extra_tags.materialDetail.
-- ---------------------------------------------------------------------------
update public.garments
  set material = 'cotton',
    extra_tags = case
      when (extra_tags ->> 'materialDetail') is null and material <> 'cotton'
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('materialDetail', material)
      else extra_tags
    end
  where material = 'algodon';

update public.garments
  set material = 'denim',
    extra_tags = case
      when (extra_tags ->> 'materialDetail') is null and material <> 'denim'
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('materialDetail', material)
      else extra_tags
    end
  where material = 'vaquero';

update public.garments
  set material = 'linen',
    extra_tags = case
      when (extra_tags ->> 'materialDetail') is null and material <> 'linen'
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('materialDetail', material)
      else extra_tags
    end
  where material = 'lino';

update public.garments
  set material = 'wool',
    extra_tags = case
      when (extra_tags ->> 'materialDetail') is null and material <> 'wool'
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('materialDetail', material)
      else extra_tags
    end
  where material in ('lana', 'cashmere');

update public.garments
  set material = 'leather',
    extra_tags = case
      when (extra_tags ->> 'materialDetail') is null and material <> 'leather'
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('materialDetail', material)
      else extra_tags
    end
  where material in ('cuero', 'polipiel');

update public.garments
  set material = 'silk',
    extra_tags = case
      when (extra_tags ->> 'materialDetail') is null and material <> 'silk'
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('materialDetail', material)
      else extra_tags
    end
  where material in ('seda', 'satin');

update public.garments
  set material = 'polyester',
    extra_tags = case
      when (extra_tags ->> 'materialDetail') is null and material <> 'polyester'
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('materialDetail', material)
      else extra_tags
    end
  where material = 'poliester';

update public.garments
  set material = 'viscose',
    extra_tags = case
      when (extra_tags ->> 'materialDetail') is null and material <> 'viscose'
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('materialDetail', material)
      else extra_tags
    end
  where material = 'viscosa';

update public.garments
  set material = 'elastane',
    extra_tags = case
      when (extra_tags ->> 'materialDetail') is null and material <> 'elastane'
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('materialDetail', material)
      else extra_tags
    end
  where material in ('elastano', 'spandex');

update public.garments
  set material = 'corduroy',
    extra_tags = case
      when (extra_tags ->> 'materialDetail') is null and material <> 'corduroy'
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('materialDetail', material)
      else extra_tags
    end
  where material = 'pana';

update public.garments
  set material = 'knit',
    extra_tags = case
      when (extra_tags ->> 'materialDetail') is null and material <> 'knit'
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('materialDetail', material)
      else extra_tags
    end
  where material = 'punto';

update public.garments
  set material = 'nylon',
    extra_tags = case
      when (extra_tags ->> 'materialDetail') is null and material <> 'nylon'
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('materialDetail', material)
      else extra_tags
    end
  where material = 'nailon';

update public.garments
  set extra_tags = case
      when (extra_tags ->> 'materialDetail') is null
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('materialDetail', material)
      else extra_tags
    end,
    material = null
  where material is not null
    and material not in (
      'cotton', 'denim', 'linen', 'wool', 'leather', 'silk',
      'polyester', 'viscose', 'nylon', 'elastane', 'corduroy', 'knit'
    );

-- ---------------------------------------------------------------------------
-- 4. style -> 6 closed values. Legacy labels in extra_tags.styleDetail.
-- ---------------------------------------------------------------------------
update public.garments
  set style = 'casual',
    extra_tags = case
      when (extra_tags ->> 'styleDetail') is null and style <> 'casual'
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('styleDetail', style)
      else extra_tags
    end
  where style in ('daily', 'informal', 'relaxed');

update public.garments
  set style = 'formal',
    extra_tags = case
      when (extra_tags ->> 'styleDetail') is null and style <> 'formal'
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('styleDetail', style)
      else extra_tags
    end
  where style in ('business', 'office', 'oficina', 'work', 'traje');

update public.garments
  set style = 'sport',
    extra_tags = case
      when (extra_tags ->> 'styleDetail') is null and style <> 'sport'
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('styleDetail', style)
      else extra_tags
    end
  where style in (
    'sports', 'active', 'athletic', 'gym', 'training', 'deporte'
  );

update public.garments
  set style = 'elegant',
    extra_tags = case
      when (extra_tags ->> 'styleDetail') is null and style <> 'elegant'
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('styleDetail', style)
      else extra_tags
    end
  where style in ('elegante', 'classic');

update public.garments
  set style = 'streetwear',
    extra_tags = case
      when (extra_tags ->> 'styleDetail') is null and style <> 'streetwear'
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('styleDetail', style)
      else extra_tags
    end
  where style = 'urban';

update public.garments
  set style = 'party',
    extra_tags = case
      when (extra_tags ->> 'styleDetail') is null and style <> 'party'
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('styleDetail', style)
      else extra_tags
    end
  where style in (
    'fiesta', 'night', 'noche', 'evening', 'event', 'social'
  );

update public.garments
  set extra_tags = case
      when (extra_tags ->> 'styleDetail') is null
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('styleDetail', style)
      else extra_tags
    end,
    style = null
  where style is not null
    and style not in (
      'casual', 'formal', 'sport', 'elegant', 'streetwear', 'party'
    );

-- ---------------------------------------------------------------------------
-- 5. cut_length -> 6 closed values. Variants in extra_tags.cutDetail.
-- ---------------------------------------------------------------------------
update public.garments
  set cut_length = 'slim',
    extra_tags = case
      when (extra_tags ->> 'cutDetail') is null and cut_length <> 'slim'
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('cutDetail', cut_length)
      else extra_tags
    end
  where cut_length in ('tight', 'skinny');

update public.garments
  set cut_length = 'regular',
    extra_tags = case
      when (extra_tags ->> 'cutDetail') is null and cut_length <> 'regular'
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('cutDetail', cut_length)
      else extra_tags
    end
  where cut_length = 'straight';

update public.garments
  set cut_length = 'relaxed',
    extra_tags = case
      when (extra_tags ->> 'cutDetail') is null and cut_length <> 'relaxed'
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('cutDetail', cut_length)
      else extra_tags
    end
  where cut_length = 'loose';

update public.garments
  set cut_length = 'cropped',
    extra_tags = case
      when (extra_tags ->> 'cutDetail') is null and cut_length <> 'cropped'
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('cutDetail', cut_length)
      else extra_tags
    end
  where cut_length in ('corto', 'short');

update public.garments
  set cut_length = 'long',
    extra_tags = case
      when (extra_tags ->> 'cutDetail') is null and cut_length <> 'long'
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('cutDetail', cut_length)
      else extra_tags
    end
  where cut_length = 'largo';

update public.garments
  set extra_tags = case
      when (extra_tags ->> 'cutDetail') is null
        then coalesce(extra_tags, '{}'::jsonb)
          || jsonb_build_object('cutDetail', cut_length)
      else extra_tags
    end,
    cut_length = null
  where cut_length is not null
    and cut_length not in (
      'slim', 'regular', 'relaxed', 'oversized', 'cropped', 'long'
    );

-- ---------------------------------------------------------------------------
-- 6. season -> summer | winter | mid_season | all (no detail needed).
-- ---------------------------------------------------------------------------
update public.garments set season = null
  where season is not null
    and season not in ('summer', 'winter', 'mid_season', 'all');

-- ---------------------------------------------------------------------------
-- 7. Verification helper: run this SELECT before step 8. It must return
-- zero rows. If it returns rows, add explicit mappings above for those
-- values instead of letting the catch-alls null them.
-- ---------------------------------------------------------------------------
-- select garment_type, style, cut_length, color, material, season,
--   count(*)
-- from public.garments
-- where garment_type not in ('top', 'bottom', 'dress', 'outerwear', 'footwear')
--   or style not in ('casual', 'formal', 'sport', 'elegant', 'streetwear', 'party')
--   or cut_length not in ('slim', 'regular', 'relaxed', 'oversized', 'cropped', 'long')
--   or color not in ('black', 'white', 'gray', 'beige', 'brown', 'navy', 'blue',
--     'red', 'pink', 'green', 'yellow', 'orange', 'purple')
--   or material not in ('cotton', 'denim', 'linen', 'wool', 'leather', 'silk',
--     'polyester', 'viscose', 'nylon', 'elastane', 'corduroy', 'knit')
--   or season not in ('summer', 'winter', 'mid_season', 'all')
-- group by garment_type, style, cut_length, color, material, season;

-- ---------------------------------------------------------------------------
-- 8. CHECK constraints mirroring the closed TypeScript enums.
-- ---------------------------------------------------------------------------
alter table public.garments drop constraint if exists garments_garment_type_check;
alter table public.garments add constraint garments_garment_type_check
  check (
    garment_type is null
    or garment_type in ('top', 'bottom', 'dress', 'outerwear', 'footwear')
  );

alter table public.garments drop constraint if exists garments_style_check;
alter table public.garments add constraint garments_style_check
  check (
    style is null
    or style in ('casual', 'formal', 'sport', 'elegant', 'streetwear', 'party')
  );

alter table public.garments drop constraint if exists garments_cut_length_check;
alter table public.garments add constraint garments_cut_length_check
  check (
    cut_length is null
    or cut_length in ('slim', 'regular', 'relaxed', 'oversized', 'cropped', 'long')
  );

alter table public.garments drop constraint if exists garments_color_check;
alter table public.garments add constraint garments_color_check
  check (
    color is null
    or color
      in (
        'black',
        'white',
        'gray',
        'beige',
        'brown',
        'navy',
        'blue',
        'red',
        'pink',
        'green',
        'yellow',
        'orange',
        'purple'
      )
  );

alter table public.garments drop constraint if exists garments_material_check;
alter table public.garments add constraint garments_material_check
  check (
    material is null
    or material
      in (
        'cotton',
        'denim',
        'linen',
        'wool',
        'leather',
        'silk',
        'polyester',
        'viscose',
        'nylon',
        'elastane',
        'corduroy',
        'knit'
      )
  );

alter table public.garments drop constraint if exists garments_season_check;
alter table public.garments add constraint garments_season_check
  check (
    season is null or season in ('summer', 'winter', 'mid_season', 'all')
  );
