import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";

const {
  mockGetUser,
  mockUpload,
  mockGetPublicUrl,
  mockInsert,
  mockStorageFrom,
  mockFrom,
  mockRemoveBackground,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockUpload: vi.fn(),
  mockGetPublicUrl: vi.fn(),
  mockInsert: vi.fn(),
  mockStorageFrom: vi.fn(),
  mockFrom: vi.fn(),
  mockRemoveBackground: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => key,
}));

vi.mock("@imgly/background-removal", () => ({
  removeBackground: mockRemoveBackground,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    storage: { from: mockStorageFrom },
    from: mockFrom,
  }),
}));

import { useUploadGarment } from "./useUploadGarment";
import { useNotificationStore } from "@/stores/useNotificationStore";

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

function installImageMocks() {
  const bitmap = { width: 600, height: 400, close: vi.fn() };
  vi.stubGlobal("createImageBitmap", vi.fn(async () => bitmap));
  const originalCreateElement = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation(
    ((tagName: string, ...rest: unknown[]) => {
      if (tagName !== "canvas") {
        return (originalCreateElement as (...args: unknown[]) => unknown)(
          tagName,
          ...rest,
        );
      }
      return {
        width: 0,
        height: 0,
        getContext: () => ({ drawImage: vi.fn() }),
        toDataURL: () => "data:image/png;base64,stub",
        toBlob: (callback: (blob: Blob | null) => void) =>
          callback(new Blob(["resized"], { type: "image/png" })),
      };
    }) as typeof document.createElement,
  );
}

function setupSupabaseSuccess(insertError: Error | null = null) {
  mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
  mockUpload.mockResolvedValue({ error: null });
  mockGetPublicUrl.mockReturnValue({
    data: { publicUrl: "https://example.com/g1.png" },
  });
  mockInsert.mockResolvedValue({ error: insertError });
  mockStorageFrom.mockReturnValue({
    upload: mockUpload,
    getPublicUrl: mockGetPublicUrl,
  });
  mockFrom.mockReturnValue({ insert: mockInsert });
}

function mockAnalyzeSuccess() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        garmentType: "top",
        color: "black",
        season: "all",
        material: "cotton",
        style: "casual",
        cutoutDifficulty: "easy",
        visualDescription: "A black cotton tee with short sleeves.",
      }),
    ),
  );
}

describe("useUploadGarment validation", () => {
  beforeEach(() => {
    useNotificationStore.setState({ notifications: [] });
  });

  it("rejects non-image files", async () => {
    const { result } = renderHook(() => useUploadGarment(), {
      wrapper: createWrapper(),
    });
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    await result.current.processPhoto(file);
    await waitFor(() =>
      expect(
        useNotificationStore.getState().notifications,
      ).toHaveLength(1),
    );
    expect(result.current.phase).toBe("idle");
  });

  it("rejects oversized files", async () => {
    const { result } = renderHook(() => useUploadGarment(), {
      wrapper: createWrapper(),
    });
    const big = new File(["x"], "big.png", { type: "image/png" });
    Object.defineProperty(big, "size", { value: 11 * 1024 * 1024 });
    await result.current.processPhoto(big);
    await waitFor(() =>
      expect(
        useNotificationStore.getState().notifications,
      ).toHaveLength(1),
    );
  });
});

describe("useUploadGarment pipeline", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.unstubAllGlobals();
    installImageMocks();
    useNotificationStore.setState({ notifications: [] });
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "11111111-1111-1111-1111-111111111111",
    );
    mockRemoveBackground.mockResolvedValue(
      new Blob(["cutout"], { type: "image/png" }),
    );
  });

  it("runs the full pipeline and inserts inferred tags", async () => {
    setupSupabaseSuccess();
    mockAnalyzeSuccess();
    const { result } = renderHook(() => useUploadGarment(), {
      wrapper: createWrapper(),
    });
    await result.current.processPhoto(
      new File(["photo"], "photo.png", { type: "image/png" }),
    );
    await waitFor(() =>
      expect(
        useNotificationStore
          .getState()
          .notifications.some((n) => n.message === "added"),
      ).toBe(true),
    );
    expect(mockRemoveBackground).toHaveBeenCalledTimes(1);
    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockInsert.mock.calls[0][0]).toMatchObject({
      user_id: "u1",
      image_url: "https://example.com/g1.png",
      garment_type: "top",
    });
    expect(result.current.phase).toBe("idle");
  });

  it("downscales large originals before background removal", async () => {
    setupSupabaseSuccess();
    mockAnalyzeSuccess();
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 2400, height: 1600, close: vi.fn() })),
    );
    const { result } = renderHook(() => useUploadGarment(), {
      wrapper: createWrapper(),
    });

    await act(async () =>
      result.current.processPhoto(
        new File(["large photo"], "photo.jpg", { type: "image/jpeg" }),
      ),
    );

    expect(mockRemoveBackground).toHaveBeenCalledOnce();
    expect(mockRemoveBackground.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect(mockRemoveBackground.mock.calls[0][0].type).toBe("image/png");
  });

  it("analyzes the original first and pauses difficult photos before cutout", async () => {
    setupSupabaseSuccess();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          category: "top",
          garmentType: "top",
          cutoutDifficulty: "hard",
          qualityNote: "The dark fabric blends into the background.",
          visualDescription: "A black cotton tee with short sleeves.",
        }),
      ),
    );
    const { result } = renderHook(() => useUploadGarment(), {
      wrapper: createWrapper(),
    });
    const original = new File(["photo"], "photo.png", { type: "image/png" });

    await act(async () => result.current.processPhoto(original));

    expect(result.current.qualityGate?.file).toBe(original);
    expect(result.current.qualityGate?.tags.visualDescription).toBe(
      "A black cotton tee with short sleeves.",
    );
    expect(result.current.qualityGate?.tags.qualityNote).toBe(
      "The dark fabric blends into the background.",
    );
    expect(mockRemoveBackground).not.toHaveBeenCalled();
    expect(mockUpload).not.toHaveBeenCalled();
    expect(result.current.phase).toBe("idle");
  });

  it("saves the selected original without running background removal", async () => {
    setupSupabaseSuccess();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          garmentType: "top",
          color: "black",
          cutoutDifficulty: "hard",
        }),
      ),
    );
    const { result } = renderHook(() => useUploadGarment(), {
      wrapper: createWrapper(),
    });
    await act(async () =>
      result.current.processPhoto(
        new File(["photo"], "photo.jpg", { type: "image/jpeg" }),
      ),
    );

    await act(async () => result.current.useOriginalPhoto());

    expect(mockRemoveBackground).not.toHaveBeenCalled();
    expect(mockUpload).toHaveBeenCalledOnce();
    expect(mockUpload.mock.calls[0][1].type).toBe("image/png");
    expect(mockInsert.mock.calls[0][0]).toMatchObject({
      garment_type: "top",
      color: "black",
    });
    expect(result.current.qualityGate).toBeNull();
  });

  it("runs background removal on the held photo when the user chooses it", async () => {
    setupSupabaseSuccess();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          garmentType: "top",
          color: "black",
          cutoutDifficulty: "hard",
          visualDescription: "A black cotton tee with short sleeves.",
        }),
      ),
    );
    const { result } = renderHook(() => useUploadGarment(), {
      wrapper: createWrapper(),
    });
    await act(async () =>
      result.current.processPhoto(
        new File(["photo"], "photo.png", { type: "image/png" }),
      ),
    );

    await act(async () => result.current.removeBackground());

    expect(mockRemoveBackground).toHaveBeenCalledOnce();
    expect(mockUpload).toHaveBeenCalledOnce();
    expect(mockInsert.mock.calls[0][0]).toMatchObject({
      garment_type: "top",
      color: "black",
    });
    expect(result.current.qualityGate).toBeNull();
    expect(result.current.cutoutFailed).toBe(false);
  });

  it("keeps the decision modal available when background removal fails", async () => {
    setupSupabaseSuccess();
    mockRemoveBackground.mockRejectedValue(new Error("cutout failed"));
    mockAnalyzeSuccess();
    const { result } = renderHook(() => useUploadGarment(), {
      wrapper: createWrapper(),
    });

    await act(async () =>
      result.current.processPhoto(
        new File(["photo"], "photo.png", { type: "image/png" }),
      ),
    );

    expect(result.current.qualityGate).not.toBeNull();
    expect(result.current.cutoutFailed).toBe(true);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("falls back to empty tags when analysis fails", async () => {
    setupSupabaseSuccess();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("oops", { status: 500 })),
    );
    const { result } = renderHook(() => useUploadGarment(), {
      wrapper: createWrapper(),
    });
    await result.current.processPhoto(
      new File(["photo"], "photo.png", { type: "image/png" }),
    );
    await waitFor(() => expect(mockInsert).toHaveBeenCalledTimes(1));
    expect(mockInsert.mock.calls[0][0]).toMatchObject({
      garment_type: null,
      color: null,
      extra_tags: {},
    });
  });

  it("reports an error when the user is not signed in", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockStorageFrom.mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
    });
    mockFrom.mockReturnValue({ insert: mockInsert });
    mockAnalyzeSuccess();
    const { result } = renderHook(() => useUploadGarment(), {
      wrapper: createWrapper(),
    });
    await result.current.processPhoto(
      new File(["photo"], "photo.png", { type: "image/png" }),
    );
    await waitFor(() =>
      expect(useNotificationStore.getState().notifications).toHaveLength(1),
    );
    expect(
      useNotificationStore.getState().notifications[0].message,
    ).toMatch(/signed in/);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("reports storage upload errors", async () => {
    setupSupabaseSuccess();
    mockUpload.mockResolvedValue({ error: new Error("upload boom") });
    mockAnalyzeSuccess();
    const { result } = renderHook(() => useUploadGarment(), {
      wrapper: createWrapper(),
    });
    await result.current.processPhoto(
      new File(["photo"], "photo.png", { type: "image/png" }),
    );
    await waitFor(() =>
      expect(useNotificationStore.getState().notifications).toHaveLength(1),
    );
    expect(
      useNotificationStore.getState().notifications[0].message,
    ).toMatch(/upload boom/);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("reports database insert errors", async () => {
    setupSupabaseSuccess(new Error("db fail"));
    mockAnalyzeSuccess();
    const { result } = renderHook(() => useUploadGarment(), {
      wrapper: createWrapper(),
    });
    await result.current.processPhoto(
      new File(["photo"], "photo.png", { type: "image/png" }),
    );
    await waitFor(() =>
      expect(useNotificationStore.getState().notifications).toHaveLength(1),
    );
    expect(
      useNotificationStore.getState().notifications[0].message,
    ).toMatch(/db fail/);
  });
});
