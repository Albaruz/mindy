import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import styles from "./PageHeader.module.scss";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  align?: "start" | "center";
}

// Canonical page heading: Playfair h1 (via global typography) with an
// optional muted description and an actions slot (links, buttons).
export function PageHeader({
  title,
  description,
  actions,
  align = "start",
}: PageHeaderProps) {
  return (
    <div className={cn(styles.header, align === "center" && styles.centered)}>
      <h1 className={styles.title}>{title}</h1>
      {description !== undefined ? (
        <p className={styles.description}>{description}</p>
      ) : null}
      {actions !== undefined ? (
        <div className={styles.actions}>{actions}</div>
      ) : null}
    </div>
  );
}
