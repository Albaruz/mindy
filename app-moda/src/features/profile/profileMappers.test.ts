import { describe, expect, it } from "vitest";
import { toProfile, type ProfileRow } from "./profileMappers";

describe("toProfile", () => {
  it("maps snake_case row to camelCase profile", () => {
    const row: ProfileRow = {
      user_id: "u1",
      skin_tone: "light",
      eye_color: "brown",
      hair_color: "black",
      chest_measurement_cm: 90,
      waist_measurement_cm: 70,
      hip_measurement_cm: 90,
      colorimetry: "summer",
      morphology: "hourglass",
      preferred_fit: "regular",
      lifestyle: "casual_daily",
      extra_preferences: null,
      created_at: "2026-01-01",
    };
    const result = toProfile(row);
    expect(result.userId).toBe("u1");
    expect(result.chestMeasurementCm).toBe(90);
    expect(result.extraPreferences).toEqual({});
  });
});
