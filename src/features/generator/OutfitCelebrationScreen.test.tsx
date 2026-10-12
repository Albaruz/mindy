import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Garment } from "@/types/garment";

vi.mock("next-intl", () => ({
  useTranslations: () => {
    const t = (key: string) => key;
    (t as unknown as { raw: (key: string) => string[] }).raw = (key: string) =>
      key === "celebrationLines" ? ["You look great!"] : [];
    return t;
  },
  useLocale: () => "en",
}));

// Choreography (springs, confetti, masked title) cannot run in jsdom, so
// motion primitives become plain elements keeping structure and text.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: { children: React.ReactNode } & Record<string, unknown>) => (
      <div
        role={rest.role as string}
        aria-modal={rest["aria-modal"] as boolean}
        aria-labelledby={rest["aria-labelledby"] as string}
      >
        {children}
      </div>
    ),
    h2: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
    figure: ({ children }: { children: React.ReactNode }) => (
      <figure>{children}</figure>
    ),
    span: ({ children }: { children: React.ReactNode }) => (
      <span>{children}</span>
    ),
  },
  useReducedMotion: () => true,
}));

import { OutfitCelebrationScreen } from "./OutfitCelebrationScreen";

function buildGarment(id: string, type: Garment["garmentType"]): Garment {
  return {
    garmentId: id,
    userId: "u1",
    imageUrl: `https://example.com/${id}.jpg`,
    garmentType: type,
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
  };
}

describe("OutfitCelebrationScreen", () => {
  it("displays every worn garment", () => {
    render(
      <OutfitCelebrationScreen
        garments={[buildGarment("t1", "top"), buildGarment("b1", "bottom")]}
        onClose={() => {}}
      />,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("You look great!")).toBeInTheDocument();
    expect(screen.getByAltText("top")).toBeInTheDocument();
    expect(screen.getByAltText("bottom")).toBeInTheDocument();
  });

  it("dismisses through the close button", async () => {
    const onClose = vi.fn();
    render(
      <OutfitCelebrationScreen
        garments={[buildGarment("t1", "top")]}
        onClose={onClose}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "celebrationClose" }),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("dismisses with the Escape key", async () => {
    const onClose = vi.fn();
    render(
      <OutfitCelebrationScreen
        garments={[buildGarment("t1", "top")]}
        onClose={onClose}
      />,
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
