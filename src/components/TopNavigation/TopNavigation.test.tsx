import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TopNavigation } from "./TopNavigation";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const pathnameState = { value: "/en/closet" };

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  usePathname: () => pathnameState.value,
}));

beforeEach(() => {
  pathnameState.value = "/en/closet";
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

describe("TopNavigation", () => {
  it("renders all four tabs", () => {
    render(<TopNavigation />);
    expect(screen.getByRole("tab", { name: "generator" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "closet" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "calendar" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "profile" })).toBeInTheDocument();
  });

  it("marks the tab matching the pathname as current", () => {
    pathnameState.value = "/en/closet";
    render(<TopNavigation />);
    expect(screen.getByRole("tab", { name: "closet" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("tab", { name: "generator" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("switches the active tab with the pathname", () => {
    pathnameState.value = "/es/generator";
    render(<TopNavigation />);
    expect(screen.getByRole("tab", { name: "generator" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("exposes the main navigation landmark", () => {
    render(<TopNavigation />);
    expect(
      screen.getByRole("navigation", { name: "mainNavigation" }),
    ).toBeInTheDocument();
  });
});
