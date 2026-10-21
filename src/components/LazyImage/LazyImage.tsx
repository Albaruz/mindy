"use client";

import { useEffect, useRef, useState } from "react";
import type { ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import styles from "./LazyImage.module.scss";

type LazyImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "loading" | "srcSet"
> & {
  src: string;
  alt: string;
  // Explicit loading strategy. "lazy" (default) defers offscreen fetches
  // via IntersectionObserver + native lazy. "eager" loads immediately
  // (use for the active carousel slide and its immediate neighbours).
  loading?: "lazy" | "eager";
  // Distance threshold to start loading before the image enters view.
  rootMargin?: string;
  // Only the visible image should compete for high-priority network bandwidth.
  priority?: boolean;
  wrapperClassName?: string;
};

// Deferred image with shimmer placeholder and fade-in.
// Renders the placeholder until the image is near the viewport,
// then swaps in the img tag to avoid fetching offscreen slides.
export function LazyImage({
  src,
  alt,
  loading = "lazy",
  rootMargin = "200px",
  priority = false,
  className,
  wrapperClassName,
  onLoad,
  onError,
  ...imgProps
}: LazyImageProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const isEager = loading === "eager";
  // Load immediately when eager or when IntersectionObserver is
  // unavailable (old browsers, SSR); otherwise wait for intersection.
  const [inView, setInView] = useState(
    () => isEager || typeof IntersectionObserver === "undefined",
  );
  // Track which src finished/failed so slide reuse in loop mode derives
  // its placeholder state during render instead of syncing via effects.
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const isLoaded = loadedSrc === src;
  const hasError = failedSrc === src;
  const shouldLoad = isEager || inView;

  useEffect(() => {
    if (isEager || inView) {
      return;
    }
    const node = wrapperRef.current;
    if (node === null) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [inView, isEager, rootMargin]);

  return (
    <div ref={wrapperRef} className={cn(styles["lazy-image"], wrapperClassName)}>
      {shouldLoad && !hasError ? (
        // Supabase remote URLs have no next/image loader configured;
        // native img keeps PWA runtime caching (see next.config.js) intact.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          onLoad={(event) => {
            setLoadedSrc(src);
            onLoad?.(event);
          }}
          onError={(event) => {
            setFailedSrc(src);
            onError?.(event);
          }}
          className={cn(styles["lazy-image__image"], isLoaded && styles["lazy-image__image--loaded"], className)}
          {...imgProps}
        />
      ) : null}
      {!isLoaded || hasError ? (
        <div className={styles["lazy-image__placeholder"]} aria-hidden="true" />
      ) : null}
    </div>
  );
}
