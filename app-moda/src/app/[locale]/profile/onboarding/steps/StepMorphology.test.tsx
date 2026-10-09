import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FIT_CHOICES } from "@/constants/ui-config";
import { useOnboardingStore } from "@/features/onboarding/onboardingStore";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "es",
}));

vi.mock("next/image", () => ({
  default: ({ alt, ...props }: { alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} {...props} />
  ),
}));

import { StepMorphology } from "./StepMorphology";

beforeEach(() => {
  useOnboardingStore.getState().reset();
});

describe("StepMorphology", () => {
  it("renders three measurement sliders and fit choices", () => {
    const { container } = render(<StepMorphology />);
    expect(container.querySelector("#chestCm")).toBeInTheDocument();
    expect(container.querySelector("#waistCm")).toBeInTheDocument();
    expect(container.querySelector("#hipCm")).toBeInTheDocument();
    for (const fit of FIT_CHOICES) {
      expect(screen.getByDisplayValue(fit)).toBeInTheDocument();
    }
  });

  it("updates a measurement when the slider changes", () => {
    const { container } = render(<StepMorphology />);
    const chest = container.querySelector("#chestCm");
    expect(chest).not.toBeNull();
    fireEvent.change(chest!, { target: { value: "100" } });
    expect(useOnboardingStore.getState().chestCm).toBe(100);
  });

  it("selects a fit on click", async () => {
    const user = userEvent.setup();
    render(<StepMorphology />);
    await user.click(screen.getByDisplayValue("regular"));
    expect(useOnboardingStore.getState().fit).toBe("regular");
    expect(screen.getByDisplayValue("regular")).toBeChecked();
  });
});
