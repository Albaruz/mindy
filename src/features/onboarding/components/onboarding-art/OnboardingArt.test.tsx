import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { OnboardingArt, type OnboardingArtStep } from "./OnboardingArt";

const STEPS: OnboardingArtStep[] = [1, 2, 3, 4, 5];

describe("OnboardingArt", () => {
  for (const step of STEPS) {
    it(`renders step ${step} illustration`, () => {
      render(<OnboardingArt step={step} label={`Step ${step}`} />);
      const figure = screen.getByRole("img", { name: `Step ${step}` });
      expect(figure).toBeInTheDocument();
      const img = figure.querySelector("img");
      expect(img?.getAttribute("src")).toContain(`onboarding-${step}-`);
    });
  }

  it("forwards className to the wrapper", () => {
    render(
      <OnboardingArt step={1} label="Step 1" className="custom-art" />,
    );
    expect(screen.getByRole("img", { name: "Step 1" })).toHaveClass(
      "custom-art",
    );
  });
});
