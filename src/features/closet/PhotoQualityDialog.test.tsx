import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PhotoQualityDialog } from "./PhotoQualityDialog";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("PhotoQualityDialog", () => {
  it("shows photo tips and keeps AI generation disabled in phase one", () => {
    render(
      <PhotoQualityDialog
        qualityNote="The garment blends into the background."
        cutoutFailed={false}
        isWorking={false}
        progressNote={null}
        onRemoveBackground={vi.fn()}
        onUseOriginal={vi.fn()}
        onChangePhoto={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("qualityTipBackground")).toBeInTheDocument();
    expect(screen.getByText("qualityTipLighting")).toBeInTheDocument();
    expect(screen.getByText("qualityTipFraming")).toBeInTheDocument();
    expect(screen.getByText("The garment blends into the background.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /qualityGenerate/ }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("button").map((button) => button.getAttribute("aria-label") ?? button.textContent)).toEqual([
      "qualityClose",
      expect.stringContaining("qualityChooseAnother"),
      "qualityUseOriginal",
      "qualityRemoveBackground",
    ]);
  });

  it("offers original, background-removal, and retake actions", () => {
    const onRemoveBackground = vi.fn();
    const onUseOriginal = vi.fn();
    const onChangePhoto = vi.fn();

    render(
      <PhotoQualityDialog
        qualityNote={null}
        cutoutFailed
        isWorking={false}
        progressNote={null}
        onRemoveBackground={onRemoveBackground}
        onUseOriginal={onUseOriginal}
        onChangePhoto={onChangePhoto}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "qualityRemoveBackground" }));
    fireEvent.click(screen.getByRole("button", { name: "qualityUseOriginal" }));
    fireEvent.click(screen.getByRole("button", { name: /qualityChooseAnother/ }));

    expect(onRemoveBackground).toHaveBeenCalledOnce();
    expect(onUseOriginal).toHaveBeenCalledOnce();
    expect(onChangePhoto).toHaveBeenCalledOnce();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
