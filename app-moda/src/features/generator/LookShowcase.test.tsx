import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AiLook } from "./useGeneratorStore";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("./ShowcaseCard", () => ({
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
  it("renders card and edit link", async () => {
    const onEditManual = vi.fn();
    render(
      <LookShowcase
        look={buildLook()}
        position={0}
        total={3}
        isWearing={false}
        canDiscard
        onWear={() => {}}
        onDiscard={() => {}}
        onEditManual={onEditManual}
      />,
    );
    expect(screen.getByTestId("generator-showcase")).toBeInTheDocument();
    expect(screen.getByTestId("showcase-card")).toHaveTextContent("look-1");
    await userEvent.click(screen.getByRole("button", { name: "editManual" }));
    expect(onEditManual).toHaveBeenCalledTimes(1);
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
