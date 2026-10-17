import { del, get, set } from "idb-keyval";
import {
  UPLOAD_FILE_STORAGE_PREFIX,
  UPLOAD_QUEUE_STORAGE_KEY,
} from "@/constants/upload";
import type {
  PersistedUploadQueueItem,
  UploadQueueItem,
} from "@/types/upload";

function fileKey(id: string): string {
  return `${UPLOAD_FILE_STORAGE_PREFIX}:${id}`;
}

export async function readUploadQueue(): Promise<PersistedUploadQueueItem[]> {
  return (await get<PersistedUploadQueueItem[]>(UPLOAD_QUEUE_STORAGE_KEY)) ?? [];
}

export async function writeUploadQueue(items: UploadQueueItem[]): Promise<void> {
  const persisted: PersistedUploadQueueItem[] = items.map((item) => {
    const copy = { ...item } as UploadQueueItem & { previewUrl?: string };
    delete copy.previewUrl;
    return copy;
  });
  await set(UPLOAD_QUEUE_STORAGE_KEY, persisted);
}

export async function saveUploadFile(id: string, file: File): Promise<void> {
  await set(fileKey(id), file);
}

export async function readUploadFile(id: string): Promise<File | undefined> {
  return get<File>(fileKey(id));
}

export async function deleteUploadFile(id: string): Promise<void> {
  await del(fileKey(id));
}
