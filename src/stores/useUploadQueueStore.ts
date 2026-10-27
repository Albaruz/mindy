import { create } from "zustand";
import { MAX_UPLOAD_BATCH_SIZE } from "@/constants/upload";
import { MAX_UPLOAD_FILE_SIZE_BYTES } from "@/constants/validation";
import type { UploadItemStatus, UploadQueueItem } from "@/types/upload";
import {
  deleteUploadFile,
  readUploadFile,
  readUploadQueue,
  saveUploadFile,
  writeUploadQueue,
} from "@/lib/uploadQueueStorage";
import { logger } from "@/lib/logger";

interface UploadQueueState {
  hydrated: boolean;
  items: UploadQueueItem[];
  progressCeiling: number;
  processingVersion: number;
  isDetailsOpen: boolean;
  reviewItemId: string | null;
  hydrate: () => Promise<void>;
  enqueue: (files: File[]) => Promise<string[]>;
  updateItem: (id: string, patch: Partial<UploadQueueItem>) => void;
  setDetailsOpen: (open: boolean) => void;
  setReviewItem: (id: string | null) => void;
  removeItem: (id: string) => Promise<void>;
  clearFinished: () => Promise<void>;
  clearAll: () => Promise<void>;
  getFile: (id: string) => Promise<File | undefined>;
  bumpProcessingVersion: () => void;
}

let uploadQueueHydration: Promise<void> | null = null;

function createId(): string {
  return crypto.randomUUID();
}

function sync(items: UploadQueueItem[]): void {
  void writeUploadQueue(items).catch((error: unknown) => {
    logger.warn("Unable to persist the upload queue", { error });
  });
}

function revokePreview(item: UploadQueueItem | undefined): void {
  if (item?.previewUrl !== undefined) {
    URL.revokeObjectURL(item.previewUrl);
  }
}

export const useUploadQueueStore = create<UploadQueueState>()((set, get) => ({
  hydrated: false,
  items: [],
  progressCeiling: 0,
  processingVersion: 0,
  isDetailsOpen: false,
  reviewItemId: null,

  hydrate: async () => {
    if (get().hydrated || typeof window === "undefined") {
      return;
    }
    if (uploadQueueHydration !== null) {
      await uploadQueueHydration;
      return;
    }

    const hydration = (async () => {
      const stored = await readUploadQueue();
      const restored = await Promise.all(
        stored.map(async (item) => {
          const file = await readUploadFile(item.id);
          const resumable = item.status !== "completed" && item.status !== "cancelled";
          const restoredItem: UploadQueueItem = resumable
            ? {
                ...item,
                status: file === undefined ? "failed" : "queued",
                stage: file === undefined ? "done" : "validation",
                progress: file === undefined ? 100 : 0,
                error:
                  file === undefined
                    ? "The original image is no longer available."
                    : null,
                attempts: 0,
              }
            : item;
          return file === undefined
            ? restoredItem
            : { ...restoredItem, previewUrl: URL.createObjectURL(file) };
        }),
      );

      // Merge rather than replace to avoid losing an item if another caller
      // added one before hydration completed.
      const currentItems = get().items;
      const hydratedIds = new Set(restored.map((item) => item.id));
      const items = [
        ...restored,
        ...currentItems.filter((item) => !hydratedIds.has(item.id)),
      ];
      set({ hydrated: true, items });
      sync(items);
    })();
    uploadQueueHydration = hydration;
    try {
      await hydration;
    } catch (error) {
      logger.warn("Unable to restore the upload queue", { error });
      set({ hydrated: true });
    } finally {
      if (uploadQueueHydration === hydration) {
        uploadQueueHydration = null;
      }
    }
  },

  enqueue: async (files) => {
    await get().hydrate();
    const accepted = files.slice(0, MAX_UPLOAD_BATCH_SIZE);
    const now = Date.now();
    const newItems = accepted.map<UploadQueueItem>((file) => {
      const valid = file.type.startsWith("image/") && file.size <= MAX_UPLOAD_FILE_SIZE_BYTES;
      return {
        id: createId(),
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        status: valid ? "queued" : "failed",
        stage: valid ? "validation" : "done",
        progress: 0,
        attempts: 0,
        error: valid ? null : "This image does not meet the upload requirements.",
        tags: null,
        qualityNote: null,
        cutoutFailed: false,
        createdAt: now,
        previewUrl: URL.createObjectURL(file),
      };
    });
    await Promise.all(
      newItems.map((item, index) =>
        item.status === "queued"
          ? saveUploadFile(item.id, accepted[index])
          : Promise.resolve(),
      ),
    );
    const items = [...get().items, ...newItems];
    set({ items, progressCeiling: 0, isDetailsOpen: true });
    sync(items);
    return newItems.map((item) => item.id);
  },

  updateItem: (id, patch) => {
    const state = get();
    const items = state.items.map((item) =>
      item.id === id ? { ...item, ...patch } : item,
    );
    const rawProgress =
      items.length === 0
        ? 0
        : Math.round(
            items.reduce((total, item) => total + item.progress, 0) /
              items.length,
          );
    set({
      items,
      progressCeiling: Math.max(state.progressCeiling, rawProgress),
    });
    sync(items);
  },

  setDetailsOpen: (isDetailsOpen) => set({ isDetailsOpen }),
  setReviewItem: (reviewItemId) => set({ reviewItemId }),
  bumpProcessingVersion: () =>
    set((state) => ({ processingVersion: state.processingVersion + 1 })),

  removeItem: async (id) => {
    const item = get().items.find((candidate) => candidate.id === id);
    revokePreview(item);
    await deleteUploadFile(id);
    const items = get().items.filter((candidate) => candidate.id !== id);
    set({
      items,
      progressCeiling: items.length === 0 ? 0 : get().progressCeiling,
      reviewItemId: get().reviewItemId === id ? null : get().reviewItemId,
    });
    sync(items);
  },

  clearFinished: async () => {
    const finished = get().items.filter(
      (item) => item.status === "completed" || item.status === "cancelled",
    );
    await Promise.all(finished.map((item) => get().removeItem(item.id)));
  },

  clearAll: async () => {
    const all = get().items.map((item) => item.id);
    await Promise.all(all.map((id) => get().removeItem(id)));
    set({ items: [], progressCeiling: 0, reviewItemId: null, isDetailsOpen: false });
    sync([]);
  },

  getFile: (id) => readUploadFile(id),
}));

export function isUploadActive(status: UploadItemStatus): boolean {
  return status !== "completed" && status !== "cancelled";
}
