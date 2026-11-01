"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/**
 * The reveal sequence, in ms from the start:
 * clock sweeps → score counts up → sentences appear → treemap cascades.
 */
export const REVEAL = {
  clockEnd: 1_600,
  scoreStart: 1_600,
  scoreEnd: 2_600,
  sentencesStart: 2_600,
  sentenceStagger: 220,
  treemapStart: 3_400,
} as const;

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(callback: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}

/**
 * Milliseconds since the reveal started, driven by requestAnimationFrame
 * until `end`, then frozen. Infinity when motion is reduced (final state at
 * once). Remount the caller (change its key) to replay.
 */
export function useRevealClock(reduced: boolean, end: number = REVEAL.treemapStart): number {
  const [elapsed, setElapsed] = useState(reduced ? Infinity : 0);

  useEffect(() => {
    if (reduced) {
      const id = requestAnimationFrame(() => setElapsed(Infinity));
      return () => cancelAnimationFrame(id);
    }
    let id = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      start ??= now;
      const e = now - start;
      if (e >= end) return setElapsed(Infinity);
      setElapsed(e);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [reduced, end]);

  return elapsed;
}

/** 0 → 1 progress of a segment [from, to] at `elapsed`. */
export function progress(elapsed: number, from: number, to: number): number {
  if (elapsed <= from) return 0;
  if (elapsed >= to) return 1;
  return (elapsed - from) / (to - from);
}

export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
