import { create } from "zustand";

export type NotificationType = "success" | "error" | "info";

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
export const NOTIFICATION_DURATION_MS = 3500;

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
