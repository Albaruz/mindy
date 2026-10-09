import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useOnboardingStore } from "@/features/onboarding/onboardingStore";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "es",
}));

// Synchronous motion: AnimatePresence exit animations would otherwise keep
// the previous step mounted and make step assertions flaky.
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  MotionConfig: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: ({
      children,
      className,
    }: {
      children?: React.ReactNode;
      className?: string;
    }) => <div className={className}>{children}</div>,
  },
}));

const pushMock = vi.fn();

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/actions/profileActions", () => ({
  saveProfileAction: vi.fn(async () => ({ error: null })),
}));

// Arm Save immediately so submit tests do not wait on the real delay.
vi.mock("@/constants/animations", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/constants/animations")>();
  return { ...actual, SAVE_ARM_DELAY_MS: 0 };
});

vi.mock("./steps/StepWelcome", () => ({
  StepWelcome: () => <div data-testid="mock-step-welcome" />,
}));
vi.mock("./steps/StepIdentity", () => ({
  StepIdentity: () => <div data-testid="mock-step-identity" />,
}));
vi.mock("./steps/StepMorphology", () => ({
  StepMorphology: () => <div data-testid="mock-step-morphology" />,
}));
vi.mock("./steps/StepColorimetry", () => ({
  StepColorimetry: () => <div data-testid="mock-step-colorimetry" />,
}));
vi.mock("./steps/StepFineTuning", () => ({
  StepFineTuning: () => <div data-testid="mock-step-finetuning" />,
}));
vi.mock("./steps/OnboardingSuccess", () => ({
  OnboardingSuccess: ({ onDone }: { onDone: () => void }) => (
    <button type="button" onClick={onDone}>
      successCta
    </button>
  ),
}));

import { saveProfileAction } from "@/actions/profileActions";
import { TOTAL_STEPS } from "@/constants/ui-config";
import { OnboardingWizard } from "./OnboardingWizard";

const saveMock = vi.mocked(saveProfileAction);

function fillStoreForSubmit() {
  const store = useOnboardingStore.getState();
  store.setDisplayName("Ada Lovelace");
  store.setSection("women");
  store.setStyle("minimalist");
  store.setFit("regular");
  store.setSkinTone("medium");
  store.setEyeColor("brown");
  store.setJewelry("gold");
}

async function goToFinalStep(user: ReturnType<typeof userEvent.setup>) {
  fillStoreForSubmit();
  render(<OnboardingWizard />);
  for (let step = 1; step < TOTAL_STEPS; step += 1) {
    await user.click(screen.getByRole("button", { name: "continue" }));
  }
  expect(screen.getByTestId("mock-step-finetuning")).toBeInTheDocument();
  // Wait until Save is armed and enabled.
  await waitFor(() => {
    expect(screen.getByRole("button", { name: "save" })).toBeEnabled();
  });
}

beforeEach(() => {
  useOnboardingStore.getState().reset();
  saveMock.mockReset();
  saveMock.mockResolvedValue({ error: null });
  pushMock.mockReset();
});

describe("OnboardingWizard", () => {
  it("starts on step 1 with Continue disabled until the name is valid", () => {
    render(<OnboardingWizard />);
    expect(screen.getByTestId("mock-step-welcome")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "continue" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "back" })).not.toBeInTheDocument();
  });

  it("advances forward and back through steps", async () => {
    const user = userEvent.setup();
    useOnboardingStore.getState().setDisplayName("Ada");
    render(<OnboardingWizard />);
    await user.click(screen.getByRole("button", { name: "continue" }));
    expect(screen.getByTestId("mock-step-identity")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "back" }));
    expect(screen.getByTestId("mock-step-welcome")).toBeInTheDocument();
  });

  it("blocks Continue on step 2 until section and style are set", async () => {
    const user = userEvent.setup();
    useOnboardingStore.getState().setDisplayName("Ada");
    render(<OnboardingWizard />);
    await user.click(screen.getByRole("button", { name: "continue" }));
    expect(screen.getByRole("button", { name: "continue" })).toBeDisabled();
    act(() => {
      useOnboardingStore.getState().setSection("men");
    });
    expect(screen.getByRole("button", { name: "continue" })).toBeDisabled();
    act(() => {
      useOnboardingStore.getState().setStyle("classic");
    });
    expect(screen.getByRole("button", { name: "continue" })).toBeEnabled();
  });

  it("submits on the final step and shows the success screen", async () => {
    const user = userEvent.setup();
    await goToFinalStep(user);
    await user.click(screen.getByRole("button", { name: "save" }));
    await waitFor(() => {
      expect(saveMock).toHaveBeenCalledTimes(1);
    });
    expect(
      await screen.findByRole("button", { name: "successCta" }),
    ).toBeInTheDocument();
  });

  it("navigates to the generator from the success screen", async () => {
    const user = userEvent.setup();
    await goToFinalStep(user);
    await user.click(screen.getByRole("button", { name: "save" }));
    const cta = await screen.findByRole("button", { name: "successCta" });
    await user.click(cta);
    expect(pushMock).toHaveBeenCalledWith("/generator");
  });

  it("shows a server error without leaving the final step", async () => {
    const user = userEvent.setup();
    saveMock.mockResolvedValue({ error: "Could not save" });
    await goToFinalStep(user);
    await user.click(screen.getByRole("button", { name: "save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not save");
    expect(screen.getByTestId("mock-step-finetuning")).toBeInTheDocument();
  });

  it("prefills the store from an initial profile", () => {
    render(
      <OnboardingWizard
        initialProfile={{
          userId: "test-user-id",
          hairColor: "brown",
          createdAt: new Date().toISOString(),
          skinTone: "medium",
          eyeColor: "brown",
          chestMeasurementCm: 92,
          waistMeasurementCm: 76,
          hipMeasurementCm: 98,
          colorimetry: "summer",
          morphology: "rectangle",
          preferredFit: "regular",
          lifestyle: "casual_daily",
          extraPreferences: {
            displayName: "Ada",
            section: "women",
            style: "minimalist",
            thermostat: 3,
            forbiddenColors: [],
          },
        }}
      />,
    );
    expect(useOnboardingStore.getState().displayName).toBe("Ada");
    expect(useOnboardingStore.getState().skinTone).toBe("medium");
  });
});
