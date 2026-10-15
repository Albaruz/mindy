// Closed vocabularies for garment tags (single source of truth).
// Types are derived in @/types/garment. Fine-grained values map to these
// base values; see features/closet/garmentOptions.ts for normalization.

export const GARMENT_TYPE_VALUES = [
  "top",
  "bottom",
  "dress",
  "outerwear",
  "footwear",
] as const;

export const GARMENT_STYLE_VALUES = [
  "casual",
  "formal",
  "sport",
  "elegant",
  "streetwear",
  "party",
] as const;

export const GARMENT_CUT_VALUES = [
  "slim",
  "regular",
  "relaxed",
  "oversized",
  "cropped",
  "long",
] as const;

export const GARMENT_COLOR_VALUES = [
  "black",
  "white",
  "gray",
  "beige",
  "brown",
  "navy",
  "blue",
  "red",
  "pink",
  "green",
  "yellow",
  "orange",
  "purple",
] as const;

export const GARMENT_MATERIAL_VALUES = [
  "cotton",
  "denim",
  "linen",
  "wool",
  "leather",
  "silk",
  "polyester",
  "viscose",
  "nylon",
  "elastane",
  "corduroy",
  "knit",
] as const;

export const GARMENT_SEASON_VALUES = [
  "summer",
  "winter",
  "mid_season",
  "all",
] as const;

/** Vision's assessment of how difficult a clean garment cutout will be. */
export const CUTOUT_DIFFICULTY_VALUES = ["easy", "hard"] as const;

import type {
  Category,
  GarmentColor,
  GarmentCut,
  GarmentMaterial,
  GarmentStyle,
  GarmentType,
} from "@/types/garment";

// ============================================================================
// Aliases: free-text / AI / Spanish term -> base value (single source).
// Keys are normalized (lowercase, no accents); see lib/garment/normalizers.
// Every taxonomy term and the AI vision output land here; unknown values
// return null so callers store null + the raw detail in extra_tags.
// ============================================================================

// Specific garment name -> macro base (type).
export const GARMENT_TYPE_ALIASES: Record<string, GarmentType> = {
  top: "top",
  shirt: "top",
  blouse: "top",
  "t-shirt": "top",
  tshirt: "top",
  tee: "top",
  sweater: "top",
  hoodie: "top",
  sweatshirt: "top",
  polo: "top",
  tank: "top",
  jersey: "top",
  sudadera: "top",
  camisa: "top",
  camiseta: "top",
  blusa: "top",
  bottom: "bottom",
  pants: "bottom",
  jeans: "bottom",
  trousers: "bottom",
  shorts: "bottom",
  skirt: "bottom",
  leggings: "bottom",
  chinos: "bottom",
  joggers: "bottom",
  pantalon: "bottom",
  pantalones: "bottom",
  vaquero: "bottom",
  vaqueros: "bottom",
  falda: "bottom",
  faldas: "bottom",
  bermudas: "bottom",
  mallas: "bottom",
  dress: "dress",
  gown: "dress",
  jumpsuit: "dress",
  overalls: "dress",
  mono: "dress",
  vestido: "dress",
  vestidos: "dress",
  outerwear: "outerwear",
  jacket: "outerwear",
  coat: "outerwear",
  blazer: "outerwear",
  parka: "outerwear",
  vest: "outerwear",
  windbreaker: "outerwear",
  cardigan: "outerwear",
  abrigo: "outerwear",
  chaqueta: "outerwear",
  cazadora: "outerwear",
  americana: "outerwear",
  gabardina: "outerwear",
  chaleco: "outerwear",
  rebeca: "outerwear",
  shoes: "footwear",
  shoe: "footwear",
  sneakers: "footwear",
  boots: "footwear",
  sandals: "footwear",
  heels: "footwear",
  loafers: "footwear",
  trainers: "footwear",
  footwear: "footwear",
  flats: "footwear",
  zapato: "footwear",
  zapatos: "footwear",
  zapatilla: "footwear",
  zapatillas: "footwear",
  bota: "footwear",
  botas: "footwear",
  botin: "footwear",
  botines: "footwear",
  sandalia: "footwear",
  sandalias: "footwear",
  tacon: "footwear",
  tacones: "footwear",
  deportiva: "footwear",
  deportivas: "footwear",
  mocasines: "footwear",
  bailarinas: "footwear",
};

// Shade -> base spectrum. Turquoise lands in blue, burgundy in red, etc.
export const GARMENT_COLOR_ALIASES: Record<string, GarmentColor> = {
  black: "black",
  negro: "black",
  negros: "black",
  white: "white",
  blanco: "white",
  blancos: "white",
  gray: "gray",
  grey: "gray",
  gris: "gray",
  grises: "gray",
  beige: "beige",
  nude: "beige",
  crudo: "beige",
  brown: "brown",
  marron: "brown",
  marrones: "brown",
  camel: "brown",
  tan: "brown",
  navy: "navy",
  marino: "navy",
  blue: "blue",
  azul: "blue",
  azules: "blue",
  celeste: "blue",
  denim: "blue",
  turquoise: "blue",
  turquesa: "blue",
  teal: "blue",
  red: "red",
  rojo: "red",
  rojos: "red",
  burgundy: "red",
  burdeos: "red",
  granate: "red",
  pink: "pink",
  rosa: "pink",
  rosas: "pink",
  fuchsia: "pink",
  fucsia: "pink",
  green: "green",
  verde: "green",
  verdes: "green",
  olive: "green",
  oliva: "green",
  khaki: "green",
  yellow: "yellow",
  amarillo: "yellow",
  amarillos: "yellow",
  mustard: "yellow",
  mostaza: "yellow",
  orange: "orange",
  naranja: "orange",
  terracotta: "orange",
  teja: "orange",
  purple: "purple",
  morado: "purple",
  morados: "purple",
  lila: "purple",
  violet: "purple",
  lilac: "purple",
};

export const GARMENT_MATERIAL_ALIASES: Record<string, GarmentMaterial> = {
  cotton: "cotton",
  algodon: "cotton",
  denim: "denim",
  vaquero: "denim",
  linen: "linen",
  lino: "linen",
  wool: "wool",
  lana: "wool",
  cashmere: "wool",
  leather: "leather",
  cuero: "leather",
  polipiel: "leather",
  silk: "silk",
  seda: "silk",
  satin: "silk",
  polyester: "polyester",
  poliester: "polyester",
  viscose: "viscose",
  viscosa: "viscose",
  nylon: "nylon",
  elastane: "elastane",
  elastano: "elastane",
  spandex: "elastane",
  corduroy: "corduroy",
  pana: "corduroy",
  knit: "knit",
  punto: "knit",
};

export const GARMENT_STYLE_ALIASES: Record<string, GarmentStyle> = {
  casual: "casual",
  daily: "casual",
  informal: "casual",
  relaxed: "casual",
  formal: "formal",
  business: "formal",
  office: "formal",
  oficina: "formal",
  work: "formal",
  traje: "formal",
  sport: "sport",
  sports: "sport",
  active: "sport",
  athletic: "sport",
  gym: "sport",
  training: "sport",
  deporte: "sport",
  elegant: "elegant",
  elegante: "elegant",
  classic: "elegant",
  streetwear: "streetwear",
  urban: "streetwear",
  party: "party",
  fiesta: "party",
  night: "party",
  noche: "party",
  evening: "party",
  event: "party",
  social: "party",
};

export const GARMENT_CUT_ALIASES: Record<string, GarmentCut> = {
  slim: "slim",
  tight: "slim",
  skinny: "slim",
  regular: "regular",
  straight: "regular",
  relaxed: "relaxed",
  loose: "relaxed",
  oversized: "oversized",
  cropped: "cropped",
  corto: "cropped",
  short: "cropped",
  long: "long",
  largo: "long",
};

// ============================================================================
// Macro categories (generator slots). "dress" is one-piece: it fills the
// top slot and covers the bottom slot too.
// ============================================================================

// Base type -> macro category (single source for closedTypeCategory and
// the legacy keyword fallback in lib/garment/categorizeGarments).
export const GARMENT_TYPE_CATEGORIES: Record<GarmentType, Category> = {
  top: "top",
  bottom: "bottom",
  dress: "top",
  outerwear: "outerwear",
  footwear: "footwear",
};

// Legacy free-text keywords implying a one-piece garment (dress covers
// top + bottom, so the bottom carousel hides while one is selected).
export const ONE_PIECE_KEYWORDS = ["dress", "gown", "jumpsuit"] as const;

