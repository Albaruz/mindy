// Upload queue limits and browser persistence identifiers.

/** Maximum number of images accepted in one closet upload batch. */
export const MAX_UPLOAD_BATCH_SIZE = 25;

/** Maximum number of Vision requests processed at the same time.
 * Keep this serial: the analysis and persistence pipeline is stateful, and
 * upstream/serverless rate limits make parallel batches lose items even
 * though the browser accepted them.
 */
export const VISION_CONCURRENCY = 1;

/** Automatic attempts after a transient item failure. */
export const MAX_UPLOAD_RETRIES = 2;

/** Milestones reported by the resumable upload pipeline. */
export const UPLOAD_PROGRESS = {
  validationStarted: 5,
  analysisStarted: 25,
  analysisComplete: 50,
  savingStarted: 80,
} as const;

/** IndexedDB key used for resumable upload queue metadata. */
export const UPLOAD_QUEUE_STORAGE_KEY = "mindy-upload-queue-v1";

/** IndexedDB prefix used for the original files kept while a batch is active. */
export const UPLOAD_FILE_STORAGE_PREFIX = "mindy-upload-file-v1";

/** Polling fallback for state recovery when a future server job is unavailable. */
export const UPLOAD_QUEUE_POLL_MS = 30_000;
