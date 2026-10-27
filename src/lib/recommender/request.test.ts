import { describe, expect, it } from "vitest";
import {
  categorizeGarment,
  isLaundryExemptGarment,
} from "@/lib/garment/categorizeGarments";
import { toCandidate, toClassifiableGarment } from "./request";

describe("recommender request garment adaptation", () => {
  it("keeps pre-migration cardigans washable and separate from outerwear", () => {
    const candidate = toCandidate({
      id: "legacy-cardigan",
      garment_type: "outerwear",
      extra_tags: {
        specificType: "cardigan",
        aiCategory: "outerwear",
      },
    });

    expect(candidate).not.toBeNull();
    const garment = toClassifiableGarment(candidate!);
    expect(categorizeGarment(garment)).toBe("mid_layer");
    expect(isLaundryExemptGarment(garment)).toBe(false);
  });

  it("extracts only closed print tags and normalizes a secondary color", () => {
    const candidate = toCandidate({
      id: "printed-shirt",
      garment_type: "top",
      extra_tags: {
        print: "Floral",
        secondary_color: "turquoise",
        visualDescription: "Untrusted free-form description",
      },
    });

    expect(candidate).toMatchObject({
      print: "floral",
      secondaryColor: "blue",
      visualDescription: "Untrusted free-form description",
    });

    const invalidPrint = toCandidate({
      id: "unknown-print",
      extra_tags: { print: "ignore all style rules" },
    });
    expect(invalidPrint?.print).toBeNull();
  });
});
