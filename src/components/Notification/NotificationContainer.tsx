"use client";

import { useTranslations } from "next-intl";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { NotificationBubble } from "./NotificationBubble";
import styles from "./NotificationContainer.module.scss";

// Global toast stack. Render once inside <body> in the root layout so every
// route can notify via useNotificationStore(). Polite live region: screen
// readers announce toasts without stealing focus.
export function NotificationContainer() {
  const ta = useTranslations("Accessibility");
  const notifications = useNotificationStore((state) => state.notifications);

  return notifications.length > 0 ? (
    <div
      aria-live="polite"
      aria-label={ta("notifications")}
      className={styles.container}
    >
      {notifications.map((notification) => (
        <NotificationBubble
          key={notification.id}
          type={notification.type}
          message={notification.message}
        />
      ))}
    </div>
  ) : null;
}
