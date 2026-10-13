import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import styles from "./PageHeader.module.scss";

interface PageHeaderProps {
  /** Page title. */
  title: string;
  /** Optional description/subtitle. */
  description?: string;
  /** Action buttons/links. */
  actions?: ReactNode;
  /** Alignment: start (default) or center. */
  align?: "start" | "center";
  /** Compact variant for tight spaces. */
  compact?: boolean;
  /** Optional avatar or leading visual. */
  avatar?: ReactNode;
}

/**
 * Canonical page heading: Playfair h1 with optional description and actions slot.
 */
export function PageHeader({
  title,
  description,
  actions,
  align = "start",
  compact = false,
  avatar,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        styles["page-header"],
        align === "center" && styles["page-header--centered"],
        compact && styles["page-header--compact"],
        avatar != null && styles["page-header--with-avatar"]
      )}
    >
      {avatar && <div className={styles["page-header__avatar"]}>{avatar}</div>}
      <div className={styles["page-header__content"]}>
        <h1 className={styles["page-header__title"]}>{title}</h1>
        {description !== undefined && (
          <p className={styles["page-header__description"]}>{description}</p>
        )}
      </div>
      {actions !== undefined && (
        <div className={styles["page-header__actions"]}>{actions}</div>
      )}
    </div>
  );
}