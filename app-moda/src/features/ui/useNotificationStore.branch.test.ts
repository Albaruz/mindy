import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNotificationStore } from "./useNotificationStore";

describe("useNotificationStore branch coverage", () => {
  beforeEach(() => {
    useNotificationStore.setState({ notifications: [] });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("generates a fallback id when randomUUID is unavailable", () => {
    const withoutUUID = { ...globalThis.crypto };
    delete (withoutUUID as { randomUUID?: unknown }).randomUUID;
    vi.stubGlobal("crypto", withoutUUID);
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);
    try {
      useNotificationStore.getState().addNotification("info", "Fallback id");
    } finally {
      randomSpy.mockRestore();
    }
    const [created] = useNotificationStore.getState().notifications;
    expect(created.id).toContain("-");
    expect(created.message).toBe("Fallback id");
  });

  it("uses randomUUID when available", () => {
    useNotificationStore.getState().addNotification("success", "With uuid");
    const [created] = useNotificationStore.getState().notifications;
    expect(typeof created.id).toBe("string");
    expect(created.id.length).toBeGreaterThan(0);
  });
});
