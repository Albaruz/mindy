import { create } from "zustand";
import type { Category, Garment, GarmentStyle } from "@/types/garment";
import {
  MAX_DISCARD_COUNT,
  OUTFIT_DAY_VALUES,
} from "@/constants/generator";

export interface Slot {
  garment: Garment | null;
  isLocked: boolean;
}

export type GeneratorView =
  | "zero"
  | "auto-select"
  | "loading"
  | "showcase"
  | "manual";

// Single source of truth: auto-mode look styles are the garment closed
// style vocabulary (see GARMENT_STYLE_VALUES), so the StyleStep offers
// exactly the tags the closet form assigns.
export type LookStyle = GarmentStyle;
export type OutfitDay = (typeof OUTFIT_DAY_VALUES)[number];

// Auto-mode rejection budget: at most 4 left-swipes per generation
// before the limit empty state takes over.
// Re-exported from centralized constants for backward compatibility.
export { MAX_DISCARD_COUNT };

export const LOOK_STYLE_LABELS: Record<LookStyle, string> = {
  casual: "Casual",
  formal: "Formal",
  sport: "Sport",
  elegant: "Elegant",
  streetwear: "Streetwear",
  party: "Party",
};

export interface AiLook {
  id: string;
  garments: Garment[];
  reason: string | null;
  suitability: number;
}

export interface GeneratorState {
  slots: Record<Category, Slot>;
  dismissedIds: string[];
  // Full-screen celebration payload: the just-worn look. Set on
  // successful wear from either mode, cleared when dismissed.
  celebrationGarments: Garment[] | null;
  // Rejections spent on the current generation (0-4). Resets with every
  // new generation or flow reset.
  discardCount: number;
  // Ordered AI suggestions per category from the last manual "Combinar":
  // garment IDs (best option first) used to rank unlocked carousels.
  combineSuggestions: Partial<Record<Category, string[]>>;
  // View state machine for the generator flow.
  view: GeneratorView;
  lookStyle: LookStyle;
  outfitDay: OutfitDay;
  aiLooks: AiLook[];
  streamedLooks: AiLook[];
  activeLookIndex: number;
  // Style rejected by strict server filtering (422). Drives the dedicated
  // empty state on the showcase screen instead of a generic error.
  insufficientStyle: LookStyle | null;
  setView: (view: GeneratorView) => void;
  showCelebration: (garments: Garment[]) => void;
  dismissCelebration: () => void;
  setLookStyle: (style: LookStyle) => void;
  setOutfitDay: (day: OutfitDay) => void;
  startManual: () => void;
  startAutoSelect: () => void;
  startLoading: () => void;
  setStreamedLooks: (looks: AiLook[]) => void;
  setAiLooks: (looks: AiLook[]) => void;
  failStrictStyleFilter: (style: LookStyle) => void;
  discardActiveLook: () => void;
  resetFlow: () => void;
  toggleLock: (category: Category) => void;
  // Wizard pinning: lock a category around an explicit garment (the
  // focused slide). Falls back to the current slot garment when omitted.
  toggleLockGarment: (category: Category, garment?: Garment) => void;
  // Unlock every category without clearing the canvas garments.
  unlockAll: () => void;
  // Snapshot of pinned garment IDs per category (null when unpinned).
  getLockedGarmentIds: () => Record<Category, string | null>;
  // IDs suggested by the last local-fallback generation. Decisions on
  // these garments never train the AI (amnesia): wearing still records
  // history + laundry, but feedback writes are skipped silently.
  fallbackGarmentIds: string[];
  setFallbackGarmentIds: (ids: string[]) => void;
  setCombineSuggestions: (
    suggestions: Partial<Record<Category, string[]>>,
  ) => void;
  setGarment: (category: Category, garment: Garment) => void;
  setFullLook: (look: Partial<Record<Category, Garment>>) => void;
  dismissGarment: (category: Category, replacement: Garment) => void;
  resetCanvas: () => void;
  getLockedGarments: () => Garment[];
}

const CATEGORIES: readonly Category[] = [
  "top",
  "bottom",
  "footwear",
  "outerwear",
];

function createInitialSlots(): Record<Category, Slot> {
  return {
    top: { garment: null, isLocked: false },
    bottom: { garment: null, isLocked: false },
    footwear: { garment: null, isLocked: false },
    outerwear: { garment: null, isLocked: false },
  };
}

export const useGeneratorStore = create<GeneratorState>()((set, get) => ({
  slots: createInitialSlots(),
  dismissedIds: [],
  discardCount: 0,
  celebrationGarments: null,
  fallbackGarmentIds: [],
  combineSuggestions: {},
  view: "zero",
  lookStyle: "casual",
  outfitDay: "today",
  aiLooks: [],
  streamedLooks: [],
  activeLookIndex: 0,
  insufficientStyle: null,

  setView: (view) => {
    set({ view });
  },

  showCelebration: (garments) => {
    set({ celebrationGarments: garments });
  },

  dismissCelebration: () => {
    set({ celebrationGarments: null });
  },

  setLookStyle: (style) => {
    set({ lookStyle: style, insufficientStyle: null });
  },

  setOutfitDay: (outfitDay) => {
    set({ outfitDay });
  },

  startManual: () => {
    set({ view: "manual", insufficientStyle: null });
  },

  startAutoSelect: () => {
    set({ view: "auto-select", insufficientStyle: null });
  },

  startLoading: () => {
    set({ view: "loading", insufficientStyle: null, streamedLooks: [] });
  },

  setStreamedLooks: (looks) => {
    set({ streamedLooks: looks });
  },

  setAiLooks: (looks) => {
    set({
      aiLooks: looks,
      streamedLooks: [],
      activeLookIndex: 0,
      discardCount: 0,
      insufficientStyle: null,
      view: "showcase",
    });
  },

  // Strict-filter rejection: land on the showcase so the skeletons stop
  // and the dedicated empty state explains the shortage.
  failStrictStyleFilter: (style) => {
    set({ insufficientStyle: style, view: "showcase" });
  },

  // Drop the visible look and advance, spending one rejection from the
  // budget of 4. At the limit the showcase shows the limit empty state
  // instead of advancing. The showcase derives the exhausted state when
  // every option has been discarded before the limit.
  discardActiveLook: () => {
    const { aiLooks, activeLookIndex, discardCount } = get();
    if (discardCount >= MAX_DISCARD_COUNT) {
      return;
    }
    set({
      aiLooks: aiLooks.filter((_, index) => index !== activeLookIndex),
      activeLookIndex: 0,
      discardCount: discardCount + 1,
    });
  },

  resetFlow: () => {
    set({
      view: "zero",
      outfitDay: "today",
      aiLooks: [],
      streamedLooks: [],
      activeLookIndex: 0,
      discardCount: 0,
      celebrationGarments: null,
      fallbackGarmentIds: [],
      insufficientStyle: null,
      slots: createInitialSlots(),
      dismissedIds: [],
      combineSuggestions: {},
    });
  },

  toggleLock: (category) => {
    get().toggleLockGarment(category);
  },

  // Wizard pinning: toggling a category pins the focused garment so the
  // lock always refers to the centered slide, even if the slot has not
  // synced yet. Unlocking keeps the garment in place.
  toggleLockGarment: (category, garment) => {
    set((state) => {
      const slot = state.slots[category];
      if (slot.isLocked) {
        return {
          slots: {
            ...state.slots,
            [category]: { ...slot, isLocked: false },
          },
        };
      }
      return {
        slots: {
          ...state.slots,
          [category]: { garment: garment ?? slot.garment, isLocked: true },
        },
      };
    });
  },

  // Unlock every category without clearing the canvas: the user keeps
  // their arrangement and can re-pin or combine again. Stale AI
  // suggestions are dropped so carousels return to closet order.
  unlockAll: () => {
    set((state) => {
      const slots = { ...state.slots };
      for (const category of CATEGORIES) {
        slots[category] = { ...slots[category], isLocked: false };
      }
      return { slots, combineSuggestions: {} };
    });
  },

  getLockedGarmentIds: () => {
    const { slots } = get();
    return {
      top: slots.top.isLocked ? (slots.top.garment?.garmentId ?? null) : null,
      bottom:
        slots.bottom.isLocked
          ? (slots.bottom.garment?.garmentId ?? null)
          : null,
      footwear:
        slots.footwear.isLocked
          ? (slots.footwear.garment?.garmentId ?? null)
          : null,
      outerwear:
        slots.outerwear.isLocked
          ? (slots.outerwear.garment?.garmentId ?? null)
          : null,
    };
  },

  setCombineSuggestions: (suggestions) => {
    set({ combineSuggestions: suggestions });
  },

  setGarment: (category, garment) => {
    set((state) => ({
      slots: {
        ...state.slots,
        [category]: { ...state.slots[category], garment },
      },
    }));
  },

  setFullLook: (look) => {
    set((state) => {
      const slots = { ...state.slots };
      for (const category of CATEGORIES) {
        const garment = look[category];
        if (garment !== undefined && !slots[category].isLocked) {
          slots[category] = { ...slots[category], garment };
        }
      }
      return { slots };
    });
  },

  dismissGarment: (category, replacement) => {
    set((state) => {
      const dismissed = state.slots[category].garment;
      return {
        slots: {
          ...state.slots,
          [category]: { ...state.slots[category], garment: replacement },
        },
        dismissedIds:
          dismissed && !state.dismissedIds.includes(dismissed.garmentId)
            ? [...state.dismissedIds, dismissed.garmentId]
            : state.dismissedIds,
      };
    });
  },

  resetCanvas: () => {
    set({
      slots: createInitialSlots(),
      dismissedIds: [],
      streamedLooks: [],
      fallbackGarmentIds: [],
      combineSuggestions: {},
    });
  },

  getLockedGarments: () => {
    const { slots } = get();
    return CATEGORIES.map((category) => slots[category]).filter(
      (slot): slot is { garment: Garment; isLocked: true } =>
        slot.isLocked && slot.garment !== null,
    ).map((slot) => slot.garment);
  },

  setFallbackGarmentIds: (ids) => {
    set({ fallbackGarmentIds: ids });
  },
}));
