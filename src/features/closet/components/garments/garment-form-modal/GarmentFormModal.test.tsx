import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { GarmentFormInput } from "../../../hooks/upload/useUploadGarment";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/lib/translateGarment", () => ({
  useGarmentTranslator: () => ({
    translate: (value: string | null) => value,
  }),
}));

vi.mock("@/lib/useDialogFocus", () => ({
  useDialogFocus: () => ({ current: null }),
}));

import { GarmentFormModal } from "./GarmentFormModal";

function buildInput(overrides: Partial<GarmentFormInput> = {}): GarmentFormInput {
  return {
    garmentType: "top",
    season: "all",
    color: "black",
    material: "cotton",
    style: "casual",
    cutLength: "",
    extraTags: {},
    ...overrides,
  };
}

describe("GarmentFormModal", () => {
  it("submits valid form", async () => {
    const onSubmit = vi.fn();
    render(
      <GarmentFormModal
        title="Edit garment"
        submitLabel="Save"
        savingLabel="Saving"
        cancelLabel="Cancel"
        initialValues={buildInput()}
        previewUrl={null}
        previewAlt="preview"
        isSaving={false}
        submitError={null}
        onClose={() => {}}
        onSubmit={onSubmit}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].garmentType).toBe("top");
  });

  it("blocks submit without garment type", async () => {
    const onSubmit = vi.fn();
    render(
      <GarmentFormModal
        title="Edit garment"
        submitLabel="Save"
        savingLabel="Saving"
        cancelLabel="Cancel"
        initialValues={buildInput({ garmentType: "" })}
        previewUrl={null}
        previewAlt="preview"
        isSaving={false}
        submitError={null}
        onClose={() => {}}
        onSubmit={onSubmit}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("renders dialog semantics and preview", () => {
    render(
      <GarmentFormModal
        title="Edit garment"
        submitLabel="Save"
        savingLabel="Saving"
        cancelLabel="Cancel"
        initialValues={buildInput()}
        previewUrl="https://example.com/p.png"
        previewAlt="Garment preview"
        isSaving={false}
        submitError="Failed"
        onClose={() => {}}
        onSubmit={() => {}}
      />,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Garment preview" })).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });
});
