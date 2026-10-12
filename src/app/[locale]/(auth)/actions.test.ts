// @vitest-environment node
// Unit tests for signInAction and signUpAction: validation, auth branches,
// remember-me cookies, and localized redirect targets.
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreateServerClient, mockCookieGet, mockCookieSet, mockCookieDelete } = vi.hoisted(() => ({
  mockCreateServerClient: vi.fn(),
  mockCookieGet: vi.fn(),
  mockCookieSet: vi.fn(),
  mockCookieDelete: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
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
  cookies: vi.fn(async () => ({
    get: (name: string) => mockCookieGet(name),
    set: mockCookieSet,
    delete: mockCookieDelete,
    getAll: () => [],
  })),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
}));

vi.mock("@/lib/serverLocale", () => ({
  resolveRequestLocale: vi.fn(async () => "es"),
}));

import { revalidatePath } from "next/cache";
import { signInAction, signUpAction } from "./actions";

const mockRevalidatePath = vi.mocked(revalidatePath);

const INITIAL = { error: null, message: null };

const STRONG_PASSWORD = "Secret12!";

function formData(
  email: string,
  password: string,
  remember = false,
  confirm?: string,
): FormData {
  const data = new FormData();
  data.set("email", email);
  data.set("password", password);
  // Sign-up sends the confirmation field; default it to the password so
  // existing sign-in calls keep working unchanged.
  data.set("confirm", confirm ?? password);
  if (remember) {
    data.set("remember", "on");
  }
  return data;
}

function profileChain(data: unknown, rejects = false) {
  const maybeSingle = rejects
    ? vi.fn(async () => {
        throw new Error("profile lookup failed");
      })
    : vi.fn(async () => ({ data, error: null }));
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  return vi.fn(() => ({ select }));
}

interface AuthMockOptions {
  signIn?: { data?: unknown; error?: { message: string } | null } | Error;
  signUp?: { data?: unknown; error?: { message: string } | null } | Error;
  profile?: unknown;
  profileRejects?: boolean;
}

function mockSupabase({ signIn, signUp, profile, profileRejects }: AuthMockOptions) {
  const authMock = {
    signInWithPassword: vi.fn(async () => {
      if (signIn instanceof Error) {
        return Promise.reject(signIn);
      }
      return signIn ?? { data: { user: null }, error: null };
    }),
    signUp: vi.fn(async () => {
      if (signUp instanceof Error) {
        return Promise.reject(signUp);
      }
      return signUp ?? { data: { user: null, session: null }, error: null };
    }),
  };
  mockCreateServerClient.mockReturnValue({
    auth: authMock,
    from: profileChain(profile ?? null, profileRejects ?? false),
  });
  return authMock;
}

const COMPLETE_PROFILE = {
  colorimetry: "autumn",
  morphology: "rectangle",
  preferred_fit: "regular",
  lifestyle: "casual_daily",
};

describe("signInAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects an invalid email without calling Supabase", async () => {
    const result = await signInAction(INITIAL, formData("not-an-email", "secret12"));
    expect(result).toEqual({ ...INITIAL, error: "invalidEmail" });
    expect(mockCreateServerClient).not.toHaveBeenCalled();
  });

  it("rejects a short password without calling Supabase", async () => {
    const result = await signInAction(INITIAL, formData("user@example.com", "123"));
    expect(result).toEqual({ ...INITIAL, error: "shortPassword" });
    expect(mockCreateServerClient).not.toHaveBeenCalled();
  });

  it("returns badCredentials when sign-in fails", async () => {
    mockSupabase({
      signIn: { data: { user: null }, error: { message: "Invalid login" } },
    });
    const result = await signInAction(INITIAL, formData("user@example.com", "secret12"));
    expect(result).toEqual({ ...INITIAL, error: "badCredentials" });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("returns noService when sign-in throws", async () => {
    mockSupabase({ signIn: new Error("network down") });
    const result = await signInAction(INITIAL, formData("user@example.com", "secret12"));
    expect(result).toEqual({ ...INITIAL, error: "noService" });
  });

  it("redirects to the generator for a complete profile", async () => {
    mockSupabase({
      signIn: { data: { user: { id: "user-1" } }, error: null },
      profile: COMPLETE_PROFILE,
    });
    await expect(
      signInAction(INITIAL, formData("user@example.com", "secret12", true)),
    ).rejects.toThrow(/\/(?:en|es)\/generator/);
    expect(mockCookieSet).toHaveBeenCalledTimes(2);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("redirects to onboarding for an incomplete profile", async () => {
    mockSupabase({
      signIn: { data: { user: { id: "user-1" } }, error: null },
      profile: null,
    });
    await expect(
      signInAction(INITIAL, formData("user@example.com", "secret12")),
    ).rejects.toThrow(/\/(?:en|es)\/profile\/onboarding/);
    expect(mockCookieDelete).toHaveBeenCalledTimes(2);
  });

  it("redirects to the generator when no user id is returned", async () => {
    const { signInWithPassword } = mockSupabase({
      signIn: { data: { user: null }, error: null },
    });
    await expect(
      signInAction(INITIAL, formData("user@example.com", "secret12")),
    ).rejects.toThrow(/\/(?:en|es)\/generator/);
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "secret12",
    });
  });

  it("treats a failing profile lookup as complete", async () => {
    mockSupabase({
      signIn: { data: { user: { id: "user-1" } }, error: null },
      profileRejects: true,
    });
    await expect(
      signInAction(INITIAL, formData("user@example.com", "secret12")),
    ).rejects.toThrow(/\/(?:en|es)\/generator/);
  });
});

describe("signUpAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects an invalid email without calling Supabase", async () => {
    const result = await signUpAction(INITIAL, formData("bad", STRONG_PASSWORD));
    expect(result).toEqual({ ...INITIAL, error: "invalidEmail" });
    expect(mockCreateServerClient).not.toHaveBeenCalled();
  });

  it("rejects a weak password without calling Supabase", async () => {
    const result = await signUpAction(INITIAL, formData("user@example.com", "secret12"));
    expect(result).toEqual({ ...INITIAL, error: "weakPassword" });
    expect(mockCreateServerClient).not.toHaveBeenCalled();
  });

  it("rejects a short password without calling Supabase", async () => {
    const result = await signUpAction(INITIAL, formData("user@example.com", "123"));
    expect(result).toEqual({ ...INITIAL, error: "weakPassword" });
    expect(mockCreateServerClient).not.toHaveBeenCalled();
  });

  it("rejects a mismatched confirmation without calling Supabase", async () => {
    const result = await signUpAction(
      INITIAL,
      formData("user@example.com", STRONG_PASSWORD, false, "Different12!"),
    );
    expect(result).toEqual({ ...INITIAL, error: "passwordMismatch" });
    expect(mockCreateServerClient).not.toHaveBeenCalled();
  });

  it("reports an existing account", async () => {
    mockSupabase({
      signUp: { data: {}, error: { message: "User already registered" } },
    });
    const result = await signUpAction(INITIAL, formData("user@example.com", STRONG_PASSWORD));
    expect(result).toEqual({ ...INITIAL, error: "accountExists" });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("returns noService on a generic sign-up error", async () => {
    mockSupabase({
      signUp: { data: {}, error: { message: "database offline" } },
    });
    const result = await signUpAction(INITIAL, formData("user@example.com", STRONG_PASSWORD));
    expect(result).toEqual({ ...INITIAL, error: "noService" });
  });

  it("returns noService when sign-up throws", async () => {
    mockSupabase({ signUp: new Error("network down") });
    const result = await signUpAction(INITIAL, formData("user@example.com", STRONG_PASSWORD));
    expect(result).toEqual({ ...INITIAL, error: "noService" });
  });

  it("asks for email confirmation when no session is created", async () => {
    mockSupabase({
      signUp: { data: { user: { id: "user-1" }, session: null }, error: null },
    });
    const result = await signUpAction(INITIAL, formData("user@example.com", STRONG_PASSWORD));
    expect(result).toEqual({ ...INITIAL, message: "confirmEmail" });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("redirects new sessions to onboarding", async () => {
    mockSupabase({
      signUp: {
        data: { user: { id: "user-1" }, session: { access_token: "token" } },
        error: null,
      },
    });
    await expect(
      signUpAction(INITIAL, formData("user@example.com", STRONG_PASSWORD, true)),
    ).rejects.toThrow(/\/(?:en|es)\/profile\/onboarding/);
    expect(mockCookieSet).toHaveBeenCalledTimes(2);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});
