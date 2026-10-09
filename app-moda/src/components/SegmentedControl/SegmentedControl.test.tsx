import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SegmentedControl } from "./SegmentedControl";

const OPTIONS = [
  { value: "clean", label: "Clean" },
  { value: "dirty", label: "Dirty" },
] as const;

describe("SegmentedControl", () => {
  it("renders all options in a labelled group", () => {
    render(
      <SegmentedControl
        label="Laundry"
        options={OPTIONS}
        value="clean"
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("group", { name: "Laundry" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clean" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dirty" })).toBeInTheDocument();
  });

  it("marks the active option as pressed", () => {
    render(
      <SegmentedControl
        label="Laundry"
        options={OPTIONS}
        value="dirty"
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Dirty" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Clean" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("calls onChange with the selected value", async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Laundry"
        options={OPTIONS}
        value="clean"
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Dirty" }));
    expect(onChange).toHaveBeenCalledWith("dirty");
  });
});
