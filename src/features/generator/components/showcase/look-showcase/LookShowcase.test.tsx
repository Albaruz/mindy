import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { AiLook } from "../../../state/generator-store/useGeneratorStore";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("../showcase-card/ShowcaseCard", () => ({
  ShowcaseCard: ({ look }: { look: AiLook }) => (
    <div data-testid="showcase-card">{look.id}</div>
  ),
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

import { LookShowcase, ShowcaseEmptyState } from "./LookShowcase";

function buildLook(): AiLook {
  return { id: "look-1", garments: [], reason: null, suitability: 80 };
}

describe("LookShowcase", () => {
  it("renders the swipeable card without a redundant manual edit action", () => {
    render(
      <LookShowcase
        look={buildLook()}
        position={0}
        total={3}
        isWearing={false}
        canDiscard
        onWear={() => {}}
        onDiscard={() => {}}
      />,
    );
    expect(screen.getByTestId("generator-showcase")).toBeInTheDocument();
    expect(screen.getByTestId("showcase-card")).toHaveTextContent("look-1");
    expect(screen.queryByRole("button", { name: "editManual" })).not.toBeInTheDocument();
  });
});

describe("ShowcaseEmptyState", () => {
  it("renders limit and exhausted variants", () => {
    const { rerender } = render(<ShowcaseEmptyState onManual={() => {}} />);
    expect(screen.getByTestId("generator-empty-state")).toBeInTheDocument();
    rerender(<ShowcaseEmptyState onManual={() => {}} reason="limit" />);
    expect(screen.getByText("limitMessage")).toBeInTheDocument();
  });
});
