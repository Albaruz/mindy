import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

import { InsufficientStyleEmpty } from "./InsufficientStyleEmpty";

describe("InsufficientStyleEmpty", () => {
  it("shows the shortage message with both escape actions", async () => {
    const onChooseAnother = vi.fn();
    const onManual = vi.fn();
    render(
      <InsufficientStyleEmpty
        onChooseAnother={onChooseAnother}
        onManual={onManual}
      />,
    );
    const state = screen.getByTestId("generator-style-shortage");
    expect(state).toBeInTheDocument();
    expect(state).toHaveTextContent("limitMessage");

    await userEvent.click(
      screen.getByRole("button", { name: "chooseAnother" }),
    );
    expect(onChooseAnother).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: "manualMode" }));
    expect(onManual).toHaveBeenCalledTimes(1);
  });
});
