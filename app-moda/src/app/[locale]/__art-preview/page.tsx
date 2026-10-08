// TEMPORARY visual QA route for the onboarding art. Not linked anywhere;
// delete before merging.
import { OnboardingArt } from "@/features/onboarding/OnboardingArt";

const STEPS = [1, 2, 3, 4, 5] as const;

export default function ArtPreviewPage() {
  return (
    <main
      style={{
        display: "grid",
        gap: "1rem",
        maxWidth: "28rem",
        margin: "0 auto",
        padding: "1rem",
        background: "#f9f6f0",
      }}
    >
      {STEPS.map((step) => (
        <OnboardingArt
          key={step}
          step={step}
          label={`Onboarding art step ${step}`}
        />
      ))}
    </main>
  );
}
