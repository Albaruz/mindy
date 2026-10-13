import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockReplace } = vi.hoisted(() => ({ mockReplace: vi.fn() }));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/en/settings",
}));

import { SettingsControls } from "./SettingsControls";
import { useThemeStore } from "./themeStore";

describe("SettingsControls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useThemeStore.setState({ mode: "system" });
  });

  it("renders language and theme groups", () => {
    render(<SettingsControls />);
    expect(screen.getByRole("group", { name: "language" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "theme" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("switches the theme mode when a theme option is clicked", async () => {
    render(<SettingsControls />);
    await userEvent.click(
      screen.getByRole("button", { name: "themeDark" }),
    );
    expect(useThemeStore.getState().mode).toBe("dark");
    expect(
      screen.getByRole("button", { name: "themeDark" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("navigates to the other locale when its language is clicked", async () => {
    render(<SettingsControls />);
    await userEvent.click(
      screen.getByRole("button", { name: "Español" }),
    );
    expect(mockReplace).toHaveBeenCalledWith("/en/settings", {
      locale: "es",
      scroll: false,
    });
  });

  it("does not navigate when the active language is clicked", async () => {
    render(<SettingsControls />);
    await userEvent.click(screen.getByRole("button", { name: "English" }));
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
