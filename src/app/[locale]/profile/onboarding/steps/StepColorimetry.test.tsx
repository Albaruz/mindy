import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EYE_COLORS, SKIN_TONES } from "@/constants/profile";
import { useOnboardingStore } from "@/features/onboarding/onboardingStore";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "es",
}));

import { StepColorimetry } from "./StepColorimetry";

beforeEach(() => {
  useOnboardingStore.getState().reset();
});

describe("StepColorimetry", () => {
  it("renders skin, eye and jewelry options", () => {
    const { container } = render(<StepColorimetry />);
    for (const tone of SKIN_TONES) {
      expect(
        container.querySelector(`input[name="skinTone"][value="${tone}"]`),
      ).not.toBeNull();
    }
    for (const color of EYE_COLORS) {
      expect(
        container.querySelector(`input[name="eyeColor"][value="${color}"]`),
      ).not.toBeNull();
    }
    expect(
      container.querySelector('input[name="jewelry"][value="gold"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('input[name="jewelry"][value="silver"]'),
    ).not.toBeNull();
  });

  it("selects skin tone, eye color and jewelry", async () => {
    const user = userEvent.setup();
    const { container } = render(<StepColorimetry />);
    const skinOlive = container.querySelector(
      'input[name="skinTone"][value="olive"]',
    );
    const eyeGreen = container.querySelector(
      'input[name="eyeColor"][value="green"]',
    );
    const gold = container.querySelector('input[name="jewelry"][value="gold"]');
    expect(skinOlive).not.toBeNull();
    expect(eyeGreen).not.toBeNull();
    expect(gold).not.toBeNull();
    await user.click(skinOlive as HTMLElement);
    await user.click(eyeGreen as HTMLElement);
    await user.click(gold as HTMLElement);
    const state = useOnboardingStore.getState();
    expect(state.skinTone).toBe("olive");
    expect(state.eyeColor).toBe("green");
    expect(state.jewelry).toBe("gold");
  });

  it("deselects jewelry when the selected option is clicked again", async () => {
    const user = userEvent.setup();
    useOnboardingStore.getState().setJewelry("silver");
    const { container } = render(<StepColorimetry />);
    const silver = container.querySelector(
      'input[name="jewelry"][value="silver"]',
    );
    expect(silver).not.toBeNull();
    await user.click(silver as HTMLElement);
    expect(useOnboardingStore.getState().jewelry).toBe("");
  });
});
