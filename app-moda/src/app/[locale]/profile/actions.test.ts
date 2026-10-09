// @vitest-environment node
// Unit tests for signOutAction: session cleanup and localized redirect.
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCookieDelete } = vi.hoisted(() => ({
  mockCookieDelete: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string): never => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ delete: mockCookieDelete })),
}));

vi.mock("@/lib/serverLocale", () => ({
  resolveRequestLocale: vi.fn(async () => "es"),
}));

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { signOutAction } from "./actions";

const mockCreateClient = vi.mocked(createClient);
const mockRevalidatePath = vi.mocked(revalidatePath);

describe("signOutAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("signs out, clears remember cookies, and redirects home", async () => {
    const signOut = vi.fn(async () => ({ error: null }));
    mockCreateClient.mockResolvedValue({
      auth: { signOut },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    await expect(signOutAction()).rejects.toThrow("/es/");
    expect(signOut).toHaveBeenCalledOnce();
    expect(mockCookieDelete).toHaveBeenCalledTimes(2);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});
