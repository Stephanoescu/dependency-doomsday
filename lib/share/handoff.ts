import type { AnalysisResult } from "@/lib/analysis/types";
import type { GitHubRef, ParseSuccess } from "@/lib/input/types";

/**
 * In-memory handoff between the form and the share page it navigates to, so a
 * fresh result shows instantly instead of being computed twice. Client-only
 * module state: it survives client-side navigation, not reloads.
 */
export interface ForecastHandoff {
  parsed: ParseSuccess & { ref?: GitHubRef };
  analysis: AnalysisResult;
}

let pending: { path: string; data: ForecastHandoff } | null = null;

export function stashForecast(path: string, data: ForecastHandoff): void {
  pending = { path, data };
}

/** The stashed forecast if it was made for this share path. */
export function peekForecast(path: string): ForecastHandoff | undefined {
  return pending?.path === path ? pending.data : undefined;
}

/** What was in the form, restored when coming back to it. */
let lastInput = { text: "", includeDev: false };

export function rememberInput(text: string, includeDev: boolean): void {
  lastInput = { text, includeDev };
}

export function recallInput(): { text: string; includeDev: boolean } {
  return lastInput;
}
