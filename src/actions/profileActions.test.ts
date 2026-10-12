// @vitest-environment node
// Unit tests for saveProfileAction: validation, auth guard, success mapping.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/serverLocale", () => ({
  resolveRequestLocale: vi.fn(async () => "es"),
}));

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { saveProfileAction, type SaveProfileInput } from "./profileActions";

const mockCreateClient = vi.mocked(createClient);
const mockRevalidatePath = vi.mocked(revalidatePath);

function validInput(overrides: Partial<SaveProfileInput> = {}): SaveProfileInput {
  return {
    skinTone: "medium",
    eyeColor: "brown",
    chestMeasurementCm: 92,
    waistMeasurementCm: 76,
    hipMeasurementCm: 98,
    colorimetry: "autumn",
    morphology: "rectangle",
    preferredFit: "regular",
    lifestyle: "casual_daily",
    extraPreferences: {
      displayName: "Ada Lovelace",
      section: "women",
      style: "minimalist",
      jewelry: "gold",
      thermostat: 3,
      forbiddenColors: [],
    },
    ...overrides,
  };
}

interface MockSupabaseOptions {
  user: { id: string } | null;
  existing?: Record<string, unknown> | null;
  upsertError?: { message: string } | null;
  throwOn?: "getUser" | "upsert" | null;
}

function mockSupabase({
  user,
  existing = null,
  upsertError = null,
  throwOn = null,
}: MockSupabaseOptions) {
  const upsert = vi.fn(async () => {
    if (throwOn === "upsert") {
      throw new Error("db unreachable");
    }
    return { error: upsertError };
  });
  const maybeSingle = vi.fn(async () => ({ data: existing }));
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select, upsert }));
  const getUser = vi.fn(async () => {
    if (throwOn === "getUser") {
      throw new Error("auth down");
    }
    return { data: { user } };
  });
  mockCreateClient.mockResolvedValue({
    auth: { getUser },
    from,
  } as unknown as Awaited<ReturnType<typeof createClient>>);
  return { from, select, eq, maybeSingle, upsert, getUser };
}

describe("saveProfileAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects an invalid skin tone without touching the database", async () => {
    const result = await saveProfileAction(
      validInput({ skinTone: "ultraviolet" }),
    );
    expect(result.error).toBe("Select a valid skin tone.");
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("rejects out-of-range measurements", async () => {
    const result = await saveProfileAction(
      validInput({ chestMeasurementCm: 5 }),
    );
    expect(result.error).toBe(
      "Measurements must be whole centimeters between 20 and 300.",
    );
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("rejects a too-short display name", async () => {
    const result = await saveProfileAction(
      validInput({
        extraPreferences: {
          displayName: "A",
          section: "women",
          style: "minimalist",
          jewelry: "gold",
          thermostat: 3,
          forbiddenColors: [],
        },
      }),
    );
    expect(result.error).toBe("Tell us your name (2-40 characters).");
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("rejects an unknown vetoed color", async () => {
    const result = await saveProfileAction(
      validInput({
        extraPreferences: {
          displayName: "Ada",
          section: "women",
          style: "minimalist",
          jewelry: "gold",
          thermostat: 3,
          forbiddenColors: ["#123456"],
        },
      }),
    );
    expect(result.error).toBe("Select valid vetoed colors.");
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("requires authentication before saving", async () => {
    mockSupabase({ user: null });
    const result = await saveProfileAction(validInput());
    expect(result.error).toBe("You must be signed in to save your profile.");
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("maps the payload and revalidates the localized profile path", async () => {
    const { from, upsert } = mockSupabase({ user: { id: "user-1" } });
    const result = await saveProfileAction(
      validInput({
        extraPreferences: {
          displayName: "  Ada  ",
          section: "women",
          style: "minimalist",
          jewelry: "gold",
          thermostat: 3,
          forbiddenColors: ["#1a1a1a"],
        },
      }),
    );
    expect(result).toEqual({ error: null });
    expect(from).toHaveBeenCalledWith("profiles");
    expect(upsert).toHaveBeenCalledOnce();
    const [row, options] = upsert.mock.calls[0] as unknown as [
      Record<string, unknown>,
      Record<string, unknown>,
    ];
    expect(row["user_id"]).toBe("user-1");
    expect(row["chest_measurement_cm"]).toBe(92);
    expect(
      (row["extra_preferences"] as Record<string, unknown>)["displayName"],
    ).toBe("Ada");
    expect(options).toEqual({ onConflict: "user_id" });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/es/profile");
  });

  it("merges stored extra preferences instead of dropping unknown keys", async () => {
    const { upsert } = mockSupabase({
      user: { id: "user-1" },
      existing: {
        extra_preferences: { legacyKey: "keep-me" },
      },
    });
    const result = await saveProfileAction(validInput());
    expect(result).toEqual({ error: null });
    const [row] = upsert.mock.calls[0] as unknown as [
      Record<string, unknown>,
    ];
    expect(
      (row["extra_preferences"] as Record<string, unknown>)["legacyKey"],
    ).toBe("keep-me");
  });

  it("returns a friendly error when the upsert fails", async () => {
    mockSupabase({
      user: { id: "user-1" },
      upsertError: { message: "duplicate" },
    });
    const result = await saveProfileAction(validInput());
    expect(result.error).toBe("Could not save your profile. Try again.");
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("returns a database-unreachable error when the client throws", async () => {
    mockSupabase({ user: { id: "user-1" }, throwOn: "upsert" });
    const result = await saveProfileAction(validInput());
    expect(result.error).toBe("Could not reach the database. Try again.");
  });
});
