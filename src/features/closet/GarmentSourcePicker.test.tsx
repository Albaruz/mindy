import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GarmentSourcePicker } from "./GarmentSourcePicker";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

function renderPicker(isOpen: boolean) {
  const onOpenChange = vi.fn();
  const onFile = vi.fn();
  const view = render(
    <GarmentSourcePicker
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onFile={onFile}
    />,
  );
  return { onOpenChange, onFile, ...view };
}

describe("GarmentSourcePicker", () => {
  it("toggles the sheet from the add button", () => {
    const { onOpenChange } = renderPicker(false);
    const fab = screen.getByRole("button", { name: "addGarment" });
    expect(fab).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(fab);
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("offers camera and gallery and closes after choosing one", () => {
    const { onOpenChange, container } = renderPicker(true);
    expect(screen.getByRole("dialog", { name: "addGarmentFrom" })).toBeInTheDocument();
    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="file"]');
    const clicks = Array.from(inputs).map((input) => vi.spyOn(input, "click"));

    fireEvent.click(screen.getByRole("button", { name: "takePhoto" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(clicks[0]).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "uploadImage" }));
    expect(clicks[1]).toHaveBeenCalled();
  });

  it("closes on Escape and on backdrop click, returning focus to the add button", () => {
    const { onOpenChange } = renderPicker(true);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.getByRole("button", { name: "addGarment" })).toHaveFocus();

    onOpenChange.mockClear();
    fireEvent.click(screen.getByRole("dialog").parentElement as HTMLElement);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("hands the chosen photo to the parent and resets the input", () => {
    const { onFile, container } = renderPicker(false);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["x"], "a.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFile).toHaveBeenCalledWith(file);

    onFile.mockClear();
    fireEvent.change(input, { target: { files: [] } });
    expect(onFile).not.toHaveBeenCalled();
  });
});