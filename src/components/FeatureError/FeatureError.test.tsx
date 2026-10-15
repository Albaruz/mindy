import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
  useLocale: () => "es",
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

import { FeatureError } from "./FeatureError";

describe("FeatureError", () => {
  it("announces itself as an alert with localized copy", () => {
    render(<FeatureError onRetry={() => {}} />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Errors.title");
    expect(alert).toHaveTextContent("Errors.message");
  });

  it("retries the failed segment on button click", async () => {
    const onRetry = vi.fn();
    render(<FeatureError onRetry={onRetry} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Common.retry" }),
    );
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("links back to the generator", () => {
    render(<FeatureError onRetry={() => {}} />);
    const home = screen.getByRole("link", { name: "Errors.home" });
    expect(home).toHaveAttribute("href", "/generator");
  });
});
