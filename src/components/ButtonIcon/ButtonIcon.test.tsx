import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ButtonIcon } from "./ButtonIcon";

const icon = <svg data-testid="button-icon-glyph" />;

describe("ButtonIcon", () => {
  it("exposes the label as accessible name and hides the icon", () => {
    render(<ButtonIcon label="Wash garment" icon={icon} />);

    const button = screen.getByRole("button", { name: "Wash garment" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).not.toHaveAttribute("aria-pressed");
    expect(screen.getByTestId("button-icon-glyph").parentElement).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("forwards the toggle state through aria-pressed", () => {
    render(<ButtonIcon label="Favorite" icon={icon} pressed />);

    expect(screen.getByRole("button", { name: "Favorite" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("fires the click handler", async () => {
    const onClick = vi.fn();
    render(<ButtonIcon label="Edit" icon={icon} onClick={onClick} />);

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire while disabled", async () => {
    const onClick = vi.fn();
    render(<ButtonIcon label="Edit" icon={icon} onClick={onClick} disabled />);

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders every visual variant", () => {
    render(
      <>
        <ButtonIcon label="Surface" icon={icon} variant="surface" />
        <ButtonIcon label="Favorite" icon={icon} variant="favorite" />
        <ButtonIcon
          label="Favorite active"
          icon={icon}
          variant="favorite-active"
        />
      </>,
    );

    expect(screen.getByRole("button", { name: "Surface" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Favorite" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Favorite active" }),
    ).toBeInTheDocument();
  });
});
