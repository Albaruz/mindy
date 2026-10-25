import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SHOP_SECTIONS, STYLE_TRIBES } from "@/constants/ui-config";
import { useOnboardingStore } from "@/features/onboarding/state/onboarding-store/onboardingStore";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "es",
}));

import { StepIdentity } from "./StepIdentity";

beforeEach(() => {
  useOnboardingStore.getState().reset();
});

describe("StepIdentity", () => {
  it("renders section and style options", () => {
    render(<StepIdentity />);
    for (const section of SHOP_SECTIONS) {
      expect(screen.getByDisplayValue(section)).toBeInTheDocument();
    }
    for (const style of STYLE_TRIBES) {
      expect(screen.getByDisplayValue(style)).toBeInTheDocument();
    }
  });

  it("selects a shopping section on click", async () => {
    const user = userEvent.setup();
    render(<StepIdentity />);
    await user.click(screen.getByDisplayValue("men"));
    expect(useOnboardingStore.getState().section).toBe("men");
    expect(screen.getByDisplayValue("men")).toBeChecked();
  });

  it("selects a style tribe on click", async () => {
    const user = userEvent.setup();
    render(<StepIdentity />);
    await user.click(screen.getByDisplayValue("boho"));
    expect(useOnboardingStore.getState().style).toBe("boho");
    expect(screen.getByDisplayValue("boho")).toBeChecked();
  });

  it("greets the user by first name when the store has one", () => {
    useOnboardingStore.getState().setDisplayName("Ada Lovelace");
    render(<StepIdentity />);
    expect(screen.getByText("identityTitleNamed")).toBeInTheDocument();
  });
});
