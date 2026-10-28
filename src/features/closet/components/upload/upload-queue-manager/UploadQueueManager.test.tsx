import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import React from "react";
import type { InferredTags } from "@/types/garment";
import type { UploadQueueItem } from "@/types/upload";
import { ERROR_CODES } from "@/constants/errors";
import { AppError } from "@/lib/errors";

const {
  mockToDownscaledDataUrl,
  mockSuggestTags,
  mockPersistGarment,
  mockDeleteUploadFile,
  mockWriteUploadQueue,
  mockRequireUser,
} = vi.hoisted(() => ({
  mockToDownscaledDataUrl: vi.fn(),
  mockSuggestTags: vi.fn(),
  mockPersistGarment: vi.fn(),
  mockDeleteUploadFile: vi.fn(),
  mockWriteUploadQueue: vi.fn(),
  mockRequireUser: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

vi.mock("@/lib/supabase/session", () => ({
  requireUser: mockRequireUser,
}));

vi.mock("../../../services/images/garmentImage", () => ({
  toDownscaledDataUrl: mockToDownscaledDataUrl,
}));

vi.mock("../../../domain/garments/garmentAnalysis", () => ({
  suggestTags: mockSuggestTags,
}));

vi.mock("../../../services/persistence/garmentPersistence", () => ({
  persistGarment: mockPersistGarment,
}));

vi.mock("@/lib/uploadQueueStorage", () => ({
  deleteUploadFile: mockDeleteUploadFile,
  writeUploadQueue: mockWriteUploadQueue,
}));

import { UploadQueueManager } from "./UploadQueueManager";
import { useUploadQueueStore } from "@/stores/useUploadQueueStore";

const originalGetFile = useUploadQueueStore.getState().getFile;

function makeQueueItem(): UploadQueueItem {
  return {
    id: "upload-1",
    fileName: "top.png",
    fileType: "image/png",
    fileSize: 5,
    status: "queued",
    stage: "validation",
    progress: 0,
    attempts: 0,
    error: null,
    tags: null,
    qualityNote: null,
    cutoutFailed: false,
    createdAt: 1,
  };
}

function makeTags(): InferredTags {
  return {
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
}

describe("UploadQueueManager processing effects", () => {
  afterEach(() => {
    vi.resetAllMocks();
    useUploadQueueStore.setState({
      hydrated: false,
      items: [],
      progressCeiling: 0,
      processingVersion: 0,
      isDetailsOpen: false,
      reviewItemId: null,
      getFile: originalGetFile,
    });
  });

  it("starts one processing run under StrictMode effect replay", async () => {
    const file = new File(["image"], "top.png", { type: "image/png" });
    mockToDownscaledDataUrl.mockResolvedValue("data:image/png;base64,AA==");
    mockSuggestTags.mockResolvedValue(makeTags());
    mockPersistGarment.mockResolvedValue(undefined);
    mockDeleteUploadFile.mockResolvedValue(undefined);
    mockWriteUploadQueue.mockResolvedValue(undefined);
    mockRequireUser.mockResolvedValue({ id: "user-1" });
    useUploadQueueStore.setState({
      hydrated: true,
      items: [makeQueueItem()],
      getFile: vi.fn().mockResolvedValue(file),
    });
    const queryClient = new QueryClient();

    render(
      <React.StrictMode>
        <QueryClientProvider client={queryClient}>
          <UploadQueueManager />
        </QueryClientProvider>
      </React.StrictMode>,
    );

    await waitFor(() =>
      expect(useUploadQueueStore.getState().items[0]?.status).toBe("completed"),
    );
    expect(mockToDownscaledDataUrl).toHaveBeenCalledOnce();
    expect(mockSuggestTags).toHaveBeenCalledOnce();
    expect(mockPersistGarment).toHaveBeenCalledOnce();
    expect(mockDeleteUploadFile).toHaveBeenCalledOnce();
  });

  it("fails a 400 image validation error without repeating the request", async () => {
    const file = new File(["image"], "top.png", { type: "image/png" });
    mockToDownscaledDataUrl.mockResolvedValue("data:image/png;base64,AA==");
    mockWriteUploadQueue.mockResolvedValue(undefined);
    mockSuggestTags.mockRejectedValue(
      new AppError(ERROR_CODES.UPLOAD_INVALID_FILE),
    );
    useUploadQueueStore.setState({
      hydrated: true,
      items: [makeQueueItem()],
      getFile: vi.fn().mockResolvedValue(file),
    });

    render(
      <QueryClientProvider client={new QueryClient()}>
        <UploadQueueManager />
      </QueryClientProvider>,
    );

    await waitFor(() =>
      expect(useUploadQueueStore.getState().items[0]?.status).toBe("failed"),
    );

    expect(mockSuggestTags).toHaveBeenCalledOnce();
    expect(useUploadQueueStore.getState().items[0]?.error).toBe(
      ERROR_CODES.UPLOAD_INVALID_FILE,
    );
  });
});
