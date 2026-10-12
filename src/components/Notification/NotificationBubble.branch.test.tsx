import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { NotificationBubble } from "./NotificationBubble";
import { NOTIFICATION_DURATION_MS, NOTIFICATION_EXIT_MS } from "@/constants/animations";

describe("NotificationBubble branch coverage", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("applies the exiting style before removal", () => {
    vi.useFakeTimers();
    const { container } = render(<NotificationBubble type="success" message="Saved" />);
    expect(container.firstChild?.className ?? "").not.toContain("exiting");
    act(() => {
      vi.advanceTimersByTime(NOTIFICATION_DURATION_MS - NOTIFICATION_EXIT_MS);
    });
    expect(screen.getByRole("status").className).toContain("exiting");
  });
});
