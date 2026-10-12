import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NotificationContainer } from "./NotificationContainer";
import { useNotificationStore } from "@/features/ui/useNotificationStore";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

afterEach(() => {
  useNotificationStore.setState({ notifications: [] });
});

describe("NotificationContainer", () => {
  it("renders nothing when there are no notifications", () => {
    const { container } = render(<NotificationContainer />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders notifications from the store", () => {
    useNotificationStore.setState({
      notifications: [
        { id: "1", type: "success", message: "Saved" },
        { id: "2", type: "error", message: "Failed" },
      ],
    });
    render(<NotificationContainer />);
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("exposes a polite live region", () => {
    useNotificationStore.setState({
      notifications: [{ id: "1", type: "info", message: "Heads up" }],
    });
    render(<NotificationContainer />);
    const region = screen.getByText("Heads up").closest("div");
    expect(region?.parentElement).toHaveAttribute("aria-live", "polite");
  });
});
