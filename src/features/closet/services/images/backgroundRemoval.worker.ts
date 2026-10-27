import { removeBackground } from "@imgly/background-removal";

interface BackgroundRemovalMessage {
  imageBlob: Blob;
  options: {
    output: { format: "image/png"; quality: number };
  };
}

interface BackgroundRemovalWorkerScope {
  onmessage: (event: MessageEvent<BackgroundRemovalMessage>) => void;
  postMessage: (message: unknown) => void;
}

const workerScope = self as unknown as BackgroundRemovalWorkerScope;

workerScope.onmessage = async ({ data }) => {
  try {
    const result = await removeBackground(data.imageBlob, data.options);
    workerScope.postMessage({ success: true, result });
  } catch (error) {
    workerScope.postMessage({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

workerScope.postMessage({ ready: true });
