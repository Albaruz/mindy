// Mindy wardrobe seed: upserts the garments_mock.json catalog into the
// public.garments table. Mock values follow the closed vocabularies from
// src/types/garment.ts (garmentType, color, style, material, cutLength,
// season); fine detail lives in extraTags (specificType, colorShade).
//
// Run from the repo root:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... TEST_USER_ID=... npx tsx supabase/seed.ts
//
// Notes:
// - The service-role key bypasses RLS (anon key has no session here).
// - garments.user_id references profiles(user_id), so TEST_USER_ID must be
//   a signed-up user (the auto_create_profile trigger covers signups).
// - Idempotent: re-running only updates rows (conflict on garment_id).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const FALLBACK_TEST_USER_ID = "010289a4-c38d-4f47-9092-d21a53874cda";

interface MockGarment {
  garmentId: string;
  userId: string;
  imageUrl: string | null;
  garmentType: string | null;
  style: string | null;
  cutLength: string | null;
  color: string | null;
  material: string | null;
  season: string | null;
  isDirty: boolean;
  lastWornDate: string | null;
  isExternalGarment: boolean;
  extraTags: Record<string, unknown>;
  createdAt: string;
}

// Row shape of public.garments (snake_case, see
// supabase/migrations/20261002000000_create_wardrobe_schema.sql).
interface GarmentRow {
  garment_id: string;
  user_id: string;
  image_url: string | null;
  garment_type: string | null;
  style: string | null;
  cut_length: string | null;
  color: string | null;
  material: string | null;
  season: string | null;
  is_dirty: boolean;
  last_worn_date: string | null;
  is_external_garment: boolean;
  extra_tags: Record<string, unknown>;
  created_at: string;
}

function toGarmentRow(mock: MockGarment, userId: string): GarmentRow {
  return {
    garment_id: mock.garmentId,
    user_id: userId,
    image_url: mock.imageUrl,
    garment_type: mock.garmentType,
    style: mock.style,
    cut_length: mock.cutLength,
    color: mock.color,
    material: mock.material,
    season: mock.season,
    is_dirty: mock.isDirty,
    last_worn_date: mock.lastWornDate,
    is_external_garment: mock.isExternalGarment,
    extra_tags: mock.extraTags,
    created_at: mock.createdAt,
  };
}

async function main(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.",
    );
    process.exit(1);
  }
  const userId = process.env.TEST_USER_ID ?? FALLBACK_TEST_USER_ID;
  if (!process.env.TEST_USER_ID) {
    console.warn(
      `TEST_USER_ID not set, using fallback ${FALLBACK_TEST_USER_ID}. ` +
        "It must exist in auth.users (sign up once) or the FK will reject the rows.",
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Run this script from the repository root.
  const raw = readFileSync(join(process.cwd(), "supabase", "garments_mock.json"), "utf8");
  const mocks = JSON.parse(raw) as MockGarment[];
  if (!Array.isArray(mocks) || mocks.length === 0) {
    console.error("garments_mock.json holds no garments.");
    process.exit(1);
  }

  // FK guard: garments.user_id references profiles(user_id).
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (profileError) {
    console.error(`Could not check profiles: ${profileError.message}`);
    process.exit(1);
  }
  if (!profile) {
    console.error(
      `No profiles row for user_id ${userId}. Sign up / sign in once ` +
        "with that user (auto_create_profile trigger) and retry.",
    );
    process.exit(1);
  }

  const rows = mocks.map((mock) => toGarmentRow(mock, userId));
  const { data, error } = await supabase
    .from("garments")
    .upsert(rows, { onConflict: "garment_id" })
    .select("garment_id");

  if (error) {
    console.error(`Seed failed: ${error.message}`);
    process.exit(1);
  }
  console.log(`Seeded ${data?.length ?? rows.length} garments for ${userId}.`);
}

void main();
