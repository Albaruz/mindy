import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BottomActionBar } from "./BottomActionBar";
import type { ActionSide } from "./BottomActionBar";

vi.mock("lottie-react", () => ({
  Lottie: () => <div data-testid="lottie" />,
}));

function side(overrides: Partial<ActionSide> = {}): ActionSide {
  return {
    label: "side",
    onClick: vi.fn(),
    icon: <span aria-hidden="true">icon</span>,
    ...overrides,
  };
}

function renderBar(overrides = {}) {
  const onPrimary = vi.fn();
  render(
    <BottomActionBar
      label="actions"
      primaryLabel="Confirm"
      onPrimary={onPrimary}
      left={side({ label: "Left" })}
      right={side({ label: "Right" })}
      {...overrides}
    />,
  );
  return { onPrimary };
}

describe("BottomActionBar", () => {
  it("renders primary, left and right actions", () => {
    renderBar();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Left" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Right" })).toBeInTheDocument();
  });

  it("calls onPrimary when the primary action is clicked", async () => {
    const { onPrimary } = renderBar();
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onPrimary).toHaveBeenCalledTimes(1);
  });

  it("calls side action handlers", async () => {
    const left = side({ label: "Left" });
    const right = side({ label: "Right" });
    render(
      <BottomActionBar
        label="actions"
        primaryLabel="Confirm"
        onPrimary={vi.fn()}
        left={left}
        right={right}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Left" }));
    await userEvent.click(screen.getByRole("button", { name: "Right" }));
    expect(left.onClick).toHaveBeenCalledTimes(1);
    expect(right.onClick).toHaveBeenCalledTimes(1);
  });

  it("renders the extraRight action when provided", async () => {
    const extra = side({ label: "Extra" });
    renderBar({ extraRight: extra });
    await userEvent.click(screen.getByRole("button", { name: "Extra" }));
    expect(extra.onClick).toHaveBeenCalledTimes(1);
  });

  it("does not render extraRight when omitted", () => {
    renderBar();
    expect(screen.queryByRole("button", { name: "Extra" })).not.toBeInTheDocument();
  });

  it("disables primary when primaryDisabled", async () => {
    const { onPrimary } = renderBar({ primaryDisabled: true });
    const primary = screen.getByRole("button", { name: "Confirm" });
    expect(primary).toBeDisabled();
    await userEvent.click(primary);
    expect(onPrimary).not.toHaveBeenCalled();
  });

  it("disables primary while pending", () => {
    renderBar({ isPrimaryPending: true });
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
  });

  it("disables a side action when disabled", () => {
    renderBar({ left: side({ label: "Left", disabled: true }) });
    expect(screen.getByRole("button", { name: "Left" })).toBeDisabled();
  });
});
