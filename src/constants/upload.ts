// Upload queue limits and browser persistence identifiers.

/** Maximum number of images accepted in one closet upload batch. */
export const MAX_UPLOAD_BATCH_SIZE = 25;

/** Maximum number of Vision requests processed at the same time. */
export const VISION_CONCURRENCY = 3;

/** Automatic attempts after a transient item failure. */
export const MAX_UPLOAD_RETRIES = 2;

/** IndexedDB key used for resumable upload queue metadata. */
export const UPLOAD_QUEUE_STORAGE_KEY = "mindy-upload-queue-v1";

/** IndexedDB prefix used for the original files kept while a batch is active. */
export const UPLOAD_FILE_STORAGE_PREFIX = "mindy-upload-file-v1";

/** Polling fallback for state recovery when a future server job is unavailable. */
export const UPLOAD_QUEUE_POLL_MS = 30_000;
