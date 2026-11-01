import type { Dependency } from "@/lib/input/types";
import type { AnalysisEvent, AnalysisResult } from "./types";

export type AnalysisOutcome =
  | { ok: true; result: AnalysisResult }
  | { ok: false; error: "analysis-failed" | "network" };

/**
 * Browser side of POST /api/analyze. Sends package names only and reports
 * progress as the NDJSON stream comes in.
 */
export async function runAnalysis(
  packages: Dependency[],
  {
    signal,
    onProgress,
  }: { signal?: AbortSignal; onProgress?: (done: number, total: number, name?: string) => void } = {},
): Promise<AnalysisOutcome> {
  let res: Response;
  try {
    res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        packages: packages.map(({ name, field, alias }) => ({ name, field, ...(alias && { alias }) })),
      }),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    return { ok: false, error: "network" };
  }
  if (!res.body) return { ok: false, error: "analysis-failed" };

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (value) buffer += value;
      let newline: number;
      while ((newline = buffer.indexOf("\n")) !== -1) {
        const raw = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (!raw) continue;
        const event = JSON.parse(raw) as AnalysisEvent;
        if (event.type === "start") onProgress?.(0, event.total);
        else if (event.type === "progress") onProgress?.(event.done, event.total, event.name);
        else if (event.type === "result") return { ok: true, result: event.result };
        else if (event.type === "error") return { ok: false, error: "analysis-failed" };
      }
      if (done) break;
    }
  } catch (error) {
    if (signal?.aborted) throw error;
    return { ok: false, error: "network" };
  }
  return { ok: false, error: "analysis-failed" };
}
