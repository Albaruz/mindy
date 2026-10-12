import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "es",
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Server actions behind useActionState: fail only for a known address so
// both the success wiring and the error alert are observable in jsdom.
vi.mock("./actions", () => ({
  signInAction: vi.fn(
    async (_previousState: { error: string | null; message: string | null }, formData: FormData) => {
      const email = String(formData.get("email") ?? "");
      if (email === "unknown@example.com") {
        return { error: "badCredentials", message: null };
      }
      return { error: null, message: null };
    },
  ),
  signUpAction: vi.fn(async () => ({ error: null, message: null })),
}));

import { signInAction, signUpAction } from "./actions";
import { AuthForm } from "./AuthForm";

const signInMock = vi.mocked(signInAction);
const signUpMock = vi.mocked(signUpAction);

describe("AuthForm", () => {
  it("renders email and password inputs in login mode", () => {
    render(<AuthForm />);
    expect(screen.getByLabelText("email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("email")).toBeRequired();
    expect(screen.getByLabelText("password")).toBeRequired();
    expect(screen.getByRole("form", { name: "login" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "login", pressed: true }),
    ).toBeInTheDocument();
  });

  it("toggles between login and signup modes", async () => {
    const user = userEvent.setup();
    render(<AuthForm />);
    await user.click(screen.getByRole("button", { name: "signup" }));
    expect(screen.getByRole("form", { name: "signup" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "signup", pressed: true }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "login" }));
    expect(screen.getByRole("form", { name: "login" })).toBeInTheDocument();
  });

  it("submits login credentials to the sign-in action", async () => {
    const user = userEvent.setup();
    render(<AuthForm />);
    const form = screen.getByRole("form", { name: "login" });
    await user.type(screen.getByLabelText("email"), "ada@example.com");
    await user.type(screen.getByLabelText("password"), "secret123");
    await user.click(within(form).getByRole("button", { name: "login" }));
    await waitFor(() => {
      expect(signInMock).toHaveBeenCalled();
    });
    const formData = signInMock.mock.calls[0][1] as FormData;
    expect(String(formData.get("email"))).toBe("ada@example.com");
  });

  it("submits signup credentials to the sign-up action", async () => {
    const user = userEvent.setup();
    render(<AuthForm />);
    await user.click(screen.getByRole("button", { name: "signup" }));
    const form = screen.getByRole("form", { name: "signup" });
    await user.type(screen.getByLabelText("email"), "new@example.com");
    await user.type(screen.getByLabelText("password"), "secret123");
    await user.click(within(form).getByRole("button", { name: "signup" }));
    await waitFor(() => {
      expect(signUpMock).toHaveBeenCalled();
    });
  });

  it("shows the server error message on failed sign-in", async () => {
    const user = userEvent.setup();
    render(<AuthForm />);
    const form = screen.getByRole("form", { name: "login" });
    await user.type(screen.getByLabelText("email"), "unknown@example.com");
    await user.type(screen.getByLabelText("password"), "secret123");
    await user.click(within(form).getByRole("button", { name: "login" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("badCredentials");
  });

  it("renders the remember-me checkbox and forgot-password link", () => {
    render(<AuthForm />);
    expect(screen.getByRole("checkbox", { name: "rememberMe" })).toBeChecked();
    expect(
      screen.getByRole("link", { name: "forgotPassword" }),
    ).toHaveAttribute("href", "/forgot-password");
  });
});
