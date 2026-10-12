import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasswordInput } from "./PasswordInput";

describe("PasswordInput", () => {
  it("renders as a password field with a show toggle", () => {
    render(
      <PasswordInput showPasswordLabel="Show password" hidePasswordLabel="Hide password" />,
    );
    expect(screen.getByLabelText("Show password")).toBeInTheDocument();
    const input = document.querySelector("input");
    expect(input).toHaveAttribute("type", "password");
  });

  it("toggles visibility on click", async () => {
    render(
      <PasswordInput showPasswordLabel="Show password" hidePasswordLabel="Hide password" />,
    );
    const toggle = screen.getByRole("button", { name: "Show password" });
    await userEvent.click(toggle);
    expect(document.querySelector("input")).toHaveAttribute("type", "text");
    expect(
      screen.getByRole("button", { name: "Hide password" }),
    ).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(
      screen.getByRole("button", { name: "Hide password" }),
    );
    expect(document.querySelector("input")).toHaveAttribute("type", "password");
  });

  it("forwards input props", async () => {
    render(
      <PasswordInput
        showPasswordLabel="Show password"
        hidePasswordLabel="Hide password"
        placeholder="Enter password"
      />,
    );
    const input = screen.getByPlaceholderText("Enter password");
    await userEvent.type(input, "secret");
    expect(input).toHaveValue("secret");
  });
});
