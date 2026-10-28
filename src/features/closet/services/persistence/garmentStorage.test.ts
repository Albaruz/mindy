import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const { resizeToWidth } = vi.hoisted(() => ({ resizeToWidth: vi.fn() }));
vi.mock("../images/garmentImage", () => ({ resizeToWidth }));

import {
  GARMENT_STORAGE_BUCKET,
  getGarmentStoragePath,
  removeGarmentStoragePaths,
  uploadGarmentImage,
} from "./garmentStorage";

function makeStorageClient() {
  const mockUpload = vi.fn().mockResolvedValue({ error: null });
  const mockRemove = vi.fn().mockResolvedValue({ error: null });
  const mockGetPublicUrl = vi.fn((path: string) => ({
    data: {
      publicUrl: `https://example.supabase.co/storage/v1/object/public/${GARMENT_STORAGE_BUCKET}/${path}`,
    },
  }));
  const bucket = {
    upload: mockUpload,
    remove: mockRemove,
    getPublicUrl: mockGetPublicUrl,
  };
  const client = {
    storage: { from: vi.fn(() => bucket) },
  } as unknown as SupabaseClient;
  return { client, mockUpload, mockRemove, mockGetPublicUrl };
}

describe("garment storage helpers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    resizeToWidth.mockImplementation(async (blob: Blob) => blob);
  });

  it("resizes and uploads images through the shared helper", async () => {
    const storage = makeStorageClient();
    const source = new Blob(["image"]);

    const uploaded = await uploadGarmentImage(storage.client, "user-1", source);

    expect(resizeToWidth).toHaveBeenCalledWith(source, expect.any(Number));
    expect(storage.mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^user-1\/.+\.png$/),
      source,
      { contentType: "image/png", upsert: false },
    );
    expect(uploaded.imageUrl).toContain(`/${GARMENT_STORAGE_BUCKET}/user-1/`);
    expect(uploaded.path).toMatch(/^user-1\/.+\.png$/);
  });

  it("extracts only non-empty object paths from garments bucket URLs", () => {
    expect(getGarmentStoragePath(null)).toBeNull();
    expect(getGarmentStoragePath("https://example.com/image.png")).toBeNull();
    expect(
      getGarmentStoragePath(
        `https://example.supabase.co/storage/v1/object/public/${GARMENT_STORAGE_BUCKET}/user-1/file.png?token=ignored`,
      ),
    ).toBe("user-1/file.png");
    expect(
      getGarmentStoragePath(
        `https://example.supabase.co/storage/v1/object/public/${GARMENT_STORAGE_BUCKET}/`,
      ),
    ).toBeNull();
  });

  it("skips empty cleanup and deduplicates paths before removal", async () => {
    const storage = makeStorageClient();

    await expect(removeGarmentStoragePaths(storage.client, [])).resolves.toBeNull();
    await expect(
      removeGarmentStoragePaths(storage.client, ["user-1/a.png", "", "user-1/a.png"]),
    ).resolves.toBeNull();

    expect(storage.mockRemove).toHaveBeenCalledOnce();
    expect(storage.mockRemove).toHaveBeenCalledWith(["user-1/a.png"]);
  });

  it("returns storage errors and catches thrown cleanup failures", async () => {
    const storage = makeStorageClient();
    const storageError = new Error("storage error");
    storage.mockRemove.mockResolvedValueOnce({ error: storageError });
    await expect(
      removeGarmentStoragePaths(storage.client, ["user-1/a.png"]),
    ).resolves.toBe(storageError);

    const thrownError = new Error("storage unavailable");
    storage.mockRemove.mockRejectedValueOnce(thrownError);
    await expect(
      removeGarmentStoragePaths(storage.client, ["user-1/b.png"]),
    ).resolves.toBe(thrownError);
  });
});
