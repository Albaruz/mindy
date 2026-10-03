"use client";

import { motion } from "framer-motion";

// Single-thread illustrations echoing the Mindy logo metaphor.
// Each step draws one continuous, recognizable stroke via pathLength
// (the SVG equivalent of stroke-dasharray animation); the terracotta
// dot is the thread tip.
interface ThreadIllustrationProps {
  step: 1 | 2 | 3 | 4 | 5;
  label: string;
  className?: string;
}

const THREAD = "#4A3F39";
const SPARK = "#C87966";

function ThreadPath({ d }: { d: string }) {
  return (
    <motion.path
      d={d}
      fill="none"
      stroke={THREAD}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 1.6, ease: "easeInOut" }}
    />
  );
}

function ThreadTip({ cx, cy }: { cx: number; cy: number }) {
  return (
    <motion.circle
      cx={cx}
      cy={cy}
      r={5}
      fill={SPARK}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1.4, type: "spring", stiffness: 300, damping: 18 }}
    />
  );
}

export function ThreadIllustration({
  step,
  label,
  className,
}: ThreadIllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 120"
      role="img"
      aria-label={label}
      className={className}
    >
      {step === 1 ? (
        <>
          {/* Clothes hanger: hook, apex, both slopes, base bar. */}
          <ThreadPath d="M100 12 C100 20 93 20 92 26 C91 32 97 34 100 32 L100 42 L38 90 C34 94 37 96 42 96 L158 96 C163 96 166 94 162 90 L100 42" />
          <ThreadTip cx={100} cy={12} />
        </>
      ) : null}
      {step === 2 ? (
        <>
          {/* T-shirt (sleeves, neckline, body) threaded into trousers. */}
          <ThreadPath d="M55 40 L73 32 C79 38 91 38 97 32 L115 40 L107 56 L97 51 L97 95 L73 95 L73 51 L63 56 L55 40 C70 62 95 78 125 68 L165 68 L161 108 L149 108 L147 80 L143 80 L141 108 L129 108" />
          <ThreadTip cx={129} cy={108} />
        </>
      ) : null}
      {step === 3 ? (
        <>
          {/* Serpentine measuring tape with tick marks. */}
          <ThreadPath d="M12 24 L80 24 L80 40 L40 40 L40 56 L120 56 L120 72 L60 72 L60 88 L150 88 M24 24 L24 32 M36 24 L36 30 M48 24 L48 32 M60 24 L60 30 M52 56 L52 64 M64 56 L64 62 M76 56 L76 64 M88 56 L88 62 M100 56 L100 64 M72 72 L72 80 M84 72 L84 78 M96 72 L96 80 M108 72 L108 78" />
          <ThreadTip cx={150} cy={88} />
        </>
      ) : null}
      {step === 4 ? (
        <>
          {/* Crescent moon threaded into a rayed sun. */}
          <ThreadPath d="M112 40 C132 42 144 56 144 72 C144 88 132 100 112 100 C120 88 124 80 124 70 C124 60 120 50 112 40 M118 70 C104 68 94 64 84 60 M62 38 m-22 0 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0 M84 60 L92 60 M78 44 L84 38 M78 76 L84 82 M62 82 L62 90 M46 76 L40 82 M40 60 L32 60 M46 44 L40 38 M62 38 L62 30" />
          <ThreadTip cx={62} cy={30} />
        </>
      ) : null}
      {step === 5 ? (
        <>
          {/* Thermometer: bulb, stem and scale ticks in one stroke. */}
          <ThreadPath d="M100 106 m-14 0 a14 14 0 1 0 28 0 a14 14 0 1 0 -28 0 M107 79 L107 30 C107 22 93 22 93 30 L93 79 M80 44 L93 44 M80 58 L93 58 M80 72 L93 72" />
          <ThreadTip cx={100} cy={16} />
        </>
      ) : null}
    </svg>
  );
}
