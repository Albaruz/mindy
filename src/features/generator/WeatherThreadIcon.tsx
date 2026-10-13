"use client";

import { MotionConfig, motion, useReducedMotion } from "framer-motion";
import type { Colorimetry } from "@/types/user";
import { isRainExpected, type WeatherInfo } from "./useWeatherQuery";
import styles from "./WeatherThreadIcon.module.scss";

// Animated single-thread weather icons echoing the Mindy logo metaphor.
// The ink stays Brown Ash (the logo thread); the accent (tip, rain, rays)
// tints per the user's colorimetry season.
export type ThreadWeatherKind = "umbrella" | "cloud" | "snow" | "sun";

export const SEASON_ACCENTS: Record<Colorimetry, string> = {
  spring: "#8fa36b",
  summer: "#7fa8b8",
  autumn: "#c87966",
  winter: "#6b7fa3",
};

const DEFAULT_ACCENT = "#c87966";
const THREAD = "#4A3F39";

export function seasonAccent(colorimetry: Colorimetry | null | undefined): string {
  if (colorimetry === null || colorimetry === undefined) {
    return DEFAULT_ACCENT;
  }
  return SEASON_ACCENTS[colorimetry] ?? DEFAULT_ACCENT;
}

// Worst-expected condition collapses to four thread states: umbrella
// (rain now or rain likely), snowflake, sun, or cloud for the rest.
export function resolveThreadKind(weather: WeatherInfo): ThreadWeatherKind {
  const condition = weather.dayCondition ?? weather.condition;
  if (condition === "Snow") {
    return "snow";
  }
  if (condition === "Clear") {
    return "sun";
  }
  if (
    condition === "Rain" ||
    condition === "Drizzle" ||
    condition === "Thunderstorm" ||
    isRainExpected(weather.rainProbability)
  ) {
    return "umbrella";
  }
  return "cloud";
}

function DrawnPath({ d, accent }: { d: string; accent: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.path
      d={d}
      fill="none"
      stroke={accent}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: reduce ? 1 : 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 1.4, ease: "easeInOut" }}
    />
  );
}

function ThreadOutline({ d }: { d: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.path
      d={d}
      fill="none"
      stroke={THREAD}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: reduce ? 1 : 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 1.4, ease: "easeInOut" }}
    />
  );
}

function UmbrellaLoops({ accent }: { accent: string }) {
  return (
    <motion.g
      stroke={accent}
      strokeWidth={3}
      strokeLinecap="round"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2 }}
    >
      {[30, 48, 66].map((x, index) => (
        <motion.line
          key={x}
          x1={x}
          y1={70}
          x2={x}
          y2={78}
          initial={{ y: -4, opacity: 0 }}
          animate={{ y: [0, 6, 0], opacity: [0, 1, 0] }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            delay: index * 0.35,
            ease: "easeInOut",
          }}
        />
      ))}
    </motion.g>
  );
}

function SunRays({ accent }: { accent: string }) {
  const reduce = useReducedMotion();
  // Sun center is at (48, 28) with radius 14
  // Rays should extend from the circle edge outward with a gap
  const centerX = 48;
  const centerY = 28;
  const radius = 14;
  const gap = 4; // gap between circle edge and ray start
  const rayLength = 8; // length of ray extending outward
  const rays = Array.from({ length: 8 }, (_, index) => {
    const angle = (index * Math.PI) / 4;
    const inner = radius + gap; // start after the gap
    const outer = radius + gap + rayLength; // extend outward
    const x1 = centerX + inner * Math.cos(angle);
    const y1 = centerY + inner * Math.sin(angle);
    const x2 = centerX + outer * Math.cos(angle);
    const y2 = centerY + outer * Math.sin(angle);
    return { x1, y1, x2, y2 };
  });
  return (
    <motion.g
      stroke={accent}
      strokeWidth={3}
      strokeLinecap="round"
      style={{ originX: `${centerX}px`, originY: `${centerY}px` }}
      initial={{ opacity: 0, rotate: reduce ? 0 : -30 }}
      animate={{ opacity: 1, rotate: 0 }}
      transition={{ delay: 1, duration: 0.8 }}
    >
      {rays.map((ray, index) => (
        <motion.line
          key={index}
          x1={ray.x1}
          y1={ray.y1}
          x2={ray.x2}
          y2={ray.y2}
          initial={{ pathLength: reduce ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 1 + index * 0.08, duration: 0.4 }}
        />
      ))}
      {!reduce ? (
        <animateTransform
          attributeName="transform"
          type="rotate"
          from={`0 ${centerX} ${centerY}`}
          to={`360 ${centerX} ${centerY}`}
          dur="36s"
          repeatCount="indefinite"
        />
      ) : null}
    </motion.g>
  );
}

export function WeatherThreadIcon({
  kind,
  accent,
}: {
  kind: ThreadWeatherKind;
  accent: string;
}) {
  const reduce = useReducedMotion();
  return (
    <MotionConfig reducedMotion="user">
      <svg
        viewBox="0 0 96 96"
        role="presentation"
        aria-hidden="true"
        className={styles["weather-thread-icon"]}
      >
        {kind === "umbrella" ? (
          <>
            {/* Canopy scallops + shaft + J hook in one stroke. */}
            <ThreadOutline d="M14 52 C14 34 30 24 48 24 C66 24 82 34 82 52 C76 48 70 48 64 52 C58 48 52 48 48 52 C44 48 38 48 32 52 C26 48 20 48 14 52 M48 52 L48 74 C48 80 44 82 40 80 C36 78 36 72 40 70" />
            <DrawnPath d="M48 14 L48 20" accent={accent} />
            <UmbrellaLoops accent={accent} />
          </>
        ) : null}
        {kind === "cloud" ? (
          <motion.g
            initial={reduce ? undefined : { x: -3 }}
            animate={{ x: [-3, 3, -3] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Single looping cloud outline. */}
            <ThreadOutline d="M24 68 C14 68 10 58 16 51 C20 45 28 44 32 47 C35 37 44 32 53 34 C58 27 69 27 74 34 C83 35 87 44 83 51 C89 55 86 66 78 68 Z" />
            <DrawnPath d="M34 76 L62 76" accent={accent} />
          </motion.g>
        ) : null}
        {kind === "snow" ? (
          <motion.g
            style={{ originX: "48px", originY: "48px" }}
            initial={reduce ? undefined : { rotate: 0 }}
            animate={reduce ? undefined : { rotate: 360 }}
            transition={
              reduce
                ? undefined
                : { duration: 40, repeat: Infinity, ease: "linear" }
            }
          >
            {/* Six-spoke flake threaded through the center. */}
            <ThreadOutline d="M48 20 L48 76 M23 34 L73 62 M73 34 L23 62 M48 20 L42 28 M48 20 L54 28 M48 76 L42 68 M48 76 L54 68" />
            <DrawnPath d="M40 48 L56 48" accent={accent} />
          </motion.g>
        ) : null}
        {kind === "sun" ? (
          <>
            <ThreadOutline d="M48 28 m-14 0 a14 14 0 1 0 28 0 a14 14 0 1 0 -28 0" />
            <SunRays accent={accent} />
          </>
        ) : null}
      </svg>
    </MotionConfig>
  );
}
