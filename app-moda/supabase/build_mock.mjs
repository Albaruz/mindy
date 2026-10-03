// Builds supabase/garments_mock.json: 100 studio-catalog garments.
// Every image is a single-garment studio shot (ghost render, tailor's
// form, hanger on plain background, or flat-lay on white) with no human
// model, verified individually. Tags use the closed vocabularies from
// src/types/garment.ts; fine detail lives in extra_tags.
// Run: node supabase/build_mock.mjs (writes garments_mock.json next to it).
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const USER_ID = "010289a4-c38d-4f47-9092-d21a53874cda";
const PEX = (id) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=800`;
const DJ = (p) => `https://cdn.dummyjson.com/product-images/${p}/1.webp`;

// [imageUrl, garmentType, color, specificType, colorShade, style, material, season, cutLength, isDirty]
const ROWS = [
  // ---- TOPS (29) ----
  [DJ("mens-shirts/blue-&-black-check-shirt"), "top", "blue", "plaid shirt", null, "casual", "cotton", "all", "regular", false],
  [DJ("mens-shirts/gigabyte-aorus-men-tshirt"), "top", "white", "graphic t-shirt", null, "casual", "cotton", "summer", "regular", true],
  [DJ("mens-shirts/man-plaid-shirt"), "top", "red", "plaid flannel shirt", null, "casual", "cotton", "mid_season", "regular", false],
  [DJ("mens-shirts/man-short-sleeve-shirt"), "top", "blue", "floral hawaiian shirt", null, "casual", "viscose", "summer", "relaxed", false],
  [DJ("mens-shirts/men-check-shirt"), "top", "green", "plaid shirt", null, "casual", "cotton", "all", "regular", false],
  ["https://m.media-amazon.com/images/I/316yShnoBmL._AC_SY580_.jpg", "top", "white", "striped shirt", null, "casual", "cotton", "summer", "regular", false],
  ["https://m.media-amazon.com/images/I/21nZA9Gfl-L._AC_.jpg", "top", "white", "graphic t-shirt", null, "casual", "cotton", "summer", "regular", false],
  [PEX(9558265), "top", "pink", "oversized t-shirt", null, "casual", "cotton", "summer", "oversized", false],
  [PEX(37468337), "top", "blue", "hoodie", null, "streetwear", "cotton", "mid_season", "oversized", false],
  [PEX(19895960), "top", "red", "t-shirt", null, "casual", "cotton", "summer", "regular", false],
  [PEX(19895953), "top", "white", "floral blouse", "floral", "elegant", "viscose", "mid_season", "regular", false],
  [PEX(19895954), "top", "white", "floral blouse", "floral", "casual", "cotton", "summer", "relaxed", false],
  [PEX(19895950), "top", "white", "floral blouse", "floral", "elegant", "silk", "all", "slim", false],
  [PEX(11671964), "top", "white", "t-shirt", null, "casual", "cotton", "summer", "regular", true],
  [PEX(12025472), "top", "white", "t-shirt", null, "casual", "cotton", "all", "regular", false],
  [PEX(8532638), "top", "black", "shirt", null, "casual", "cotton", "all", "slim", false],
  [PEX(12039633), "top", "white", "t-shirt", null, "casual", "cotton", "summer", "regular", false],
  [PEX(18257675), "top", "white", "t-shirt", null, "casual", "linen", "summer", "relaxed", false],
  [PEX(36392069), "top", "orange", "t-shirt", null, "casual", "cotton", "summer", "regular", false],
  [PEX(9558761), "top", "pink", "long-sleeve shirt", null, "casual", "cotton", "mid_season", "regular", false],
  [PEX(8148576), "top", "white", "button shirt", null, "formal", "cotton", "all", "slim", false],
  [PEX(7671168), "top", "brown", "flannel shirt", null, "casual", "cotton", "mid_season", "regular", false],
  [PEX(13381986), "top", "gray", "button shirt", null, "formal", "cotton", "all", "regular", false],
  [PEX(14377294), "top", "brown", "knit sweater", null, "casual", "knit", "winter", "relaxed", false],
  [PEX(37468338), "top", "blue", "hoodie", null, "casual", "cotton", "mid_season", "relaxed", false],
  [PEX(28576622), "top", "white", "linen shirt", null, "casual", "linen", "summer", "regular", false],
  [PEX(8532616), "top", "black", "shirt", null, "streetwear", "cotton", "all", "slim", false],
  [PEX(5995825), "top", "white", "long-sleeve shirt", null, "casual", "cotton", "all", "regular", false],
  [PEX(7319172), "top", "white", "graphic t-shirt", null, "streetwear", "cotton", "summer", "oversized", false],
  // ---- BOTTOMS (4) ----
  [PEX(6044015), "bottom", "black", "ruffle mini skirt", null, "party", "polyester", "all", "cropped", false],
  [PEX(4554337), "bottom", "blue", "ripped denim shorts", "light-wash", "casual", "denim", "summer", "cropped", false],
  [PEX(7764613), "bottom", "blue", "straight jeans", null, "casual", "denim", "all", "regular", true],
  [PEX(6046228), "bottom", "brown", "wide-leg trousers", "two-tone", "casual", "cotton", "all", "relaxed", false],
  // ---- DRESSES (23) ----
  [DJ("tops/blue-frock"), "dress", "blue", "fit-and-flare dress", null, "casual", "cotton", "summer", "regular", false],
  [DJ("tops/girl-summer-dress"), "dress", "white", "palm-print maxi dress", null, "casual", "viscose", "summer", "long", false],
  [DJ("tops/gray-dress"), "dress", "beige", "button midi dress", null, "casual", "linen", "mid_season", "regular", false],
  [DJ("tops/short-frock"), "dress", "green", "strapless mini dress", null, "party", "cotton", "summer", "cropped", false],
  [DJ("tops/tartan-dress"), "dress", "gray", "plaid skater dress", "check", "casual", "cotton", "all", "regular", false],
  [DJ("womens-dresses/black-women's-gown"), "dress", "black", "evening gown", null, "elegant", "silk", "all", "long", false],
  [DJ("womens-dresses/corset-leather-with-skirt"), "dress", "black", "leather corset dress", null, "party", "leather", "all", "slim", false],
  [DJ("womens-dresses/corset-with-black-skirt"), "dress", "black", "corset mini dress", null, "party", "polyester", "summer", "slim", false],
  [DJ("womens-dresses/dress-pea"), "dress", "white", "polka-dot midi dress", "polka-dot", "casual", "cotton", "summer", "regular", true],
  [DJ("womens-dresses/marni-red-&-black-suit"), "dress", "red", "color-block midi dress", "burgundy", "elegant", "viscose", "all", "slim", false],
  [PEX(19895956), "dress", "red", "pleated ruffle dress", null, "party", "polyester", "summer", "regular", false],
  [PEX(19895958), "dress", "black", "slip dress", null, "elegant", "silk", "all", "slim", false],
  [PEX(19895978), "dress", "white", "rose-applique dress", "floral", "elegant", "silk", "mid_season", "regular", false],
  [PEX(19895977), "dress", "yellow", "color-block dress", null, "casual", "cotton", "summer", "regular", false],
  [PEX(1943846), "dress", "black", "polka-dot tea dress", "polka-dot", "elegant", "cotton", "all", "regular", false],
  [PEX(14513896), "dress", "black", "spaghetti-strap dress", null, "elegant", "viscose", "summer", "slim", false],
  [PEX(28907989), "dress", "white", "pleated midi dress", null, "elegant", "polyester", "all", "regular", false],
  [PEX(39070293), "dress", "white", "lace wedding gown", null, "elegant", "silk", "all", "long", false],
  [PEX(5608073), "dress", "red", "cocktail dress", null, "party", "silk", "all", "slim", false],
  [PEX(8618977), "dress", "white", "floral sundress", "floral", "casual", "cotton", "summer", "regular", false],
  [PEX(8619007), "dress", "pink", "slip dress", null, "party", "silk", "summer", "slim", false],
  [PEX(27399479), "dress", "white", "wedding dress", null, "elegant", "silk", "all", "long", false],
  [PEX(7166021), "dress", "beige", "linen sundress", null, "casual", "linen", "summer", "regular", false],
  [PEX(37728680), "dress", "white", "lace bridal gown", null, "elegant", "silk", "all", "long", false],
  // ---- OUTERWEAR (12) ----
  [PEX(3093408), "outerwear", "orange", "tailored blazer", null, "formal", "wool", "mid_season", "regular", false],
  [PEX(7671167), "outerwear", "white", "blazer", null, "formal", "polyester", "all", "slim", false],
  [PEX(19129082), "outerwear", "green", "tailored coat", null, "elegant", "wool", "winter", "regular", false],
  [PEX(18999079), "outerwear", "red", "velvet blazer", null, "party", "polyester", "mid_season", "regular", false],
  [PEX(19129083), "outerwear", "blue", "suit jacket", null, "formal", "wool", "all", "slim", false],
  [PEX(19060012), "outerwear", "purple", "blazer", null, "elegant", "polyester", "all", "regular", false],
  [PEX(19129081), "outerwear", "red", "blazer", null, "formal", "wool", "mid_season", "slim", true],
  [PEX(19014598), "outerwear", "purple", "suit jacket", null, "formal", "wool", "all", "regular", false],
  [PEX(19289551), "outerwear", "red", "tailored jacket", null, "formal", "polyester", "mid_season", "slim", false],
  [PEX(18999081), "outerwear", "red", "checkered blazer", "check", "formal", "wool", "mid_season", "regular", false],
  [PEX(5329157), "outerwear", "brown", "field jacket", null, "casual", "cotton", "mid_season", "relaxed", false],
  [PEX(36180266), "outerwear", "beige", "camel coat", null, "elegant", "wool", "winter", "long", false],
  // ---- FOOTWEAR (32, cutLength null) ----
  [DJ("mens-shoes/nike-air-jordan-1-red-and-black"), "footwear", "red", "high-top sneakers", null, "sport", "leather", "all", null, false],
  [DJ("mens-shoes/nike-baseball-cleats"), "footwear", "white", "baseball cleats", null, "sport", "polyester", "all", null, false],
  [DJ("mens-shoes/puma-future-rider-trainers"), "footwear", "yellow", "retro sneakers", null, "sport", "polyester", "all", null, false],
  [DJ("mens-shoes/sports-sneakers-off-white-&-red"), "footwear", "white", "leather sneakers", null, "casual", "leather", "all", null, true],
  [DJ("womens-shoes/black-&-brown-slipper"), "footwear", "black", "slippers", null, "casual", "leather", "all", null, false],
  [DJ("womens-shoes/calvin-klein-heel-shoes"), "footwear", "black", "heeled mules", null, "elegant", "leather", "all", null, false],
  [DJ("womens-shoes/golden-shoes-woman"), "footwear", "yellow", "metallic heels", "gold", "party", "leather", "all", null, false],
  [DJ("womens-shoes/pampi-shoes"), "footwear", "black", "ballet flats", null, "casual", "leather", "all", null, false],
  [DJ("womens-shoes/red-shoes"), "footwear", "red", "ballet flats", null, "elegant", "leather", "all", null, false],
  ["https://i.imgur.com/qNOjJje.jpeg", "footwear", "gray", "soccer cleats", "holographic", "sport", "polyester", "all", null, false],
  ["https://i.imgur.com/62gGzeF.jpeg", "footwear", "pink", "glitter heels", "glitter", "party", "polyester", "all", null, false],
  ["https://i.imgur.com/9qrmE1b.jpeg", "footwear", "blue", "denim espadrilles", null, "casual", "denim", "summer", null, false],
  ["https://i.imgur.com/hKcMNJs.jpeg", "footwear", "orange", "chunky sneakers", null, "sport", "polyester", "all", null, false],
  ["https://i.imgur.com/mcW42Gi.jpeg", "footwear", "pink", "canvas sneakers", null, "casual", "cotton", "all", null, false],
  ["https://i.imgur.com/npLfCGq.jpeg", "footwear", "gray", "metallic high-tops", "silver", "streetwear", "leather", "all", null, false],
  ["https://i.imgur.com/AzAY4Ed.jpeg", "footwear", "gray", "patent heeled sandals", null, "elegant", "leather", "all", null, false],
  ["https://i.imgur.com/Au8J9sX.jpeg", "footwear", "purple", "leather loafers", null, "formal", "leather", "all", null, false],
  ["https://i.imgur.com/sC0ztOB.jpeg", "footwear", "blue", "suede loafers", null, "casual", "leather", "all", null, false],
  [PEX(30128844), "footwear", "black", "high-top sneakers", null, "streetwear", "cotton", "all", null, false],
  [PEX(28821783), "footwear", "beige", "rhinestone heels", null, "party", "leather", "all", null, false],
  [PEX(1456733), "footwear", "gray", "knit runners", null, "sport", "knit", "all", null, false],
  [PEX(18202566), "footwear", "white", "sneakers", null, "sport", "leather", "all", null, true],
  [PEX(3682290), "footwear", "red", "strappy sandals", null, "party", "leather", "summer", null, false],
  [PEX(27204296), "footwear", "black", "high-heel pumps", null, "elegant", "leather", "all", null, false],
  [PEX(18641850), "footwear", "beige", "nude heels", null, "elegant", "leather", "all", null, false],
  [PEX(20547378), "footwear", "black", "two-tone sneakers", null, "casual", "leather", "all", null, false],
  [PEX(11324526), "footwear", "white", "sneakers", null, "sport", "cotton", "all", null, false],
  [PEX(39525839), "footwear", "white", "sneakers", null, "streetwear", "cotton", "all", null, false],
  [PEX(35618110), "footwear", "white", "sneakers", null, "casual", "cotton", "all", null, false],
  [PEX(9397837), "footwear", "brown", "chukka boots", null, "casual", "leather", "all", null, false],
  [PEX(3782771), "footwear", "black", "ankle-strap heels", null, "elegant", "leather", "all", null, false],
];

const AI_CATEGORY = { top: "top", bottom: "bottom", dress: "top", outerwear: "outerwear", footwear: "footwear" };
const WORN_DATES = ["2026-10-02T09:00:00.000Z", "2026-10-01T09:00:00.000Z", "2026-09-30T09:00:00.000Z", "2026-09-29T09:00:00.000Z"];
let wornIdx = 0;

const garments = ROWS.map((row, i) => {
  const [imageUrl, garmentType, color, specific, shade, style, material, season, cut, dirty] = row;
  const created = new Date(Date.UTC(2026, 7, 6, 10, 0, 0) + i * 86_400_000);
  const extraTags = { aiCategory: AI_CATEGORY[garmentType] };
  if (specific) extraTags.specificType = specific;
  if (shade) extraTags.colorShade = shade;
  return {
    garmentId: randomUUID(),
    userId: USER_ID,
    imageUrl,
    garmentType,
    style,
    cutLength: cut,
    color,
    material,
    season,
    isDirty: dirty,
    lastWornDate: dirty ? WORN_DATES[wornIdx++ % WORN_DATES.length] : null,
    isExternalGarment: false,
    extraTags,
    createdAt: created.toISOString(),
  };
});

if (garments.length !== 100) throw new Error(`Expected 100 garments, got ${garments.length}`);

const outPath = join(dirname(fileURLToPath(import.meta.url)), "garments_mock.json");
writeFileSync(outPath, JSON.stringify(garments, null, 2) + "\n");
console.log(`Wrote ${garments.length} garments to ${outPath}`);
