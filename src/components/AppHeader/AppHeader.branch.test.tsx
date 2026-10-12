import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppHeader } from "./AppHeader";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const pathnameState: { value: string | null } = { value: "/en/generator" };

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => pathnameState.value,
}));

vi.mock("@/components/TopNavigation/TopNavigation", () => ({
  TopNavigation: function MockTopNavigation() {
    return <nav data-testid="top-navigation" />;
  },
}));

vi.mock("next/image", () => ({
  default: function MockImage({ alt }: { alt: string }) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} />;
  },
}));

beforeEach(() => {
  pathnameState.value = "/en/generator";
});

describe("AppHeader branch coverage", () => {
  it("hides the header when the pathname is missing", () => {
    pathnameState.value = null;
    const { container } = render(<AppHeader />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders on nested app routes", () => {
    pathnameState.value = "/en/closet/add";
    render(<AppHeader />);
    expect(screen.getByTestId("top-navigation")).toBeInTheDocument();
  });

  it("hides on the bare locale root", () => {
    pathnameState.value = "/en/";
    const { container } = render(<AppHeader />);
    expect(container).toBeEmptyDOMElement();
  });
});
