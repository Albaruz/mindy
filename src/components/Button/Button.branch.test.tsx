import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "./Button";

describe("Button branch coverage", () => {
  it("applies full width styling", () => {
    render(<Button fullWidth>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" }).className).toContain("full-width");
  });

  it("applies icon-only styling", () => {
    render(
      <Button iconOnly aria-label="Close">
        X
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Close" }).className).toContain("icon-only");
  });

  it("renders large and danger variants", () => {
    render(
      <Button variant="danger" size="lg">
        Delete
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button.className).toContain("danger");
    expect(button.className).toContain("lg");
  });

  it("renders small size", () => {
    render(<Button size="sm">Tiny</Button>);
    expect(screen.getByRole("button", { name: "Tiny" }).className).toContain("sm");
  });
});
