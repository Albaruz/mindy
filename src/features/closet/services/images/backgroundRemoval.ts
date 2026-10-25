import { MAX_IMAGE_PROCESSING_DIMENSION_PX } from "@/constants/validation";
import { downscaleToMaxDimension } from "./garmentImage";

interface BackgroundRemovalOptions {
  output: { format: "image/png"; quality: number };
}

const PNG_OUTPUT: BackgroundRemovalOptions = {
  output: { format: "image/png", quality: 1 },
};

// Runs @imgly/background-removal in a bundled Web Worker to avoid blocking the
// main thread. The bundler keeps the worker and its dependency out of the
// application thread; model assets remain loaded by @imgly on demand.
async function removeBackgroundInWorker(
  file: Blob,
  options: BackgroundRemovalOptions,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./backgroundRemoval.worker.ts", import.meta.url),
      { type: "module" },
    );
    let ready = false;

    worker.onmessage = (event) => {
      const data = event.data;

      // Worker signals initialization failed
      if (data.ready === false) {
        reject(new Error(data.error || "Worker initialization failed"));
        worker.terminate();
        return;
      }

      // Worker signals it's ready
      if (data.ready === true) {
        ready = true;
        worker.postMessage({ imageBlob: file, options });
        return;
      }

      const { success, result, error } = data;
      if (success) {
        resolve(result);
      } else {
        reject(new Error(error || "Unknown worker error"));
      }
      worker.terminate();
    };
    worker.onerror = (err) => {
      // err is ErrorEvent: use err.message (empty string) or err.filename + err.lineno
      const msg =
        err.message ||
        (err.filename ? `${err.filename}:${err.lineno}` : "Worker script error");
      reject(new Error(`Worker error: ${msg}`));
      worker.terminate();
    };

    // Timeout in case worker never signals ready
    setTimeout(() => {
      if (!ready) {
        reject(new Error("Worker failed to initialize (timeout)"));
        worker.terminate();
      }
    }, 10000);
  });
}

// Fallback: original dynamic import on main thread (used if worker fails)
async function removeBackgroundFallback(
  file: Blob,
  options: BackgroundRemovalOptions,
): Promise<Blob> {
  const { removeBackground } = await import("@imgly/background-removal");
  return removeBackground(file, options);
}

// Worker first, main-thread fallback second. Throws only when both fail.
export async function removeBackgroundWithFallback(
  file: Blob,
  onFallback: () => void,
): Promise<Blob> {
  const processingImage = await downscaleToMaxDimension(
    file,
    MAX_IMAGE_PROCESSING_DIMENSION_PX,
  );
  try {
    return await removeBackgroundInWorker(processingImage, PNG_OUTPUT);
  } catch (workerErr) {
    console.warn(
      "[backgroundRemoval] Worker failed, falling back to main thread:",
      workerErr,
    );
    onFallback();
    try {
      return await removeBackgroundFallback(processingImage, PNG_OUTPUT);
    } catch (fallbackError) {
      console.error(
        "[backgroundRemoval] Background removal failed in both worker and fallback:",
        { workerErr, fallbackError },
      );
      throw fallbackError;
    }
  }
}
