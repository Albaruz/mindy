import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "es",
}));

vi.mock("@/components/Button/Button", () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

import { SUCCESS_AUTO_ADVANCE_MS } from "@/constants/animations";
import { OnboardingSuccess } from "./OnboardingSuccess";

afterEach(() => {
  vi.useRealTimers();
});

describe("OnboardingSuccess", () => {
  it("renders the success title and CTA", () => {
    render(<OnboardingSuccess onDone={() => {}} />);
    expect(screen.getByText("successTitle")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "successCta" }),
    ).toBeInTheDocument();
  });

  it("calls onDone immediately when the CTA is clicked", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<OnboardingSuccess onDone={onDone} />);
    await user.click(screen.getByRole("button", { name: "successCta" }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("auto-advances after the configured delay", () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(<OnboardingSuccess onDone={onDone} />);
    expect(onDone).not.toHaveBeenCalled();
    vi.advanceTimersByTime(SUCCESS_AUTO_ADVANCE_MS);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
