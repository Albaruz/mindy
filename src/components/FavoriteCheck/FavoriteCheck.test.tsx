import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FavoriteCheck } from "./FavoriteCheck";

describe("FavoriteCheck", () => {
  it("shows its label by default and exposes the checked state", () => {
    render(
      <FavoriteCheck
        selected
        label="Favorites"
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByRole("checkbox", { name: "Favorites" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByText("Favorites")).toBeInTheDocument();
  });

  it("hides the visual label only when requested and retains its accessible name", () => {
    render(
      <FavoriteCheck
        selected={false}
        label="Favorites"
        hideLabel
        onClick={vi.fn()}
      />,
    );

    const favoriteToggle = screen.getByRole("checkbox", { name: "Favorites" });
    expect(favoriteToggle.className).toContain("check--hide-label");
    expect(screen.getByText("Favorites")).toBeInTheDocument();
  });

  it("forwards user activation", async () => {
    const onClick = vi.fn();
    render(
      <FavoriteCheck
        selected={false}
        label="Favorites"
        onClick={onClick}
      />,
    );

    await userEvent.click(screen.getByRole("checkbox", { name: "Favorites" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
