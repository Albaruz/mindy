import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryState } from "./QueryState";

function renderState(props: { isPending: boolean; isError: boolean }) {
  const onRetry = vi.fn();
  render(
    <QueryState
      {...props}
      pending={<p>loading</p>}
      errorMessage="failed"
      retryLabel="Retry"
      onRetry={onRetry}
    >
      <p>content</p>
    </QueryState>,
  );
  return onRetry;
}

describe("QueryState", () => {
  it("shows the pending slot while loading", () => {
    renderState({ isPending: true, isError: false });
    expect(screen.getByText("loading")).toBeInTheDocument();
    expect(screen.queryByText("content")).not.toBeInTheDocument();
  });

  it("shows the error with a working retry button", () => {
    const onRetry = renderState({ isPending: false, isError: true });
    expect(screen.getByText("failed")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows the content once loaded", () => {
    renderState({ isPending: false, isError: false });
    expect(screen.getByText("content")).toBeInTheDocument();
  });
});