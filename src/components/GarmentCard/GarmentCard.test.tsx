import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GarmentCard } from "./GarmentCard";

const image = { src: "https://example.com/g1.png", alt: "Top (black · all)" };

describe("GarmentCard", () => {
  it("renders title, subtitle and descriptive image alt", () => {
    render(
      <GarmentCard image={image} title="Top" subtitle="black · all" />,
    );

    expect(screen.getByRole("heading", { name: "Top" })).toBeInTheDocument();
    expect(screen.getByText("black · all")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute("alt", image.alt);
  });

  it("renders the placeholder when there is no image", () => {
    render(
      <GarmentCard
        image={{ src: null, alt: "Top" }}
        title="Top"
        subtitle=""
      />,
    );

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByText("black · all")).not.toBeInTheDocument();
  });

  it("renders leading and trailing action slots", () => {
    render(
      <GarmentCard
        image={image}
        title="Top"
        leadingAction={<button type="button">Favorite</button>}
        trailingAction={<button type="button">Edit</button>}
      />,
    );

    expect(screen.getByRole("button", { name: "Favorite" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("does not render a select overlay unless onSelect is provided", () => {
    render(<GarmentCard image={image} title="Top" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("selects the card on click", async () => {
    const onSelect = vi.fn();
    render(
      <GarmentCard
        image={image}
        title="Top"
        onSelect={onSelect}
        selectLabel="Select Top"
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Select Top" }));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("selects the card with Enter and Space", async () => {
    const onSelect = vi.fn();
    render(
      <GarmentCard
        image={image}
        title="Top"
        onSelect={onSelect}
        selectLabel="Select Top"
      />,
    );

    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledTimes(1);

    await userEvent.keyboard(" ");
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it("keeps action buttons usable above the select overlay", async () => {
    const onSelect = vi.fn();
    const onEdit = vi.fn();
    render(
      <GarmentCard
        image={image}
        title="Top"
        onSelect={onSelect}
        selectLabel="Select Top"
        trailingAction={
          <button type="button" onClick={onEdit}>
            Edit
          </button>
        }
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
