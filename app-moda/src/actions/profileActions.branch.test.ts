// @vitest-environment node
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

import { createClient } from "@/lib/supabase/server";
import { saveProfileAction, type SaveProfileInput } from "./profileActions";

const mockCreateClient = vi.mocked(createClient);

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

function mockAuthenticated() {
  mockCreateClient.mockResolvedValue({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: "user-9" } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: null })),
        })),
      })),
      upsert: vi.fn(async () => ({ error: null })),
    })),
  } as unknown as Awaited<ReturnType<typeof createClient>>);
}

describe("saveProfileAction branch coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects an invalid eye color", async () => {
    const result = await saveProfileAction(
      validInput({ eyeColor: "ultraviolet" }),
    );
    expect(result.error).toBe("Select a valid eye color.");
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("rejects non-integer measurements", async () => {
    const result = await saveProfileAction(
      validInput({ chestMeasurementCm: 92.5 }),
    );
    expect(result.error).toBe(
      "Measurements must be whole centimeters between 20 and 300.",
    );
  });

  it("rejects an invalid inferred colorimetry", async () => {
    const result = await saveProfileAction(
      validInput({ colorimetry: "neon" as SaveProfileInput["colorimetry"] }),
    );
    expect(result.error).toBe("Invalid inferred colorimetry.");
  });

  it("rejects an invalid inferred morphology", async () => {
    const result = await saveProfileAction(
      validInput({ morphology: "blob" as SaveProfileInput["morphology"] }),
    );
    expect(result.error).toBe("Invalid inferred morphology.");
  });

  it("rejects an invalid preferred fit", async () => {
    const result = await saveProfileAction(
      validInput({ preferredFit: "baggy" as SaveProfileInput["preferredFit"] }),
    );
    expect(result.error).toBe("Select a valid preferred fit.");
  });

  it("rejects an invalid lifestyle", async () => {
    const result = await saveProfileAction(
      validInput({ lifestyle: "party" as SaveProfileInput["lifestyle"] }),
    );
    expect(result.error).toBe("Select a valid lifestyle.");
  });

  it("rejects missing style preferences", async () => {
    const input = validInput();
    input.extraPreferences = null as unknown as SaveProfileInput["extraPreferences"];
    const result = await saveProfileAction(input);
    expect(result.error).toBe("Missing style preferences.");
  });

  it("rejects an overlong display name", async () => {
    const result = await saveProfileAction(
      validInput({
        extraPreferences: {
          displayName: "A".repeat(41),
          section: "women",
          style: "minimalist",
          jewelry: "gold",
          thermostat: 3,
          forbiddenColors: [],
        },
      }),
    );
    expect(result.error).toBe("Tell us your name (2-40 characters).");
  });

  it("rejects an invalid shopping section", async () => {
    const result = await saveProfileAction(
      validInput({
        extraPreferences: {
          displayName: "Ada",
          section: "kids",
          style: "minimalist",
          jewelry: "gold",
          thermostat: 3,
          forbiddenColors: [],
        },
      }),
    );
    expect(result.error).toBe("Select a valid shopping section.");
  });

  it("rejects an invalid style", async () => {
    const result = await saveProfileAction(
      validInput({
        extraPreferences: {
          displayName: "Ada",
          section: "women",
          style: "goth",
          jewelry: "gold",
          thermostat: 3,
          forbiddenColors: [],
        },
      }),
    );
    expect(result.error).toBe("Select a valid style.");
  });

  it("rejects an out-of-range thermal level", async () => {
    const result = await saveProfileAction(
      validInput({
        extraPreferences: {
          displayName: "Ada",
          section: "women",
          style: "minimalist",
          jewelry: "gold",
          thermostat: 99,
          forbiddenColors: [],
        },
      }),
    );
    expect(result.error).toBe("Select a valid thermal level.");
  });

  it("rejects a non-array forbidden color list", async () => {
    const result = await saveProfileAction(
      validInput({
        extraPreferences: {
          displayName: "Ada",
          section: "women",
          style: "minimalist",
          jewelry: "gold",
          thermostat: 3,
          forbiddenColors: "black" as unknown as string[],
        },
      }),
    );
    expect(result.error).toBe("Select valid vetoed colors.");
  });

  it("treats a non-object stored preference as empty", async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: "user-9" } } })),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({
              data: { extra_preferences: "legacy-string" },
            })),
          })),
        })),
        upsert: vi.fn(async () => ({ error: null })),
      })),
    } as unknown as Awaited<ReturnType<typeof createClient>>);
    const result = await saveProfileAction(validInput());
    expect(result).toEqual({ error: null });
  });

  it("reports an authentication lookup failure as unreachable", async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => {
          throw new Error("auth down");
        }),
      },
      from: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof createClient>>);
    const result = await saveProfileAction(validInput());
    expect(result.error).toBe("Could not reach the database. Try again.");
  });

  it("accepts every valid enum combination", async () => {
    mockAuthenticated();
    const result = await saveProfileAction(
      validInput({
        skinTone: "deep",
        eyeColor: "gray",
        colorimetry: "winter",
        morphology: "oval",
        preferredFit: "mixed",
        lifestyle: "social_events",
      }),
    );
    expect(result).toEqual({ error: null });
  });
});
