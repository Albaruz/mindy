import type { Page } from "@playwright/test";

const FIXTURE_USER_ID = "00000000-0000-4000-8000-000000000001";
const FIXTURE_GARMENTS = [
  { id: "00000000-0000-4000-8000-000000000011", type: "top" },
  { id: "00000000-0000-4000-8000-000000000012", type: "bottom" },
  { id: "00000000-0000-4000-8000-000000000013", type: "footwear" },
].map(({ id, type }) => ({
  garment_id: id,
  user_id: FIXTURE_USER_ID,
  image_url: null,
  original_image_url: null,
  garment_type: type,
  style: "casual",
  cut_length: "regular",
  styles: ["casual"],
  cut_lengths: ["regular"],
  color: "black",
  material: "cotton",
  season: "all",
  is_dirty: false,
  last_worn_date: null,
  is_external_garment: false,
  extra_tags: {},
  created_at: "2026-01-01T00:00:00.000Z",
  is_favorite: false,
}));

/** Use isolated, deterministic closet data and prevent E2E writes to Supabase. */
export async function mockCloset(page: Page, initiallyDirty = false) {
  let garments = FIXTURE_GARMENTS.map((garment) => ({
    ...garment,
    is_dirty: initiallyDirty,
  }));

  await page.context().grantPermissions(["geolocation"]);
  await page.context().setGeolocation({ latitude: 40.4168, longitude: -3.7038 });
  await page.route("**/api/weather?**", async (route) => {
    await route.fulfill({
      json: {
        temperatureC: 20,
        condition: "clear",
        city: "E2E City",
        dayLow: 18,
        dayHigh: 22,
        dayCondition: "clear",
        rainProbability: 0,
        fallback: false,
      },
    });
  });

  await page.route(/\/rest\/v1\/profiles(?:\?|$)/, async (route) => {
    await route.fulfill({
      json: [
        {
          user_id: FIXTURE_USER_ID,
          skin_tone: null,
          eye_color: null,
          hair_color: null,
          chest_measurement_cm: null,
          waist_measurement_cm: null,
          hip_measurement_cm: null,
          colorimetry: null,
          morphology: null,
          preferred_fit: null,
          lifestyle: null,
          extra_preferences: { displayName: "E2E Wardrobe" },
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
  });

  await page.route(/\/rest\/v1\/garments(?:\?|$)/, async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: garments });
      return;
    }
    if (route.request().method() === "PATCH") {
      garments = garments.map((garment) => ({ ...garment, is_dirty: false }));
    }
    await route.fulfill({ json: garments });
  });

  await page.route(/\/rest\/v1\/rpc\/(record_worn_outfit|wash_all_garments)/, async (route) => {
    if (route.request().url().includes("record_worn_outfit")) {
      garments = garments.map((garment) => ({ ...garment, is_dirty: true }));
    } else {
      garments = garments.map((garment) => ({ ...garment, is_dirty: false }));
    }
    await route.fulfill({ json: null });
  });
}
