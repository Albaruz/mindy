import { create } from "zustand";
import { NOTIFICATION_DURATION_MS } from "@/constants/animations";
import type { NotificationType } from "@/types/ui";


export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (type: NotificationType, message: string) => void;
  removeNotification: (id: string) => void;
}

// Visible lifetime of a toast. NotificationBubble starts its exit
// transition slightly before this so the removal never looks abrupt.
// Re-exported from centralized constants for backward compatibility.
export { NOTIFICATION_DURATION_MS };

function createNotificationId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

// Global toast queue. Auto-dismiss runs on a timeout per notification;
// manual dismissal via removeNotification is also supported.
export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],

  addNotification: (type, message) => {
    const id = createNotificationId();
    set((state) => ({
      notifications: [...state.notifications, { id, type, message }],
    }));
    setTimeout(() => {
      get().removeNotification(id);
    }, NOTIFICATION_DURATION_MS);
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter(
        (notification) => notification.id !== id,
      ),
    }));
  },
}));
