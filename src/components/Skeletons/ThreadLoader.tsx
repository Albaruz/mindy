"use client";

import { useEffect } from "react";
import { motion, useAnimation, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import styles from "./ThreadLoader.module.scss";

interface ThreadLoaderProps {
  // Single continuous SVG path (the "thread") drawn in real time.
  path: string;
  viewBox?: string;
  strokeWidth?: number;
  // Seconds for the one-shot draw phase; the soft pulse loops after it.
  drawSeconds?: number;
  className?: string;
}

// Brand thread loader: an invisible thread draws the outline stroke by
// stroke (pathLength), then the finished trace breathes with a soft
// opacity pulse until the awaited promise resolves and the parent swaps
// in the real content. Wrap the loading branch in AnimatePresence to
// enable the fade-out handoff via `exit`.
export function ThreadLoader({
  path,
  viewBox = "0 0 64 64",
  strokeWidth = 2.5,
  drawSeconds = 1.6,
  className,
}: ThreadLoaderProps) {
  const reduceMotion = useReducedMotion();
  const controls = useAnimation();

  useEffect(() => {
    if (reduceMotion) {
      controls.set({ pathLength: 1, opacity: 1 });
      return;
    }
    let cancelled = false;
    controls.set({ pathLength: 0, opacity: 1 });
    void controls
      .start({
        pathLength: 1,
        transition: { duration: drawSeconds, ease: "easeInOut" },
      })
      .then(() => {
        if (cancelled) {
          return;
        }
        void controls.start({
          opacity: [1, 0.45, 1],
          transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
        });
      });
    return () => {
      cancelled = true;
      controls.stop();
    };
  }, [controls, drawSeconds, path, reduceMotion]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.2 } }}
      exit={{ opacity: 0, transition: { duration: 0.18 } }}
      className={cn(styles.loader, className)}
    >
      <svg
        viewBox={viewBox}
        fill="none"
        aria-hidden="true"
        className={styles.canvas}
      >
        <motion.path
          d={path}
          fill="none"
          stroke="var(--thread-color, #4a3f39)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={controls}
        />
      </svg>
    </motion.div>
  );
}
