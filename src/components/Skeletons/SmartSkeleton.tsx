import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { ThreadLoader } from "./ThreadLoader";
import styles from "./SmartSkeleton.module.scss";

export type SkeletonVariant =
  | "top"
  | "bottom"
  | "footwear"
  | "outerwear"
  | "brand";

type SmartSkeletonProps = {
  label: string;
  variant?: SkeletonVariant;
  className?: string;
};

// Single-stroke thread paths (64x64 canvas): the invisible thread draws
// each silhouette in one continuous pass with round caps.
const THREAD_PATHS: Record<SkeletonVariant, string> = {
  // T-shirt: hem, left sleeve, collar curve, right sleeve, back to hem.
  top: "M20 54 V30 L10 24 L16 14 L26 20 Q32 25 38 20 L48 14 L54 24 L44 30 V54 H20",
  // Trousers: waistband, right leg, crotch curve, left leg, back to waist.
  bottom: "M20 10 H44 L46 54 H38 L33 26 Q32 22 31 26 L26 54 H18 L20 10",
  // Sneaker side profile: sole, upper, collar, back to the heel.
  footwear:
    "M8 44 H56 C58 37 55 33 49 31 L42 29 L36 22 C34 19 30 19 28 22 L25 28 H16 C11 28 8 32 8 38 L8 44",
  // Coat: long hem, sleeves, notched collar, back to the hem.
  outerwear:
    "M24 58 V30 L12 24 L18 12 L28 18 L32 14 L36 18 L46 12 L52 24 L40 30 V58 H24",
  // Mindy monogram: thread "M" for generic app loads.
  brand: "M14 50 V14 L32 36 L50 14 V50",
};

// Contextual loading state: the brand thread draws the silhouette while
// content loads, then breathes until the real garment photo swaps in.
// Generic loads default to the Mindy monogram.
export function SmartSkeleton({
  label,
  variant = "brand",
  className,
}: SmartSkeletonProps) {
  const ta = useTranslations("Accessibility");
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={ta("loading", { label })}
      className={cn(styles["smart-skeleton"], className)}
    >
      <ThreadLoader
        path={THREAD_PATHS[variant]}
        className={styles["smart-skeleton__thread"]}
      />
    </div>
  );
}
