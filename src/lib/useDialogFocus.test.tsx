import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useDialogFocus } from "./useDialogFocus";

function Harness({ onClose }: { onClose: () => void }) {
  const ref = useDialogFocus<HTMLDivElement>(onClose);
  return (
    <div ref={ref} role="alertdialog" aria-label="dialog" tabIndex={-1}>
      <button type="button">First</button>
      <button type="button">Second</button>
    </div>
  );
}

describe("useDialogFocus", () => {
  it("moves focus into the dialog on mount", () => {
    render(<Harness onClose={() => {}} />);
    expect(screen.getByRole("alertdialog")).toContainElement(
      document.activeElement as HTMLElement,
    );
  });

  it("calls onClose on Escape", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ignores non-Escape keys", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Enter" });
    expect(onClose).not.toHaveBeenCalled();
  });
});
