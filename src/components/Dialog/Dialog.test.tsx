import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogMessage,
  DialogTitle,
} from "./Dialog";

function renderDialog(onClose = vi.fn(), role?: "alertdialog") {
  render(
    <Dialog
      role={role}
      labelledBy="t"
      describedBy="m"
      onClose={onClose}
      className="custom-container"
      overlayClassName="custom-overlay"
    >
      <DialogHeader>
        <DialogTitle id="t">Title</DialogTitle>
        <DialogClose label="Close it" onClick={onClose} />
      </DialogHeader>
      <DialogBody>
        <DialogMessage id="m">Message</DialogMessage>
      </DialogBody>
      <DialogFooter layout="stacked">
        <DialogActions>
          <button type="button">Go</button>
        </DialogActions>
      </DialogFooter>
    </Dialog>,
  );
  return onClose;
}

describe("Dialog", () => {
  it("wires ARIA, role and class names", () => {
    renderDialog();
    const dialog = screen.getByRole("dialog", { name: "Title" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-describedby", "m");
    expect(dialog).toHaveClass("dialog-shell__container", "custom-container");
    expect(dialog.parentElement).toHaveClass(
      "dialog-shell__overlay",
      "custom-overlay",
    );
    expect(screen.getByText("Message")).toHaveClass("dialog-shell__message");
    expect(screen.getByText("Go").closest("footer")).toHaveClass(
      "dialog-shell__footer--stacked",
    );
  });

  it("supports the alertdialog role", () => {
    renderDialog(vi.fn(), "alertdialog");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("closes from the close button, Escape and the overlay but not the container", () => {
    const onClose = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Close it" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledTimes(2);

    const overlay = screen.getByRole("dialog").parentElement as HTMLElement;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});