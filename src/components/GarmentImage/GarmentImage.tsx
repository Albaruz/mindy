interface GarmentImageProps {
  /** Garment photo URL; null renders the placeholder (or nothing). */
  src: string | null;
  /** Descriptive alternative (WCAG 1.1.1). */
  alt: string;
  className?: string;
  /** Decorative stand-in for garments without a photo. Omit to render nothing. */
  placeholderClassName?: string;
  /** eager marks above-the-fold images as high priority. */
  loading?: "lazy" | "eager";
}

/**
 * Garment photo or its placeholder. Supabase remote URLs have no next/image
 * loader configured; a native img keeps PWA runtime caching (see
 * next.config.js) intact, so the lint exception lives here only.
 */
export function GarmentImage({
  src,
  alt,
  className,
  placeholderClassName,
  loading = "lazy",
}: GarmentImageProps) {
  if (src === null) {
    return placeholderClassName !== undefined ? (
      <div className={placeholderClassName} aria-hidden="true" />
    ) : null;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={loading}
      decoding={loading === "eager" ? "async" : undefined}
      fetchPriority={loading === "eager" ? "high" : undefined}
      className={className}
    />
  );
}