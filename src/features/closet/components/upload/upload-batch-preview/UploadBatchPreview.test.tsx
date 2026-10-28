import { afterEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import React from "react";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

import { UploadBatchPreview } from "./UploadBatchPreview";

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

describe("UploadBatchPreview object URL lifecycle", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    if (originalCreateObjectURL === undefined) {
      Reflect.deleteProperty(URL, "createObjectURL");
    } else {
      Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        value: originalCreateObjectURL,
      });
    }
    if (originalRevokeObjectURL === undefined) {
      Reflect.deleteProperty(URL, "revokeObjectURL");
    } else {
      Object.defineProperty(URL, "revokeObjectURL", {
        configurable: true,
        value: originalRevokeObjectURL,
      });
    }
  });

  it("creates previews after render and revokes them on cleanup", async () => {
    const file = new File(["image"], "top.png", { type: "image/png" });
    const createObjectURL = vi.fn(() => "blob:preview-top");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });

    const { container, unmount } = render(
      <UploadBatchPreview
        files={[file]}
        onRemove={() => undefined}
        onStart={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(createObjectURL).toHaveBeenCalledWith(file);
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "blob:preview-top",
    );
    expect(revokeObjectURL).not.toHaveBeenCalled();

    unmount();
    await waitFor(() =>
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:preview-top"),
    );
  });
});
