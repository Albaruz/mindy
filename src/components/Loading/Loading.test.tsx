import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Loading } from "./Loading";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("Loading", () => {
  it("renders a busy status region with the pending copy", () => {
    render(<Loading />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("loadingMessage")).toBeInTheDocument();
  });

  it("renders the intro artwork as decoration", () => {
    const { container } = render(<Loading />);
    const art = container.querySelector("img");
    expect(art).toHaveAttribute("src", "/images/loading-transparent.png");
    expect(art).toHaveAttribute("alt", "");
  });
});
