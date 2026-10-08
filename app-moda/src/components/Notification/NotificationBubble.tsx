"use client";

import { useEffect, useState } from "react";
import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  NOTIFICATION_DURATION_MS,
  NOTIFICATION_EXIT_MS,
} from "@/constants/animations";
import {
  type NotificationType,
} from "@/features/ui/useNotificationStore";
import styles from "./NotificationBubble.module.scss";

const ICONS = {
  success: CircleCheck,
  error: CircleAlert,
  info: Info,
} as const;

interface NotificationBubbleProps {
  type: NotificationType;
  message: string;
}

// Floating pill for a single toast. Plays the enter keyframes on mount and
// fades out just before the store removes it.
export function NotificationBubble({ type, message }: NotificationBubbleProps) {
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(
      () => setIsLeaving(true),
      NOTIFICATION_DURATION_MS - NOTIFICATION_EXIT_MS,
    );
    return () => clearTimeout(timer);
  }, []);

  const Icon = ICONS[type];

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      className={cn(styles.bubble, styles[type], isLeaving && styles.leaving)}
    >
      <Icon aria-hidden="true" size={20} className={styles.icon} />
      <p className={styles.message}>{message}</p>
    </div>
  );
}
