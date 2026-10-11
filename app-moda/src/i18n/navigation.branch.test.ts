import { describe, expect, it, vi } from "vitest";

const mockNavigation = vi.hoisted(() => ({
  Link: function MockLink() {
    return null;
  },
  redirect: vi.fn(),
  usePathname: vi.fn(),
  useRouter: vi.fn(),
}));

vi.mock("next-intl/navigation", () => ({
  createNavigation: vi.fn(() => mockNavigation),
}));

import {
  Link,
  redirect,
  usePathname,
  useRouter,
} from "./navigation";
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

describe("navigation branch coverage", () => {
  it("builds locale-aware primitives from the app routing", () => {
    expect(createNavigation).toHaveBeenCalledWith(routing);
    expect(Link).toBe(mockNavigation.Link);
    expect(redirect).toBe(mockNavigation.redirect);
    expect(usePathname).toBe(mockNavigation.usePathname);
    expect(useRouter).toBe(mockNavigation.useRouter);
  });
});
