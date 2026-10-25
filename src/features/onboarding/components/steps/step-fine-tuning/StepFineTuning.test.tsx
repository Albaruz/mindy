import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FORBIDDEN_COLOR_OPTIONS } from "@/constants/ui-config";
import { useOnboardingStore } from "@/features/onboarding/state/onboarding-store/onboardingStore";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "es",
}));

import { StepFineTuning } from "./StepFineTuning";

beforeEach(() => {
  useOnboardingStore.getState().reset();
});

describe("StepFineTuning", () => {
  it("renders the thermal slider and veto colors", () => {
    const { container } = render(<StepFineTuning />);
    expect(container.querySelector("#thermal")).toBeInTheDocument();
    for (const hex of FORBIDDEN_COLOR_OPTIONS) {
      expect(screen.getByDisplayValue(hex)).toBeInTheDocument();
    }
  });

  it("updates thermal when the slider changes", () => {
    const { container } = render(<StepFineTuning />);
    const thermal = container.querySelector("#thermal");
    expect(thermal).not.toBeNull();
    fireEvent.change(thermal!, { target: { value: "5" } });
    expect(useOnboardingStore.getState().thermal).toBe(5);
  });

  it("toggles a forbidden color on click", async () => {
    const user = userEvent.setup();
    const target = FORBIDDEN_COLOR_OPTIONS[0];
    render(<StepFineTuning />);
    await user.click(screen.getByDisplayValue(target));
    expect(useOnboardingStore.getState().forbiddenColors).toContain(target);
    await user.click(screen.getByDisplayValue(target));
    expect(useOnboardingStore.getState().forbiddenColors).not.toContain(target);
  });
});
