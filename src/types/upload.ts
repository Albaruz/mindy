import type { InferredTags } from "@/types/garment";
import type { ErrorCode } from "@/constants/errors";

export type UploadItemStatus =
  | "queued"
  | "validating"
  | "uploading"
  | "analyzing"
  | "awaiting_review"
  | "removing_background"
  | "saving"
  | "completed"
  | "failed"
  | "cancelled";

export type UploadItemStage =
  | "validation"
  | "uploading"
  | "analysis"
  | "background"
  | "saving"
  | "review"
  | "done";

export interface UploadQueueItem {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: UploadItemStatus;
  stage: UploadItemStage;
  progress: number;
  attempts: number;
  error: ErrorCode | null;
  tags: InferredTags | null;
  qualityNote: string | null;
  cutoutFailed: boolean;
  createdAt: number;
  /** Runtime-only object URL. Rebuilt from IndexedDB after a reload. */
  previewUrl?: string;
}

export type PersistedUploadQueueItem = Omit<UploadQueueItem, "previewUrl">;
