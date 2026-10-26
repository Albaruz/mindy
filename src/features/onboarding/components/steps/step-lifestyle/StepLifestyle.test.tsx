import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LIFESTYLES } from "@/constants/profile";
import { useOnboardingStore } from "@/features/onboarding/state/onboarding-store/onboardingStore";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "es",
}));

import { StepLifestyle } from "./StepLifestyle";

beforeEach(() => {
  useOnboardingStore.getState().reset();
});

describe("StepLifestyle", () => {
  it("renders a separate option for each daily routine", () => {
    render(<StepLifestyle />);
    for (const lifestyle of LIFESTYLES) {
      expect(screen.getByDisplayValue(lifestyle)).toBeInTheDocument();
    }
  });

  it("saves the selected routine independently", async () => {
    const user = userEvent.setup();
    useOnboardingStore.getState().setStyle("boho");
    render(<StepLifestyle />);

    await user.click(screen.getByDisplayValue("corporate_office"));

    expect(useOnboardingStore.getState().style).toBe("boho");
    expect(useOnboardingStore.getState().lifestyle).toBe("corporate_office");
  });
});
