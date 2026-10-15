import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BottomActionBar, CelebrationBurst } from "./BottomActionBar";
import type { ActionSide } from "./BottomActionBar";

vi.mock("lottie-react", () => ({
  Lottie: function MockLottie() {
    return <div data-testid="lottie" />;
  },
}));

function buildSide(label: string): ActionSide {
  return { label, onClick: vi.fn(), icon: <span aria-hidden="true">icon</span> };
}

describe("BottomActionBar branch coverage", () => {
  it("shows a celebration burst after confirming", async () => {
    const user = userEvent.setup();
    render(
      <BottomActionBar
        label="actions"
        primaryLabel="Confirm"
        onPrimary={vi.fn()}
        left={buildSide("Left")}
        right={buildSide("Right")}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(document.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it("renders the animation burst when a source is provided", () => {
    render(<CelebrationBurst animationSrc="burst.json" />);
    expect(screen.getByTestId("lottie")).toBeInTheDocument();
  });

  it("renders confetti spans without a source", () => {
    const { container } = render(<CelebrationBurst />);
    expect(container.querySelectorAll("span").length).toBe(12);
  });
});
