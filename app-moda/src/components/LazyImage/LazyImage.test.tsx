import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { LazyImage } from "./LazyImage";

type ObserverCallback = (
  entries: Array<{ isIntersecting: boolean }>,
) => void;

let lastCallback: ObserverCallback | null = null;
let disconnectSpy = vi.fn();
let observeSpy = vi.fn();

function installObserverMock() {
  lastCallback = null;
  disconnectSpy = vi.fn();
  observeSpy = vi.fn();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      callback: ObserverCallback;
      constructor(callback: ObserverCallback) {
        this.callback = callback;
        lastCallback = callback;
      }
      observe = (...args: unknown[]) => {
        observeSpy(...args);
      };
      disconnect = () => {
        disconnectSpy();
      };
    },
  );
}

function intersect() {
  act(() => {
    lastCallback?.([{ isIntersecting: true }]);
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LazyImage", () => {
  it("loads immediately when eager", () => {
    render(<LazyImage src="photo.jpg" alt="Garment" loading="eager" />);
    expect(screen.getByRole("img", { name: "Garment" })).toHaveAttribute(
      "src",
      "photo.jpg",
    );
  });

  it("defers loading until the image intersects", () => {
    installObserverMock();
    render(<LazyImage src="photo.jpg" alt="Garment" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(observeSpy).toHaveBeenCalled();
    intersect();
    expect(screen.getByRole("img", { name: "Garment" })).toHaveAttribute(
      "src",
      "photo.jpg",
    );
  });

  it("renders a placeholder while deferred", () => {
    installObserverMock();
    const { container } = render(<LazyImage src="photo.jpg" alt="Garment" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.firstChild).toBeInTheDocument();
  });
});
