import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders message and description", () => {
    render(<EmptyState message="No looks yet" description="Add garments" />);
    expect(screen.getByText("No looks yet")).toBeInTheDocument();
    expect(screen.getByText("Add garments")).toBeInTheDocument();
  });

  it("renders actions slot", () => {
    render(
      <EmptyState message="Empty">
        <button type="button">Add</button>
      </EmptyState>,
    );
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("exposes test id", () => {
    const { getByTestId } = render(
      <EmptyState message="Empty" testId="closet-empty" />,
    );
    expect(getByTestId("closet-empty")).toBeInTheDocument();
  });
});

describe("EmptyState keyboard", () => {
  it("activates action via keyboard", async () => {
    const onClick = vi.fn();
    render(
      <EmptyState message="Empty">
        <button type="button" onClick={onClick}>
          Add
        </button>
      </EmptyState>,
    );
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalled();
  });
});
