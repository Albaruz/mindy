"use client";

import { useEffect, useState } from "react";
import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  NOTIFICATION_DURATION_MS,
  type NotificationType,
} from "@/features/ui/useNotificationStore";
import styles from "./NotificationBubble.module.scss";

const ICONS = {
  success: CircleCheck,
  error: CircleAlert,
  info: Info,
} as const;

// Exit transition length. Kept in sync with the .leaving transition.
const EXIT_MS = 300;

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
      NOTIFICATION_DURATION_MS - EXIT_MS,
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
