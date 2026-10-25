import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useOnboardingStore } from "@/features/onboarding/state/onboarding-store/onboardingStore";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "es",
}));

import { StepWelcome } from "./StepWelcome";

beforeEach(() => {
  useOnboardingStore.getState().reset();
});

describe("StepWelcome", () => {
  it("renders the name input with an empty store value", () => {
    render(<StepWelcome />);
    const input = screen.getByLabelText("nameLabel");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("");
  });

  it("updates the store when typing a display name", async () => {
    const user = userEvent.setup();
    render(<StepWelcome />);
    const input = screen.getByLabelText("nameLabel");
    await user.type(input, "Ada");
    expect(input).toHaveValue("Ada");
    expect(useOnboardingStore.getState().displayName).toBe("Ada");
  });

  it("reflects a prefilled store value", () => {
    useOnboardingStore.getState().setDisplayName("Grace");
    render(<StepWelcome />);
    expect(screen.getByLabelText("nameLabel")).toHaveValue("Grace");
  });
});
