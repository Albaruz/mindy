import { cn } from "@/lib/utils";
import type { Morphology } from "@/types/user";
import styles from "./MorphoIcon.module.scss";

// Continuous-line body icons, one per morphology type. Shared stroke
// language with the onboarding thread illustrations: Brown Ash ink via
// currentColor (contexts tint it), no fill, round joins.
const BODY_PATHS: Record<Morphology, string> = {
  // Narrow shoulders, wide hips.
  triangle:
    "M38 30 Q48 27 58 30 L56 50 Q55 60 58 70 L66 98 Q48 106 30 98 L38 70 Q41 60 40 50 Z",
  // Wide shoulders, narrow hips.
  inverted_triangle:
    "M28 30 Q48 25 68 30 L62 52 Q60 62 58 72 L56 100 Q48 104 40 100 L38 72 Q36 62 34 52 Z",
  // Balanced bust/hips with a pinched waist.
  hourglass:
    "M34 30 Q48 27 62 30 L60 48 Q53 56 52 64 Q53 72 60 80 L62 100 Q48 106 34 100 L36 80 Q43 72 44 64 Q43 56 36 48 Z",
  // Straight silhouette, minimal waist definition.
  rectangle:
    "M34 30 Q48 27 62 30 L60 52 Q59 64 60 76 L62 100 Q48 104 34 100 L36 76 Q37 64 36 52 Z",
  // Rounded midsection, waist is the widest point.
  oval: "M36 30 Q48 27 60 30 L62 52 Q68 64 66 78 Q64 94 56 100 Q48 104 40 100 Q32 94 30 78 Q28 64 34 52 Z",
};

export function MorphoIcon({
  type,
  className,
}: {
  type: Morphology;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 96 128"
      aria-hidden="true"
      focusable="false"
      className={cn(styles.morphoIcon, className)}
    >
      <circle
        cx="48"
        cy="14"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <path
        d={BODY_PATHS[type]}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
