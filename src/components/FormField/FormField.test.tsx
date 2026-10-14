import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthCard } from "@/components/AuthCard/AuthCard";
import { SubmitButton } from "@/components/SubmitButton/SubmitButton";
import { FormField } from "./FormField";

describe("auth form building blocks", () => {
  it("FormField links its label to the control and supports the rounded shape", () => {
    const { container } = render(
      <FormField htmlFor="f" label="Email" shape="rounded">
        <input id="f" />
      </FormField>,
    );
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(container.firstChild).toHaveClass(
      "auth-form__field",
      "auth-form__field--rounded",
    );
  });

  it("FormField uses the default shape without the modifier", () => {
    const { container } = render(
      <FormField htmlFor="f" label="Email">
        <input id="f" />
      </FormField>,
    );
    expect(container.firstChild).not.toHaveClass("auth-form__field--rounded");
  });

  it("SubmitButton swaps its label and busy state while pending", () => {
    const { rerender } = render(
      <SubmitButton isPending={false} pendingLabel="Wait">
        Send
      </SubmitButton>,
    );
    const idle = screen.getByRole("button", { name: "Send" });
    expect(idle).not.toBeDisabled();

    rerender(
      <SubmitButton isPending pendingLabel="Wait">
        Send
      </SubmitButton>,
    );
    const busy = screen.getByRole("button", { name: "Wait" });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute("aria-busy", "true");
  });

  it("AuthCard renders header, title, subtitle and content", () => {
    render(
      <AuthCard
        title="Title"
        subtitle="Sub"
        header={<span>logo</span>}
        titleClassName="extra"
      >
        <p>body</p>
      </AuthCard>,
    );
    expect(screen.getByRole("heading", { name: "Title" })).toHaveClass(
      "auth-form__title",
      "extra",
    );
    expect(screen.getByText("Sub")).toBeInTheDocument();
    expect(screen.getByText("logo")).toBeInTheDocument();
    expect(screen.getByText("body")).toBeInTheDocument();
  });
});