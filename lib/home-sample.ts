import type { RiskLevel } from "@/lib/risk";
import sample from "./home-sample.json";

/** A real forecast, frozen, shown on the home page as a preview. Refresh with `npm run sample:capture`. */
export interface HomeSample {
  label: string;
  path: string;
  generatedAt: string;
  score: number;
  minutesToMidnight: number;
  level: RiskLevel;
  /** Third-person headline with **emphasis**. */
  headline: string;
  sentences: string[];
  tiles: { name: string; risk: number | null; level: RiskLevel | null; weight: number; critical: boolean }[];
}

export const homeSample = sample as HomeSample;
