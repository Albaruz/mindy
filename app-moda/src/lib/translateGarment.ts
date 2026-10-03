import { useLocale } from "next-intl";
import type { AppLocale } from "@/i18n/routing";

export type GarmentAttributeKind =
  | "type"
  | "color"
  | "material"
  | "style"
  | "season"
  | "cut";

// Canonical Spanish labels per closed English base. AI-generated columns
// always store English bases (see garmentOptions normalization), so this
// map intercepts them before render when the locale is Spanish.
const SPANISH_LABELS: Record<GarmentAttributeKind, Record<string, string>> = {
  type: {
    top: "Prenda superior",
    bottom: "Prenda inferior",
    dress: "Vestido",
    outerwear: "Abrigo",
    footwear: "Calzado",
  },
  color: {
    black: "Negro",
    white: "Blanco",
    gray: "Gris",
    beige: "Beige",
    brown: "Marrón",
    navy: "Azul marino",
    blue: "Azul",
    red: "Rojo",
    pink: "Rosa",
    green: "Verde",
    yellow: "Amarillo",
    orange: "Naranja",
    purple: "Morado",
  },
  material: {
    cotton: "Algodón",
    denim: "Denim",
    linen: "Lino",
    wool: "Lana",
    leather: "Cuero",
    silk: "Seda",
    polyester: "Poliéster",
    viscose: "Viscosa",
    nylon: "Nailon",
    elastane: "Elastano",
    corduroy: "Pana",
    knit: "Punto",
  },
  style: {
    casual: "Casual",
    formal: "Formal",
    sport: "Deportivo",
    elegant: "Elegante",
    streetwear: "Urbano",
    party: "Fiesta",
  },
  season: {
    summer: "Verano",
    winter: "Invierno",
    mid_season: "Entretiempo",
    all: "Todo el año",
  },
  cut: {
    slim: "Ajustado",
    regular: "Regular",
    relaxed: "Holgado",
    oversized: "Oversize",
    cropped: "Corto",
    long: "Largo",
  },
};

// Specific AI details kept in extra_tags (specificType, colorShade, ...)
// may already be Spanish (user edits) or English (AI output). Known
// English specifics map here; unknown values pass through untouched.
const SPANISH_SPECIFICS: Record<string, string> = {
  sneakers: "Zapatillas",
  boots: "Botas",
  sandals: "Sandalias",
  heels: "Tacones",
  loafers: "Mocasines",
  "t-shirt": "Camiseta",
  shirt: "Camisa",
  blouse: "Blusa",
  sweater: "Jersey",
  hoodie: "Sudadera",
  jeans: "Vaqueros",
  trousers: "Pantalones",
  shorts: "Pantalones cortos",
  skirt: "Falda",
  jacket: "Chaqueta",
  coat: "Abrigo",
  blazer: "Blazer",
  dress: "Vestido",
  gown: "Vestido de fiesta",
  jumpsuit: "Mono",
  turquoise: "Turquesa",
  burgundy: "Burdeos",
  mustard: "Mostaza",
  beige: "Beige",
};

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

// Translate one stored English attribute value for display. Spanish
// locale maps through the dictionaries; English (or unknown values)
// return the original untouched. Nullish input stays nullish.
export function translateGarmentValue(
  value: string | null | undefined,
  kind: GarmentAttributeKind,
  locale: string,
): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if ((locale as AppLocale) !== "es") {
    return value;
  }
  const key = normalize(value);
  return SPANISH_LABELS[kind][key] ?? SPANISH_SPECIFICS[key] ?? value;
}

// Translate a free-form extra_tags detail (specificType, colorShade).
export function translateGarmentDetail(
  value: string | null | undefined,
  locale: string,
): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if ((locale as AppLocale) !== "es") {
    return value;
  }
  return SPANISH_SPECIFICS[normalize(value)] ?? value;
}

// Client hook: curried translator bound to the active next-intl locale.
export function useGarmentTranslator() {
  const locale = useLocale();
  return {
    locale,
    translate: (
      value: string | null | undefined,
      kind: GarmentAttributeKind,
    ) => translateGarmentValue(value, kind, locale),
    translateDetail: (value: string | null | undefined) =>
      translateGarmentDetail(value, locale),
  };
}
