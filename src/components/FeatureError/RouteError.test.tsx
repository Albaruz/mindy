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

const logError = vi.fn();
vi.mock("@/lib/logger", () => ({
  logger: { error: (...args: unknown[]) => logError(...args) },
}));

import { GeneratorError } from "./RouteError";

describe("GeneratorError boundary", () => {
  it("logs the failure with its route name and offers retry", async () => {
    const reset = vi.fn();
    const error = new Error("boom");
    render(<GeneratorError error={error} reset={reset} />);
    expect(logError).toHaveBeenCalledWith(
      "Route boundary caught render failure",
      { route: "generator", error },
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Common.retry" }),
    );
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
