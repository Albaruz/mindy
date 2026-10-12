import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GarmentCard } from "./GarmentCard";
import type { Garment } from "@/types/garment";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/lib/translateGarment", () => ({
  useGarmentTranslator: () => ({
    translate: (value: string | null) => value,
    translateDetail: (value: string | null) => value,
  }),
}));

function buildGarment(overrides: Partial<Garment> = {}): Garment {
  return {
    garmentId: "g1",
    userId: "u1",
    imageUrl: "https://example.com/g1.png",
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
    ...overrides,
  };
}

describe("GarmentCard", () => {
  it("renders type title with descriptive image alt", () => {
    render(<GarmentCard garment={buildGarment()} />);
    expect(screen.getByRole("heading", { name: "top" })).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute("alt", "top (black · all)");
  });

  it("renders placeholder without image", () => {
    render(<GarmentCard garment={buildGarment({ imageUrl: null })} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("calls edit and delete handlers", async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <GarmentCard
        garment={buildGarment()}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "editGarment" }));
    await userEvent.click(
      screen.getByRole("button", { name: "deleteGarment" }),
    );
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("disables delete while deleting", () => {
    render(
      <GarmentCard
        garment={buildGarment()}
        onDelete={() => {}}
        isDeleting
      />,
    );
    expect(
      screen.getByRole("button", { name: "deleteGarment" }),
    ).toBeDisabled();
  });
});
