import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

import { StyleStep } from "./StyleStep";

describe("StyleStep", () => {
  it("renders the heading and every style option", () => {
    render(
      <StyleStep
        value="casual"
        isPending={false}
        onChange={() => {}}
        onConfirm={() => {}}
        onBack={() => {}}
      />,
    );
    expect(screen.getByTestId("generator-auto-select")).toBeInTheDocument();
    expect(screen.getByRole("heading")).toHaveTextContent("styleHeading");
    for (const style of [
      "casual",
      "formal",
      "sport",
      "elegant",
      "streetwear",
      "party",
    ]) {
      expect(screen.getByDisplayValue(style)).toBeInTheDocument();
    }
    expect(screen.getByDisplayValue("casual")).toBeChecked();
  });

  it("selects another style", async () => {
    const onChange = vi.fn();
    render(
      <StyleStep
        value="casual"
        isPending={false}
        onChange={onChange}
        onConfirm={() => {}}
        onBack={() => {}}
      />,
    );
    await userEvent.click(screen.getByDisplayValue("sport"));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("sport");
  });

  it("confirms and goes back", async () => {
    const onConfirm = vi.fn();
    const onBack = vi.fn();
    render(
      <StyleStep
        value="formal"
        isPending={false}
        onChange={() => {}}
        onConfirm={onConfirm}
        onBack={onBack}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "confirm" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: "back" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("disables confirmation while generating", () => {
    render(
      <StyleStep
        value="casual"
        isPending
        onChange={() => {}}
        onConfirm={() => {}}
        onBack={() => {}}
      />,
    );
    const confirm = screen.getByRole("button", { name: "creating" });
    expect(confirm).toBeDisabled();
  });
});
