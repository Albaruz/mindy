import { describe, expect, it, vi } from "vitest";
import { ERROR_CODES } from "@/constants/errors";
import { AppError } from "@/lib/errors";
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
    const user = await requireUser(clientWith({ id: "u1" }) as never);
    expect(user.id).toBe("u1");
  });

  it("requireUser throws a stable error code without a session", async () => {
    await expect(requireUser(clientWith(null) as never)).rejects.toEqual(
      new AppError(ERROR_CODES.SESSION_REQUIRED),
    );
  });
});
