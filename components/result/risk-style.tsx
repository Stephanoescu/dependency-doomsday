import type { SVGProps } from "react";
import { BangIcon, CheckIcon, CrossIcon, QuestionIcon } from "@/components/icons";
import type { RiskLevel } from "@/lib/risk";

export const LEVEL_TEXT: Record<RiskLevel, string> = {
  low: "text-risk-low",
  mid: "text-risk-mid",
  high: "text-risk-high",
};

export const LEVEL_BORDER: Record<RiskLevel, string> = {
  low: "border-risk-low",
  mid: "border-risk-mid",
  high: "border-risk-high",
};

export const LEVEL_FILL: Record<RiskLevel, string> = {
  low: "bg-risk-low",
  mid: "bg-risk-mid",
  high: "bg-risk-high",
};

export const LEVEL_STROKE: Record<RiskLevel, string> = {
  low: "var(--color-risk-low)",
  mid: "var(--color-risk-mid)",
  high: "var(--color-risk-high)",
};

/** A shape per level so risk never relies on color alone: ✓ low, ! watch, ✕ high, ? no data. */
export function LevelGlyph({ level, ...props }: { level: RiskLevel | null } & SVGProps<SVGSVGElement>) {
  if (level === "low") return <CheckIcon strokeWidth={3} {...props} />;
  if (level === "mid") return <BangIcon strokeWidth={3} {...props} />;
  if (level === "high") return <CrossIcon strokeWidth={3} {...props} />;
  return <QuestionIcon strokeWidth={2.5} {...props} />;
}
