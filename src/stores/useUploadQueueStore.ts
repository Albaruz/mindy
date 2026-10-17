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

interface UploadQueueState {
  hydrated: boolean;
  items: UploadQueueItem[];
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
}

function createId(): string {
  return crypto.randomUUID();
}

function sync(items: UploadQueueItem[]): void {
  void writeUploadQueue(items);
}

function revokePreview(item: UploadQueueItem | undefined): void {
  if (item?.previewUrl !== undefined) {
    URL.revokeObjectURL(item.previewUrl);
  }
}

export const useUploadQueueStore = create<UploadQueueState>()((set, get) => ({
  hydrated: false,
  items: [],
  isDetailsOpen: false,
  reviewItemId: null,

  hydrate: async () => {
    if (get().hydrated || typeof window === "undefined") {
      return;
    }
    const stored = await readUploadQueue();
    const restored = await Promise.all(
      stored.map(async (item) => {
        const file = await readUploadFile(item.id);
        if (item.status === "completed" || item.status === "cancelled") {
          return item;
        }
        // A browser reload cannot safely resume a Worker midway through a
        // transformation. Requeue the item and let the processor restart it.
        return {
          ...item,
          status: file === undefined ? "failed" : "queued",
          stage: file === undefined ? "done" : "validation",
          progress: file === undefined ? 100 : 0,
          error:
            file === undefined
              ? "The original image is no longer available."
              : null,
          attempts: 0,
        } satisfies UploadQueueItem;
      }),
    );
    const withPreviews = await Promise.all(
      restored.map(async (item) => {
        const file = await readUploadFile(item.id);
        return file === undefined
          ? item
          : { ...item, previewUrl: URL.createObjectURL(file) };
      }),
    );
    set({ hydrated: true, items: withPreviews });
    sync(withPreviews);
  },

  enqueue: async (files) => {
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
        progress: valid ? 0 : 100,
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
    set({ items, isDetailsOpen: true });
    sync(items);
    return newItems.map((item) => item.id);
  },

  updateItem: (id, patch) => {
    set((state) => {
      const items = state.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      );
      sync(items);
      return { items };
    });
  },

  setDetailsOpen: (isDetailsOpen) => set({ isDetailsOpen }),
  setReviewItem: (reviewItemId) => set({ reviewItemId }),

  removeItem: async (id) => {
    const item = get().items.find((candidate) => candidate.id === id);
    revokePreview(item);
    await deleteUploadFile(id);
    const items = get().items.filter((candidate) => candidate.id !== id);
    set({
      items,
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
    set({ items: [], reviewItemId: null, isDetailsOpen: false });
    sync([]);
  },

  getFile: (id) => readUploadFile(id),
}));

export function isUploadActive(status: UploadItemStatus): boolean {
  return status !== "completed" && status !== "cancelled";
}
