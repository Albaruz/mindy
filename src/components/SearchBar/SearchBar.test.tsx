import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchBar } from "./SearchBar";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("SearchBar", () => {
  it("renders a search input with an accessible label", () => {
    render(<SearchBar value="" onChange={() => {}} />);
    const input = screen.getByRole("searchbox");
    expect(input).toHaveAttribute("type", "search");
    expect(input).toHaveAttribute("aria-label", "searchGarments");
  });

  it("uses the translated placeholder by default", () => {
    render(<SearchBar value="" onChange={() => {}} />);
    expect(screen.getByRole("searchbox")).toHaveAttribute(
      "placeholder",
      "searchPlaceholder",
    );
  });

  it("supports a custom placeholder", () => {
    render(
      <SearchBar value="" onChange={() => {}} placeholder="Find a jacket" />,
    );
    expect(screen.getByRole("searchbox")).toHaveAttribute(
      "placeholder",
      "Find a jacket",
    );
  });

  it("calls onChange synchronously on every keystroke (no debounce)", async () => {
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} />);
    await userEvent.type(screen.getByRole("searchbox"), "ab");
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenNthCalledWith(1, "a");
    expect(onChange).toHaveBeenNthCalledWith(2, "b");
  });
});
