import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Garment } from "@/types/garment";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("swiper/css", () => ({}));
vi.mock("swiper/css/effect-coverflow", () => ({}));

vi.mock("swiper/react", () => ({
  Swiper: ({
    children,
    onSlideChange,
    onSwiper,
  }: {
    children: React.ReactNode;
    onSlideChange?: (swiper: { realIndex: number }) => void;
    onSwiper?: (swiper: {
      realIndex: number;
      slideTo: (index: number) => void;
      slideToLoop: (index: number) => void;
      slidePrev: () => void;
      slideNext: () => void;
    }) => void;
  }) => {
    onSwiper?.({
      realIndex: 0,
      slideTo: () => {},
      slideToLoop: () => {},
      slidePrev: () => {},
      slideNext: () => {},
    });
    return (
      <div data-testid="mock-swiper">
        <button
          type="button"
          data-testid="mock-slide-change"
          onClick={() => onSlideChange?.({ realIndex: 1 })}
        />
        {children}
      </div>
    );
  },
  SwiperSlide: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { CategoryCarousel } from "./CategoryCarousel";

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

const baseProps = {
  category: "top" as const,
  title: "Tops",
  garments: [buildGarment("t1", "top"), buildGarment("t2", "top")],
  activeGarmentId: "t1",
  isLocked: false,
  isLoading: false,
  onSlideChange: vi.fn(),
  onToggleLock: vi.fn(),
  onChangeGarment: vi.fn(),
};

describe("CategoryCarousel", () => {
  it("renders the title and garment slides", () => {
    render(<CategoryCarousel {...baseProps} />);
    expect(screen.getByText("Tops")).toBeInTheDocument();
    expect(screen.getByTestId("mock-swiper")).toBeInTheDocument();
    // Both slides render eagerly by default; photos carry the garment type as alt.
    expect(screen.getAllByAltText("top")).toHaveLength(2);
  });

  it("toggles the lock for its category", async () => {
    const onToggleLock = vi.fn();
    render(<CategoryCarousel {...baseProps} onToggleLock={onToggleLock} />);
    const lockButton = screen.getByRole("button", { name: "lockGarment" });
    expect(lockButton).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(lockButton);
    expect(onToggleLock).toHaveBeenCalledTimes(1);
    expect(onToggleLock).toHaveBeenCalledWith("top");
  });

  it("shows the locked state and disables garment change", async () => {
    const onChangeGarment = vi.fn();
    render(
      <CategoryCarousel
        {...baseProps}
        isLocked
        onChangeGarment={onChangeGarment}
      />,
    );
    expect(
      screen.getByRole("button", { name: "unlockGarment" }),
    ).toHaveAttribute("aria-pressed", "true");
    const changeButton = screen.getByRole("button", {
      name: "changeGarment",
    });
    expect(changeButton).toBeDisabled();
    await userEvent.click(changeButton);
    expect(onChangeGarment).not.toHaveBeenCalled();
  });

  it("requests another garment on change", async () => {
    const onChangeGarment = vi.fn();
    render(
      <CategoryCarousel {...baseProps} onChangeGarment={onChangeGarment} />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "changeGarment" }),
    );
    expect(onChangeGarment).toHaveBeenCalledTimes(1);
    expect(onChangeGarment).toHaveBeenCalledWith("top");
  });

  it("forwards swiper slide changes", async () => {
    const onSlideChange = vi.fn();
    render(
      <CategoryCarousel {...baseProps} onSlideChange={onSlideChange} />,
    );
    await userEvent.click(screen.getByTestId("mock-slide-change"));
    expect(onSlideChange).toHaveBeenCalledTimes(1);
    expect(onSlideChange).toHaveBeenCalledWith("top", 1);
  });

  it("renders a loading skeleton while fetching", () => {
    render(<CategoryCarousel {...baseProps} isLoading />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-swiper")).not.toBeInTheDocument();
  });

  it("renders an empty message without garments", () => {
    render(<CategoryCarousel {...baseProps} garments={[]} />);
    expect(screen.getByText("carouselEmpty")).toBeInTheDocument();
  });

  it("navigates with previous and next buttons", async () => {
    render(<CategoryCarousel {...baseProps} />);
    await userEvent.click(
      screen.getByRole("button", { name: "previousGarment" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "nextGarment" }));
    expect(screen.getByTestId("mock-swiper")).toBeInTheDocument();
  });

  it("supports the flat slide effect and eager loading", () => {
    render(
      <CategoryCarousel
        {...baseProps}
        effect="slide"
        imageLoading="eager"
        activeGarmentId={null}
      />,
    );
    expect(screen.getByTestId("mock-swiper")).toBeInTheDocument();
  });

  it("loops slide positions with enough garments", () => {
    const garments = [
      buildGarment("t1", "top"),
      buildGarment("t2", "top"),
      buildGarment("t3", "top"),
    ];
    const { rerender } = render(
      <CategoryCarousel
        {...baseProps}
        garments={garments}
        activeGarmentId="t1"
      />,
    );
    rerender(
      <CategoryCarousel {...baseProps} garments={garments} activeGarmentId="t3" />,
    );
    expect(screen.getByTestId("mock-swiper")).toBeInTheDocument();
  });

  it("shows the lock badge on the pinned slide", () => {
    const { container } = render(
      <CategoryCarousel {...baseProps} isLocked />,
    );
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "unlockGarment" }),
    ).toBeInTheDocument();
  });

  it("renders a placeholder without photo and detail fallback alt", () => {
    render(
      <CategoryCarousel
        {...baseProps}
        garments={[
          {
            ...buildGarment("x1", null),
            imageUrl: null,
            extraTags: { specificType: "sneakers" },
          },
        ]}
        activeGarmentId="x1"
      />,
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
