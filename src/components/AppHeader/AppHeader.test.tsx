import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppHeader } from "./AppHeader";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const pathnameState = { value: "/en/generator" };

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => pathnameState.value,
}));

vi.mock("@/components/TopNavigation/TopNavigation", () => ({
  TopNavigation: () => <nav data-testid="top-navigation" />,
}));

vi.mock("next/dynamic", () => ({
  default: () => () => <nav data-testid="top-navigation" />,
}));

vi.mock("next/image", () => ({
  default: ({
    alt,
    ...props
  }: {
    alt: string;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} {...props} />
  ),
}));

beforeEach(() => {
  pathnameState.value = "/en/generator";
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

describe("AppHeader", () => {
  it("renders the logo and navigation on app routes", () => {
    render(<AppHeader />);
    expect(screen.getByRole("img", { name: "Mindy" })).toBeInTheDocument();
    expect(screen.getByTestId("top-navigation")).toBeInTheDocument();
  });

  it.each(["/", "/en", "/es", "/en/forgot-password", "/en/reset-password"])(
    "hides the header on %s",
    (pathname) => {
      pathnameState.value = pathname;
      const { container } = render(<AppHeader />);
      expect(container).toBeEmptyDOMElement();
    },
  );
});
