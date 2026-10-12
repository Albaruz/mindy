import type { Colorimetry, Morphology } from "@/types/user";

export interface InferenceInput {
  skinTone: string;
  eyeColor: string;
  hairColor: string;
  chestCm: number;
  waistCm: number;
  hipCm: number;
}

// MVP simulation: static conditional rules inferring colorimetry and
// morphology from self-reported traits. Replace with the biometric model
// (or an LLM call) once available; the wizard contract stays unchanged.
export function inferProfile(input: InferenceInput): {
  colorimetry: Colorimetry;
  morphology: Morphology;
} {
  const { chestCm: chest, waistCm: waist, hipCm: hip } = input;

  let morphology: Morphology;
  if (hip - chest > 3) {
    morphology = "triangle";
  } else if (chest - hip > 3) {
    morphology = "inverted_triangle";
  } else if (chest - waist > 12 && hip - waist > 12) {
    morphology = "hourglass";
  } else if (waist >= chest - 3 && waist >= hip - 3) {
    morphology = "oval";
  } else {
    morphology = "rectangle";
  }

  const skin = input.skinTone.toLowerCase();
  const hair = input.hairColor.toLowerCase();

  let colorimetry: Colorimetry;
  if (skin === "brown" || skin === "deep") {
    colorimetry = "winter";
  } else if (
    (skin === "olive" || skin === "medium") &&
    (hair === "black" || hair === "brown")
  ) {
    colorimetry = "autumn";
  } else if (
    (skin === "fair" || skin === "light") &&
    (hair === "blonde" || hair === "red")
  ) {
    colorimetry = "spring";
  } else {
    colorimetry = "summer";
  }

  return { colorimetry, morphology };
}
