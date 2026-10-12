import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWIPE_COMMIT_PX } from "@/constants/animations";
import type { AiLook } from "./useGeneratorStore";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

// Framer Motion drag physics cannot run in jsdom, so the motion article
// becomes a plain element with simulator buttons driving onDragEnd with
// offsets far beyond the commit threshold.
vi.mock("framer-motion", () => ({
  motion: {
    article: ({
      children,
      onDragEnd,
    }: {
      children: React.ReactNode;
      onDragEnd?: (
        event: unknown,
        info: { offset: { x: number } },
      ) => void;
    }) => (
      <article data-testid="showcase-motion">
        {children}
        <button
          type="button"
          data-testid="sim-wear"
          onClick={() => onDragEnd?.({}, { offset: { x: SWIPE_COMMIT_PX + 10 } })}
        />
        <button
          type="button"
          data-testid="sim-discard"
          onClick={() =>
            onDragEnd?.({}, { offset: { x: -(SWIPE_COMMIT_PX + 10) } })
          }
        />
        <button
          type="button"
          data-testid="sim-tap"
          onClick={() => onDragEnd?.({}, { offset: { x: 0 } })}
        />
      </article>
    ),
    span: ({ children }: { children: React.ReactNode }) => (
      <span>{children}</span>
    ),
  },
  useMotionValue: () => 0,
  useReducedMotion: () => true,
  useTransform: () => 0,
}));

import { ShowcaseCard } from "./ShowcaseCard";

function buildLook(): AiLook {
  return {
    id: "look-1",
    garments: [
      {
        garmentId: "t1",
        userId: "u1",
        imageUrl: "https://example.com/t1.jpg",
        garmentType: "top",
        style: "casual",
        cutLength: null,
        color: "black",
        material: "cotton",
        season: "all",
        isDirty: false,
        lastWornDate: null,
        isExternalGarment: false,
        extraTags: {},
        createdAt: "",
      },
    ],
    reason: "Sharp for a mild evening.",
    suitability: 87,
  };
}

const baseProps = {
  look: buildLook(),
  position: 1,
  total: 3,
  isWearing: false,
  canDiscard: true,
  onWear: () => {},
  onDiscard: () => {},
};

describe("ShowcaseCard", () => {
  it("renders garments and the stylist reason", () => {
    render(<ShowcaseCard {...baseProps} />);
    expect(screen.getByTestId("showcase-motion")).toBeInTheDocument();
    expect(screen.getByAltText("top")).toBeInTheDocument();
    expect(
      screen.getByText("Sharp for a mild evening."),
    ).toBeInTheDocument();
  });

  it("renders a placeholder when the garment has no photo", () => {
    const look = buildLook();
    look.garments[0] = { ...look.garments[0], imageUrl: null };
    render(<ShowcaseCard {...baseProps} look={look} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("top")).toBeInTheDocument();
  });

  it("wears the look on a right swipe past the threshold", async () => {
    const onWear = vi.fn();
    const onDiscard = vi.fn();
    render(
      <ShowcaseCard {...baseProps} onWear={onWear} onDiscard={onDiscard} />,
    );
    await userEvent.click(screen.getByTestId("sim-wear"));
    expect(onWear).toHaveBeenCalledTimes(1);
    expect(onDiscard).not.toHaveBeenCalled();
  });

  it("discards the look on a left swipe while budget remains", async () => {
    const onWear = vi.fn();
    const onDiscard = vi.fn();
    render(
      <ShowcaseCard {...baseProps} onWear={onWear} onDiscard={onDiscard} />,
    );
    await userEvent.click(screen.getByTestId("sim-discard"));
    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(onWear).not.toHaveBeenCalled();
  });

  it("ignores a left swipe once the discard budget is spent", async () => {
    const onDiscard = vi.fn();
    render(
      <ShowcaseCard {...baseProps} canDiscard={false} onDiscard={onDiscard} />,
    );
    await userEvent.click(screen.getByTestId("sim-discard"));
    expect(onDiscard).not.toHaveBeenCalled();
  });

  it("ignores sub-threshold drags", async () => {
    const onWear = vi.fn();
    const onDiscard = vi.fn();
    render(
      <ShowcaseCard {...baseProps} onWear={onWear} onDiscard={onDiscard} />,
    );
    await userEvent.click(screen.getByTestId("sim-tap"));
    expect(onWear).not.toHaveBeenCalled();
    expect(onDiscard).not.toHaveBeenCalled();
  });
});
