// Unit tests for animation and timing constants.
import { describe, expect, it } from "vitest";
import {
  CARD_ENTER_SPRING,
  CELEBRATION_BURST_MS,
  DRAG_CONSTRAINTS,
  DRAG_ELASTIC,
  GREETING_MIN_DISPLAY_MS,
  INDICATOR_SPRING,
  NOTIFICATION_DURATION_MS,
  NOTIFICATION_EXIT_MS,
  ONBOARDING_ART_SPRING,
  REDIRECT_DELAY_MS,
  SAVE_ARM_DELAY_MS,
  SESSION_RETRY_DELAY_MS,
  SUCCESS_AUTO_ADVANCE_MS,
  SWIPE_COMMIT_PX,
  SWIPE_FADE_START_PX,
} from "./animations";

describe("animations constants", () => {
  it("exposes expected timing values", () => {
    expect(CELEBRATION_BURST_MS).toBe(1400);
    expect(NOTIFICATION_DURATION_MS).toBe(3500);
    expect(NOTIFICATION_EXIT_MS).toBe(300);
    expect(SWIPE_COMMIT_PX).toBe(120);
    expect(SWIPE_FADE_START_PX).toBe(40);
    expect(SAVE_ARM_DELAY_MS).toBe(500);
    expect(SUCCESS_AUTO_ADVANCE_MS).toBe(6000);
    expect(GREETING_MIN_DISPLAY_MS).toBe(3000);
    expect(REDIRECT_DELAY_MS).toBe(1500);
    expect(SESSION_RETRY_DELAY_MS).toBe(800);
  });

  it("keeps timing values positive", () => {
    for (const value of [
      CELEBRATION_BURST_MS,
      NOTIFICATION_DURATION_MS,
      NOTIFICATION_EXIT_MS,
      SWIPE_COMMIT_PX,
      SWIPE_FADE_START_PX,
      SAVE_ARM_DELAY_MS,
      SUCCESS_AUTO_ADVANCE_MS,
      GREETING_MIN_DISPLAY_MS,
      REDIRECT_DELAY_MS,
      SESSION_RETRY_DELAY_MS,
    ]) {
      expect(value).toBeGreaterThan(0);
    }
  });

  it("exposes spring configs with spring type", () => {
    for (const spring of [
      INDICATOR_SPRING,
      CARD_ENTER_SPRING,
      ONBOARDING_ART_SPRING,
    ]) {
      expect(spring.type).toBe("spring");
      expect(spring.stiffness).toBeGreaterThan(0);
      expect(spring.damping).toBeGreaterThan(0);
    }
  });

  it("exposes drag constraints locked on x axis", () => {
    expect(DRAG_ELASTIC).toBeGreaterThan(0);
    expect(DRAG_CONSTRAINTS).toEqual({ left: 0, right: 0 });
  });
});
