import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TopNavigation } from "./TopNavigation";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const pathnameState: { value: string | null } = { value: "/en/closet" };

vi.mock("@/i18n/navigation", () => ({
  Link: function MockLink({ href, children, ...props }: { href: string; children: React.ReactNode }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
  usePathname: () => pathnameState.value,
}));

beforeEach(() => {
  pathnameState.value = "/en/closet";
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

describe("TopNavigation branch coverage", () => {
  it("shows no active tab on unknown routes", () => {
    pathnameState.value = "/en/settings";
    render(<TopNavigation />);
    expect(screen.getByRole("tab", { name: "closet" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("tab", { name: "generator" })).not.toHaveAttribute("aria-current");
  });

  it("shows no active tab when the pathname is missing", () => {
    pathnameState.value = null;
    render(<TopNavigation />);
    expect(screen.getByRole("tab", { name: "profile" })).not.toHaveAttribute("aria-current");
  });

  it("matches nested routes under a segment", () => {
    pathnameState.value = "/en/closet/item-one";
    render(<TopNavigation />);
    expect(screen.getByRole("tab", { name: "closet" })).toHaveAttribute("aria-current", "page");
  });
});
