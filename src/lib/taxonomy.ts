// Bilingual garment taxonomy for the closet search.
// Keys and values are stored normalized (lowercase, no accents) so they can
// be compared directly against normalized garment fields. Spanish terms are
// search data here, not code identifiers.

export const garmentTaxonomy: Record<string, string[]> = {
  // Macro: upper body.
  "parte de arriba": ["top", "shirt", "t-shirt", "blouse", "sweater", "camisa", "blusa", "jersey", "sudadera", "camiseta"],
  // Macro: lower body.
  "parte de abajo": ["bottom", "pants", "jeans", "skirt", "shorts", "trousers", "pantalon", "falda", "vaqueros"],
  // Macro: full body garments.
  "cuerpo completo": ["dress", "jumpsuit", "overalls", "vestido", "mono"],
  // Macro: footwear.
  calzado: ["footwear", "shoes", "sneakers", "boots", "flats", "heels", "sandals", "zapatos", "zapatillas", "botas", "tacones", "sandalias"],
  // Macro: outerwear.
  abrigo: ["outerwear", "jacket", "coat", "blazer", "chaqueta", "cazadora", "americana"],
  // Mid-layers sit between a base top and a coat and are washable.
  "capa intermedia": ["mid_layer", "cardigan", "rebeca", "chaleco", "vest", "waistcoat"],
  sobrecamisa: ["mid_layer", "overshirt", "cardigan", "rebeca", "chaleco"],
  "mid layer": ["mid_layer", "cardigan", "rebeca", "chaleco", "vest"],
  // General apparel, Spanish to English.
  zapatos: ["footwear", "shoes", "sneakers", "boots", "flats", "heels", "sandals", "zapatos", "zapatillas", "botas"],
  zapato: ["footwear", "shoes", "sneakers", "boots", "flats", "zapatos", "zapatillas"],
  zapatillas: ["sneakers", "trainers", "runners", "high-tops", "tennis", "zapatillas", "deportivas", "tenis"],
  botas: ["boots", "botas"],
  pantalon: ["pants", "jeans", "trousers", "chinos", "pantalon", "vaqueros"],
  pantalones: ["pants", "jeans", "trousers", "chinos", "pantalon", "vaqueros"],
  vaqueros: ["jeans", "denim", "vaqueros"],
  jeans: ["jeans", "denim", "vaqueros"],
  falda: ["skirt", "falda"],
  vestido: ["dress", "vestido"],
  camisa: ["shirt", "blouse", "camisa", "blusa"],
  camiseta: ["t-shirt", "tshirt", "tee", "camiseta"],
  jersey: ["sweater", "jersey", "sudadera"],
  sudadera: ["sweatshirt", "hoodie", "sudadera"],
  chaqueta: ["jacket", "coat", "blazer", "chaqueta", "cazadora"],
  // General apparel, English to Spanish.
  shoes: ["footwear", "shoes", "sneakers", "boots", "flats", "zapatos", "zapatillas"],
  sneakers: ["sneakers", "trainers", "runners", "high-tops", "tennis", "zapatillas", "deportivas", "tenis"],
  footwear: ["footwear", "shoes", "sneakers", "boots", "flats", "heels", "sandals"],
  boots: ["boots", "botas"],
  pants: ["pants", "jeans", "trousers", "pantalon", "vaqueros"],
  skirt: ["skirt", "falda"],
  dress: ["dress", "vestido"],
  shirt: ["shirt", "camisa"],
  jacket: ["jacket", "coat", "chaqueta", "cazadora"],
  coat: ["coat", "jacket", "abrigo", "chaqueta"],
  // Colors, Spanish to English.
  rojo: ["red", "rojo", "burgundy", "burdeos", "granate"],
  azul: ["blue", "azul", "navy", "marino", "celeste", "denim"],
  verde: ["green", "verde", "olive", "oliva", "khaki"],
  amarillo: ["yellow", "amarillo", "mustard", "mostaza"],
  negro: ["black", "negro"],
  blanco: ["white", "blanco"],
  gris: ["gray", "grey", "gris"],
  marron: ["brown", "marron", "camel", "beige", "tan"],
  beige: ["beige", "beige", "camel", "nude", "crudo"],
  rosa: ["pink", "rosa", "fuchsia", "fucsia"],
  naranja: ["orange", "naranja", "terracotta", "teja"],
  morado: ["purple", "morado", "lila", "violet"],
  burdeos: ["burgundy", "burdeos", "red", "rojo", "granate"],
  // Colors, English to Spanish.
  red: ["red", "rojo", "burgundy", "burdeos"],
  blue: ["blue", "azul", "navy", "denim"],
  green: ["green", "verde", "olive", "khaki"],
  black: ["black", "negro"],
  white: ["white", "blanco"],
  // Spanish plural forms.
  rojos: ["red", "rojo", "burgundy", "burdeos"],
  azules: ["blue", "azul", "navy", "denim"],
  verdes: ["green", "verde", "olive", "khaki"],
  amarillos: ["yellow", "amarillo", "mustard"],
  negros: ["black", "negro"],
  blancos: ["white", "blanco"],
  grises: ["gray", "grey", "gris"],
  marrones: ["brown", "marron", "camel", "beige"],
  rosas: ["pink", "rosa", "fuchsia"],
  morados: ["purple", "morado", "lila"],
  camisas: ["shirt", "blouse", "camisa", "blusa"],
  camisetas: ["t-shirt", "tshirt", "tee", "camiseta"],
  faldas: ["skirt", "falda"],
  vestidos: ["dress", "vestido"],
  chaquetas: ["jacket", "coat", "chaqueta", "cazadora"],
  // Materials, Spanish to English.
  cuero: ["leather", "cuero", "polipiel"],
  lino: ["linen", "lino"],
  algodon: ["cotton", "algodon"],
  lana: ["wool", "lana", "cashmere"],
  seda: ["silk", "seda", "satin"],
  vaquero: ["denim", "vaquero", "jeans"],
  pana: ["corduroy", "pana"],
  // Materials, English to Spanish.
  leather: ["leather", "cuero", "polipiel"],
  linen: ["linen", "lino"],
  cotton: ["cotton", "algodon"],
  wool: ["wool", "lana"],
  silk: ["silk", "seda"],
  denim: ["denim", "jeans", "vaquero", "vaqueros"],

  // Prints and patterns.
  rayas: ["stripes", "stripe", "rayas"],
  stripes: ["stripes", "stripe", "rayas"],
  leopardo: ["leopard", "leopardo"],
  leopard: ["leopard", "leopardo"],
  "estampado animal": ["animal_print", "animal print", "estampado animal"],
  animal_print: ["animal_print", "animal print", "estampado animal"],
  floral: ["floral", "flores", "estampado floral"],
  flores: ["floral", "flores", "estampado floral"],
  cuadros: ["plaid", "cuadros"],
  plaid: ["plaid", "cuadros"],
  lunares: ["polka_dot", "polka dot", "lunares"],
  polka_dot: ["polka_dot", "polka dot", "lunares"],
  geometrico: ["geometric", "geometrico"],
  geometric: ["geometric", "geometrico"],
  camuflaje: ["camouflage", "camuflaje"],
  camouflage: ["camouflage", "camuflaje"],
  grafico: ["graphic", "grafico"],
  graphic: ["graphic", "grafico"],
  abstracto: ["abstract", "abstracto"],
  abstract: ["abstract", "abstracto"],

  // Styles, cuts and seasons.
  deportivo: ["sport", "sports", "deportivo"],
  sport: ["sport", "sports", "deportivo"],
  urbano: ["streetwear", "street", "urbano"],
  streetwear: ["streetwear", "street", "urbano"],
  ajustado: ["slim", "fitted", "ajustado"],
  slim: ["slim", "fitted", "ajustado"],
  normal: ["regular", "normal"],
  regular: ["regular", "normal"],
  holgado: ["relaxed", "loose", "holgado"],
  relaxed: ["relaxed", "loose", "holgado"],
  oversize: ["oversized", "oversize", "holgado"],
  oversized: ["oversized", "oversize", "holgado"],
  corto: ["cropped", "short", "corto"],
  cropped: ["cropped", "short", "corto"],
  largo: ["long", "largo"],
  long: ["long", "largo"],
  verano: ["summer", "verano"],
  summer: ["summer", "verano"],
  invierno: ["winter", "invierno"],
  winter: ["winter", "invierno"],
  entretiempo: ["mid_season", "mid season", "entretiempo"],
  mid_season: ["mid_season", "mid season", "entretiempo"],
};

// Maximum phrase length (in tokens) present in the taxonomy keys.
const MAX_PHRASE_TOKENS = Math.max(
  ...Object.keys(garmentTaxonomy).map((key) => key.split(" ").length),
);

// Lowercase, strip accents, collapse whitespace.
export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Expand a raw query into one array of equivalents per concept.
// Single tokens look up the taxonomy directly; multi-word phrases such as
// "parte de abajo" match greedily (longest phrase first) so macro mappings
// work despite space tokenization. Unknown tokens pass through unchanged.
export function expandSearchQuery(query: string): string[][] {
  const normalized = normalizeSearchText(query);
  if (normalized === "") {
    return [];
  }
  const tokens = normalized.split(" ");
  const expansions: string[][] = [];
  let index = 0;
  while (index < tokens.length) {
    let matched = false;
    const maxLength = Math.min(MAX_PHRASE_TOKENS, tokens.length - index);
    for (let length = maxLength; length >= 1; length--) {
      const phrase = tokens.slice(index, index + length).join(" ");
      const expansion = garmentTaxonomy[phrase];
      if (expansion !== undefined) {
        expansions.push(expansion);
        index += length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      expansions.push([tokens[index]]);
      index += 1;
    }
  }
  return expansions;
}
