// Animation & Timing — Logic/Physics Values
// CSS durations (transition, animation) live in src/styles/core/_tokens.scss as --duration-* custom properties.
// This file only contains values needed for JS logic: physics thresholds, delays, Framer Motion configs.

// Celebration burst visibility (action bar heartbeat + closet laundry).
export const CELEBRATION_BURST_MS = 1400;

// Toast visible lifetime.
export const NOTIFICATION_DURATION_MS = 3500;

// Toast exit transition length. Kept in sync with CSS --duration-normal.
export const NOTIFICATION_EXIT_MS = 300;

/** Time a completed upload stays visible while its row exits the queue. */
export const UPLOAD_COMPLETED_EXIT_MS = 650;

// Showcase lateral commitment threshold: predictable on mobile, never twitchy.
export const SWIPE_COMMIT_PX = 120;

// Showcase overlay fade ramp start (accept/reject icons).
export const SWIPE_FADE_START_PX = 40;

// Delay before the final Save button becomes clickable after reaching the
// last onboarding step. Next (step 4) and Save (step 5) render at the same
// spot, so a mobile tap held while the step swaps would otherwise retarget
// onto Save and submit before the user ever sees step 5.
export const SAVE_ARM_DELAY_MS = 500;

// Onboarding success auto-advance (hands-free completion).
export const SUCCESS_AUTO_ADVANCE_MS = 6000;

// Home greeting minimum display: the neutral hello stays on screen at
// least this long before the forecast copy takes over, so a fast weather
// fetch never yanks the text away mid-read.
export const GREETING_MIN_DISPLAY_MS = 3000;

// Post-password-reset redirect delay.
export const REDIRECT_DELAY_MS = 1500;

// Recovery session confirm retry delay.
export const SESSION_RETRY_DELAY_MS = 800;

// Framer Motion spring configs (physics, not durations)
export const INDICATOR_SPRING = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
};

export const CARD_ENTER_SPRING = {
  type: "spring" as const,
  stiffness: 260,
  damping: 24,
};

export const ONBOARDING_ART_SPRING = {
  type: "spring" as const,
  stiffness: 260,
  damping: 24,
};

export const DRAG_ELASTIC = 0.6;
export const DRAG_CONSTRAINTS = { left: 0, right: 0 };

/** Motion, geometry, and palette for the post-wear look celebration. */
export const OUTFIT_CELEBRATION = {
  pieceTiltsDegrees: [-7, 5, -4, 6, -5],
  pieceEnterOffsetY: -140,
  pieceSpringStiffness: 260,
  pieceSpringDamping: 19,
  titleEnterOffset: "110%",
  titleRestOffset: "0%",
  closeButtonEnterOffsetY: 24,
  hiddenOpacity: 0,
  visibleOpacity: 1,
  originPx: 0,
  radiansPerDegree: Math.PI / 180,
  noMotionSeconds: 0,
  confettiColors: ["#c87966", "#c87966", "#4a3f39", "#e0a58f", "#c87966"],
  confettiCount: 16,
  confettiAngleStepDegrees: 360,
  confettiAngleJitterStepDegrees: 9,
  confettiAngleJitterCycle: 3,
  confettiDistanceBasePx: 90,
  confettiDistanceStepPx: 38,
  confettiDistanceCycle: 4,
  confettiSizeBasePx: 6,
  confettiSizeStepPx: 3,
  confettiSizeCycle: 3,
  confettiDelayBaseSeconds: 0.55,
  confettiDelayStepSeconds: 0.06,
  confettiDelayCycle: 5,
  confettiStartScale: 1,
  confettiEndScale: 0.4,
  confettiVerticalOffsetPx: 30,
  fadeInSeconds: 0.25,
  fadeOutSeconds: 0.2,
  titleRiseSeconds: 0.5,
  titleDelaySeconds: 0.15,
  pieceStaggerSeconds: 0.12,
  pieceDelayChildrenSeconds: 0.4,
  confettiDurationSeconds: 1.1,
  closeButtonDurationSeconds: 0.4,
  closeButtonDelaySeconds: 0.9,
} as const;
