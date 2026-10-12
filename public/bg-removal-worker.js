// bg-removal-worker.js
// Web Worker for @imgly/background-removal to keep main thread responsive
// Loaded via: new Worker('/bg-removal-worker.js')

let removeBackgroundFn = null;
let initError = null;

// Load the UMD build from CDN (CSP allows cdn.jsdelivr.net)
try {
  importScripts('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/dist/index.umd.min.js');
  
  // @imgly/background-removal UMD export: try different possible globals
  removeBackgroundFn = 
    self.removeBackground ?? 
    self.BackgroundRemoval?.removeBackground ?? 
    self.default?.removeBackground ??
    (self.BackgroundRemoval && typeof self.BackgroundRemoval === 'function' ? self.BackgroundRemoval : null);
    
  if (!removeBackgroundFn || typeof removeBackgroundFn !== 'function') {
    const available = Object.keys(self).filter(k => k.toLowerCase().includes('background') || k.toLowerCase().includes('removal'));
    throw new Error('removeBackground not found in UMD globals. Available: ' + (available.join(', ') || 'none'));
  }
  
  self.postMessage({ ready: true, globals: Object.keys(self).filter(k => k.toLowerCase().includes('background') || k.toLowerCase().includes('removal')) });
} catch (loadError) {
  initError = loadError instanceof Error ? loadError.message : String(loadError);
  console.error('[bg-removal-worker] Init failed:', initError, loadError);
  self.postMessage({ 
    ready: false, 
    error: 'Worker init failed: ' + initError,
    stack: loadError instanceof Error ? loadError.stack : undefined
  });
}

// Handle unhandled errors in worker
self.onerror = (event) => {
  console.error('[bg-removal-worker] Unhandled error:', event.message, event.filename, event.lineno, event.colno);
  self.postMessage({ 
    success: false, 
    error: `Worker runtime error: ${event.message} at ${event.filename}:${event.lineno}:${event.colno}` 
  });
  return true; // prevent default
};

self.onunhandledrejection = (event) => {
  console.error('[bg-removal-worker] Unhandled rejection:', event.reason);
  self.postMessage({ 
    success: false, 
    error: `Worker unhandled rejection: ${event.reason}` 
  });
};

self.onmessage = async (event) => {
  const { imageBlob, options } = event.data;
  
  if (initError || !removeBackgroundFn) {
    self.postMessage({ 
      success: false, 
      error: initError || 'removeBackground function not available (init failed)' 
    });
    return;
  }
  
  try {
    console.log('[bg-removal-worker] Processing image:', imageBlob?.size, 'bytes');
    const result = await removeBackgroundFn(imageBlob, options);
    console.log('[bg-removal-worker] Success, result:', result?.size, 'bytes');
    // Blob is structured-cloneable but not transferable; passing it in the
    // transfer list raises DataCloneError and turns a successful cutout into
    // a worker failure followed by an unnecessary duplicate inference.
    self.postMessage({ success: true, result });
  } catch (error) {
    console.error('[bg-removal-worker] Processing error:', error);
    self.postMessage({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  }
};
