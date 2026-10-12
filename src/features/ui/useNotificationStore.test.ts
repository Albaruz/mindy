import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNotificationStore } from "./useNotificationStore";

describe("useNotificationStore", () => {
  beforeEach(() => {
    useNotificationStore.setState({ notifications: [] });
    vi.useFakeTimers();
  });

  it("adds and removes notifications", () => {
    const { addNotification, removeNotification } =
      useNotificationStore.getState();
    addNotification("success", "Look saved");
    const [created] = useNotificationStore.getState().notifications;
    expect(created.type).toBe("success");
    removeNotification(created.id);
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });

  it("auto-dismisses after duration", () => {
    useNotificationStore.getState().addNotification("error", "Failed");
    expect(useNotificationStore.getState().notifications).toHaveLength(1);
    vi.runAllTimers();
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });
});
