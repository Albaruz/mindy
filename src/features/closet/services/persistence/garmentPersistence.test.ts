import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { InferredTags } from "@/types/garment";

const { resizeToWidth } = vi.hoisted(() => ({ resizeToWidth: vi.fn() }));
vi.mock("../images/garmentImage", () => ({ resizeToWidth }));

const { loggerWarn } = vi.hoisted(() => ({ loggerWarn: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { warn: loggerWarn },
}));

import { persistGarment } from "./garmentPersistence";

const TAGS: InferredTags = {
  category: "top",
  garmentType: "top",
  season: "all",
  color: "black",
  material: "cotton",
  style: "casual",
  cutLength: "regular",
  typeDetail: "",
  colorShade: "",
  secondaryColor: "",
  print: "",
  cutoutDifficulty: "easy",
  qualityNote: "",
  visualDescription: "",
};

function createClientMock() {
  const uploadedUrl = "https://example.supabase.co/storage/v1/object/public/garments/user-a/file.png";
  const mockUpload = vi.fn().mockResolvedValue({ error: null });
  const mockRemove = vi.fn().mockResolvedValue({ error: null });
  const mockInsert = vi.fn().mockResolvedValue({ error: null });
  const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });
  const mockDelete = vi.fn().mockReturnValue({
    eq: vi.fn(() => ({ eq: mockDeleteEq })),
  });
  const storageBucket = {
    upload: mockUpload,
    getPublicUrl: vi.fn(() => ({ data: { publicUrl: uploadedUrl } })),
    remove: mockRemove,
  };
  const client = {
    storage: { from: vi.fn(() => storageBucket) },
    from: vi.fn(() => ({ insert: mockInsert, delete: mockDelete })),
  } as unknown as SupabaseClient;
  return { client, mockUpload, mockRemove, mockInsert, mockDelete, mockDeleteEq, uploadedUrl };
}

function dependencies(
  client: SupabaseClient,
  overrides: Partial<Parameters<typeof persistGarment>[2]> = {},
) {
  return {
    client,
    userId: "user-a",
    invalidateGarments: vi.fn().mockResolvedValue(undefined),
    onProgress: vi.fn(),
    progressResizing: "resizing",
    progressUploading: "uploading",
    ...overrides,
  };
}

describe("persistGarment", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    resizeToWidth.mockImplementation(async (blob: Blob) => blob);
  });

  it("resizes, uploads and inserts a garment before invalidating the cache", async () => {
    const mocks = createClientMock();
    const deps = dependencies(mocks.client);
    const source = new Blob(["original"], { type: "image/jpeg" });

    await expect(persistGarment(source, TAGS, deps)).resolves.toBeUndefined();

    expect(resizeToWidth).toHaveBeenCalledWith(source, expect.any(Number));
    expect(mocks.mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^user-a\/.+\.png$/),
      source,
      { contentType: "image/png", upsert: false },
    );
    expect(mocks.mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-a",
        image_url: mocks.uploadedUrl,
        original_image_url: mocks.uploadedUrl,
      }),
    );
    expect(deps.invalidateGarments).toHaveBeenCalledOnce();
    expect(mocks.mockRemove).not.toHaveBeenCalled();
  });

  it("maps empty inferred tags to null columns and empty plural tags", async () => {
    const mocks = createClientMock();
    const emptyTags: InferredTags = {
      ...TAGS,
      category: "",
      garmentType: "",
      season: "",
      color: "",
      material: "",
      style: "",
      cutLength: "",
      styles: undefined,
      cuts: undefined,
    };

    await persistGarment(
      new Blob(["x"]),
      emptyTags,
      dependencies(mocks.client),
    );

    expect(mocks.mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        garment_type: null,
        season: null,
        color: null,
        material: null,
        style: null,
        cut_length: null,
        styles: [],
        cut_lengths: [],
      }),
    );
  });

  it("does not write to storage when cancelled after resize", async () => {
    const mocks = createClientMock();
    const deps = dependencies(mocks.client, { isCancelled: () => true });

    await expect(persistGarment(new Blob(["x"]), TAGS, deps)).rejects.toThrow(
      "Upload was cancelled.",
    );
    expect(mocks.mockUpload).not.toHaveBeenCalled();
  });

  it("removes a newly uploaded object when cancellation happens before insert", async () => {
    const mocks = createClientMock();
    const isCancelled = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
    const deps = dependencies(mocks.client, { isCancelled });

    await expect(persistGarment(new Blob(["x"]), TAGS, deps)).rejects.toThrow(
      "Upload was cancelled.",
    );
    expect(mocks.mockRemove).toHaveBeenCalledWith([
      expect.stringMatching(/^user-a\/.+\.png$/),
    ]);
    expect(mocks.mockInsert).not.toHaveBeenCalled();
  });

  it("removes the inserted row and uploaded object if cancellation races with insert", async () => {
    const mocks = createClientMock();
    const isCancelled = vi
      .fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    const deps = dependencies(mocks.client, { isCancelled });

    await expect(persistGarment(new Blob(["x"]), TAGS, deps)).rejects.toThrow(
      "Upload was cancelled.",
    );
    expect(mocks.mockDelete).toHaveBeenCalledOnce();
    expect(mocks.mockDeleteEq).toHaveBeenCalledWith("image_url", mocks.uploadedUrl);
    expect(mocks.mockRemove).toHaveBeenCalledOnce();
    expect(deps.invalidateGarments).not.toHaveBeenCalled();
  });

  it("logs a row cleanup error when cancellation races with insert", async () => {
    const mocks = createClientMock();
    mocks.mockDeleteEq.mockResolvedValueOnce({
      error: new Error("row cleanup failed"),
    });
    const isCancelled = vi
      .fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    await expect(
      persistGarment(
        new Blob(["x"]),
        TAGS,
        dependencies(mocks.client, { isCancelled }),
      ),
    ).rejects.toThrow("Upload was cancelled.");
    expect(loggerWarn).toHaveBeenCalledWith(
      "Cancelled garment row cleanup failed",
      expect.objectContaining({ userId: "user-a" }),
    );
    expect(mocks.mockRemove).toHaveBeenCalledOnce();
  });

  it("cleans up the uploaded object if the row insert fails", async () => {
    const mocks = createClientMock();
    const insertError = new Error("insert failed");
    mocks.mockInsert.mockResolvedValueOnce({ error: insertError });

    await expect(
      persistGarment(new Blob(["x"]), TAGS, dependencies(mocks.client)),
    ).rejects.toBe(insertError);
    expect(mocks.mockRemove).toHaveBeenCalledOnce();
  });

  it("preserves the insert failure if best-effort object cleanup also fails", async () => {
    const mocks = createClientMock();
    const insertError = new Error("insert failed");
    mocks.mockInsert.mockResolvedValueOnce({ error: insertError });
    mocks.mockRemove.mockRejectedValueOnce(new Error("storage unavailable"));

    await expect(
      persistGarment(new Blob(["x"]), TAGS, dependencies(mocks.client)),
    ).rejects.toBe(insertError);
    expect(loggerWarn).toHaveBeenCalledWith(
      "Uploaded garment image cleanup failed",
      expect.objectContaining({ userId: "user-a" }),
    );
  });

  it("does not turn a committed insert into a retry if invalidation fails", async () => {
    const mocks = createClientMock();
    const deps = dependencies(mocks.client, {
      invalidateGarments: vi.fn().mockRejectedValue(new Error("cache unavailable")),
    });

    await expect(persistGarment(new Blob(["x"]), TAGS, deps)).resolves.toBeUndefined();
    expect(mocks.mockRemove).not.toHaveBeenCalled();
    expect(loggerWarn).toHaveBeenCalledWith(
      "Garment cache invalidation failed after save",
      expect.objectContaining({ userId: "user-a" }),
    );
  });

  it("propagates storage upload failures without inserting a row", async () => {
    const mocks = createClientMock();
    const uploadError = new Error("upload failed");
    mocks.mockUpload.mockResolvedValueOnce({ error: uploadError });

    await expect(
      persistGarment(new Blob(["x"]), TAGS, dependencies(mocks.client)),
    ).rejects.toBe(uploadError);
    expect(mocks.mockInsert).not.toHaveBeenCalled();
  });
});
