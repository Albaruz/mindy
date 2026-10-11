import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { useDialogFocus } from "./useDialogFocus";

function TrapHarness({ onClose }: { onClose: () => void }) {
  const ref = useDialogFocus<HTMLDivElement>(onClose);
  return (
    <div ref={ref} role="alertdialog" aria-label="trap dialog" tabIndex={-1}>
      <button type="button">First</button>
      <button type="button">Second</button>
    </div>
  );
}

function EmptyHarness({ onClose }: { onClose: () => void }) {
  const ref = useDialogFocus<HTMLDivElement>(onClose);
  return (
    <div ref={ref} role="alertdialog" aria-label="empty dialog" tabIndex={-1}>
      <span>Static content</span>
    </div>
  );
}

function revealInLayout(container: HTMLElement) {
  for (const element of container.querySelectorAll("button")) {
    Object.defineProperty(element, "offsetParent", {
      configurable: true,
      get: () => document.body,
    });
  }
}

describe("useDialogFocus branch coverage", () => {
  it("wraps focus from the last element to the first on Tab", () => {
    const { container } = render(<TrapHarness onClose={() => {}} />);
    revealInLayout(container);
    const buttons = screen.getAllByRole("button");
    buttons[buttons.length - 1]?.focus();
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(buttons[0]);
  });

  it("wraps focus from the first element to the last on Shift Tab", () => {
    const { container } = render(<TrapHarness onClose={() => {}} />);
    revealInLayout(container);
    const buttons = screen.getAllByRole("button");
    buttons[0]?.focus();
    expect(document.activeElement).toBe(buttons[0]);
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);
  });

  it("blocks Tab when the dialog has no focusable children", () => {
    const onClose = vi.fn();
    render(<EmptyHarness onClose={onClose} />);
    const dialog = screen.getByRole("alertdialog");
    dialog.focus();
    const event = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    const prevented = !document.dispatchEvent(event);
    expect(prevented || event.defaultPrevented || dialog).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("ignores Tab when no dialog node is attached", () => {
    const onClose = vi.fn();
    renderHook(() => useDialogFocus<HTMLDivElement>(onClose));
    fireEvent.keyDown(document, { key: "Tab" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("restores focus to the previously focused element on unmount", () => {
    const outside = document.createElement("button");
    outside.textContent = "outside";
    document.body.appendChild(outside);
    outside.focus();
    const { unmount } = render(<TrapHarness onClose={() => {}} />);
    unmount();
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });
});
