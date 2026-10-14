// Closed vocabularies for garments. The const arrays live in
// constants/garment.ts (single source of truth); this module adds UI data
// (swatches, labels) and normalization from free/AI text to the closed
// base + extra_tags detail.
import {
  GARMENT_COLOR_VALUES,
  GARMENT_CUT_VALUES,
  GARMENT_MATERIAL_VALUES,
  GARMENT_SEASON_VALUES,
  GARMENT_STYLE_VALUES,
  GARMENT_TYPE_VALUES,
} from "@/constants/garment";
import type {
  GarmentColor,
  GarmentCut,
  GarmentMaterial,
  GarmentSeason,
  GarmentStyle,
  GarmentType,
} from "@/types/garment";

export {
  GARMENT_COLOR_VALUES,
  GARMENT_CUT_VALUES,
  GARMENT_MATERIAL_VALUES,
  GARMENT_SEASON_VALUES,
  GARMENT_STYLE_VALUES,
  GARMENT_TYPE_VALUES,
};

// Legacy names used by the form modal.
export const GARMENT_TYPES = GARMENT_TYPE_VALUES;
export const GARMENT_STYLES = GARMENT_STYLE_VALUES;
export const GARMENT_CUTS = GARMENT_CUT_VALUES;
export const GARMENT_MATERIALS = GARMENT_MATERIAL_VALUES;
export const GARMENT_COLORS = GARMENT_COLOR_VALUES;
export const GARMENT_SEASONS = GARMENT_SEASON_VALUES;

// Basic color circles for the form picker (closed set, one per base).
export const GARMENT_COLOR_SWATCHES: Record<GarmentColor, string> = {
  black: "#232323",
  white: "#ffffff",
  gray: "#9aa0a6",
  beige: "#e6d7b8",
  brown: "#6b4423",
  navy: "#274a78",
  blue: "#4a7ebb",
  red: "#c0392b",
  pink: "#f0a8bb",
  green: "#4a7c59",
  yellow: "#f2d060",
  orange: "#e67e22",
  purple: "#7d5ba6",
};

// Normalize free text: lowercase, strip accents, trim.
function clean(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function isBase<T extends string>(
  value: string,
  bases: readonly T[],
): value is T {
  return (bases as readonly string[]).includes(value);
}

// Specific garment name -> macro base. Every taxonomy term and the AI
// vision output land here; unknown values return null so the caller
// stores null + the raw detail in extra_tags.specificType.
const TYPE_ALIASES: Record<string, GarmentType> = {
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
const COLOR_ALIASES: Record<string, GarmentColor> = {
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

const MATERIAL_ALIASES: Record<string, GarmentMaterial> = {
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

const STYLE_ALIASES: Record<string, GarmentStyle> = {
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

const CUT_ALIASES: Record<string, GarmentCut> = {
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

export interface NormalizedTag<T extends string> {
  base: T | null;
  // Original detail when it differs from the base (stored in extra_tags).
  detail: string | null;
}

function normalizeWithAliases<T extends string>(
  raw: unknown,
  bases: readonly T[],
  aliases: Record<string, T>,
): NormalizedTag<T> {
  if (typeof raw !== "string") {
    return { base: null, detail: null };
  }
  const cleaned = clean(raw);
  if (cleaned === "") {
    return { base: null, detail: null };
  }
  if (isBase(cleaned, bases)) {
    return { base: cleaned, detail: null };
  }
  const base = aliases[cleaned];
  if (base !== undefined) {
    return { base, detail: cleaned === base ? null : cleaned };
  }
  return { base: null, detail: cleaned };
}

export function normalizeGarmentType(
  raw: unknown,
): NormalizedTag<GarmentType> {
  return normalizeWithAliases(raw, GARMENT_TYPE_VALUES, TYPE_ALIASES);
}

export function normalizeGarmentColor(
  raw: unknown,
): NormalizedTag<GarmentColor> {
  return normalizeWithAliases(raw, GARMENT_COLOR_VALUES, COLOR_ALIASES);
}

export function normalizeGarmentMaterial(
  raw: unknown,
): NormalizedTag<GarmentMaterial> {
  return normalizeWithAliases(
    raw,
    GARMENT_MATERIAL_VALUES,
    MATERIAL_ALIASES,
  );
}

export function normalizeGarmentStyle(
  raw: unknown,
): NormalizedTag<GarmentStyle> {
  return normalizeWithAliases(raw, GARMENT_STYLE_VALUES, STYLE_ALIASES);
}

export function normalizeGarmentCut(raw: unknown): NormalizedTag<GarmentCut> {
  return normalizeWithAliases(raw, GARMENT_CUT_VALUES, CUT_ALIASES);
}

export function normalizeGarmentSeason(
  raw: unknown,
): NormalizedTag<GarmentSeason> {
  if (typeof raw !== "string") {
    return { base: null, detail: null };
  }
  const cleaned = clean(raw);
  if (isBase(cleaned, GARMENT_SEASON_VALUES)) {
    return { base: cleaned, detail: null };
  }
  return { base: null, detail: null };
}
