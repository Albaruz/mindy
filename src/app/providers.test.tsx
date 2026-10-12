import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@tanstack/react-query-persist-client", () => ({
  PersistQueryClientProvider: ({
    children,
  }: {
    children: React.ReactNode;
  }) => <>{children}</>,
}));

import { PERSISTED_CACHE_KEY, Providers } from "./providers";

describe("Providers", () => {
  it("renders children without crashing", () => {
    render(
      <Providers>
        <p>provider-child</p>
      </Providers>,
    );
    expect(screen.getByText("provider-child")).toBeInTheDocument();
  });

  it("re-exports the persisted cache key", () => {
    expect(typeof PERSISTED_CACHE_KEY).toBe("string");
    expect(PERSISTED_CACHE_KEY.length).toBeGreaterThan(0);
  });
});
