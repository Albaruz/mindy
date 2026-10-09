import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NotificationBubble } from "./NotificationBubble";

describe("NotificationBubble", () => {
  it("renders a success message as status", () => {
    render(<NotificationBubble type="success" message="Saved" />);
    const toast = screen.getByRole("status");
    expect(toast).toHaveTextContent("Saved");
  });

  it("renders an info message as status", () => {
    render(<NotificationBubble type="info" message="Heads up" />);
    expect(screen.getByRole("status")).toHaveTextContent("Heads up");
  });

  it("renders an error message as alert", () => {
    render(<NotificationBubble type="error" message="Failed" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Failed");
  });
});
