import { describe, expect, it, vi } from "vitest";
import { getSessionUser, requireUser } from "./session";

function clientWith(user: { id: string } | null) {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) } };
}

describe("session helpers", () => {
  it("getSessionUser returns the user or null", async () => {
    expect(await getSessionUser(clientWith({ id: "u1" }) as never)).toEqual({
      id: "u1",
    });
    expect(await getSessionUser(clientWith(null) as never)).toBeNull();
  });

  it("requireUser returns the user when signed in", async () => {
    const user = await requireUser(clientWith({ id: "u1" }) as never, "no");
    expect(user.id).toBe("u1");
  });

  it("requireUser throws the given message without a session", async () => {
    await expect(requireUser(clientWith(null) as never, "Sign in")).rejects.toThrow(
      "Sign in",
    );
  });
});