"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AnalysisProgress } from "@/components/analysis-progress";
import { ErrorIcon } from "@/components/icons";
import { DoomsdayClock } from "@/components/result/doomsday-clock";
import { ForecastResult } from "@/components/result/forecast-result";
import { ResultNotices } from "@/components/result/result-notices";
import { runAnalysis } from "@/lib/analysis/client";
import { fmt, getMessages } from "@/lib/i18n";
import { formatGitHubRef } from "@/lib/input/github-url";
import { resolveInput } from "@/lib/input/resolve-client";
import type { ParseSuccess } from "@/lib/input/types";
import { peekForecast, rememberInput, type ForecastHandoff } from "@/lib/share/handoff";
import { listDependencies, sourceLabel, type ShareSource } from "@/lib/share/links";

type State =
  | { kind: "loading"; done: number | null; total: number; current?: string }
  | { kind: "error"; message: string }
  | { kind: "done"; data: ForecastHandoff };

/** Recomputes a shared forecast from its link (cached server-side), or shows the one just made. */
export function SharedForecast({
  source,
  path,
  initial,
}: {
  source: ShareSource;
  path: string;
  /** Rendered on the server from cache when this link was analyzed recently. */
  initial?: ForecastHandoff | null;
}) {
  const t = getMessages();
  const router = useRouter();
  const [state, setState] = useState<State>(() => {
    const ready = peekForecast(path) ?? initial;
    return ready ? { kind: "done", data: ready } : { kind: "loading", done: null, total: 0 };
  });
  const needsWork = state.kind === "loading";

  useEffect(() => {
    if (!needsWork) return;
    const controller = new AbortController();
    const { signal } = controller;

    (async () => {
      const fromList: ParseSuccess | null =
        source.kind === "list"
          ? {
              ok: true,
              projectName: source.list.projectName,
              packages: listDependencies(source.list),
              skipped: [],
              truncated: 0,
            }
          : null;
      const parsed =
        source.kind === "repo" ? await resolveInput(formatGitHubRef(source.ref), source.includeDev, signal) : fromList!;
      if (signal.aborted) return;
      if (!parsed.ok) {
        const message = fmt(t.errors[parsed.error], {
          location: parsed.location ?? "package.json",
          seconds: parsed.retryAfter ?? 60,
        });
        return setState({ kind: "error", message });
      }

      setState({ kind: "loading", done: 0, total: parsed.packages.length });
      const analysis = await runAnalysis(parsed.packages, {
        signal,
        onProgress: (done, total, name) =>
          setState((s) => (s.kind === "loading" ? { kind: "loading", done, total, current: name ?? s.current } : s)),
      });
      if (signal.aborted) return;
      if (!analysis.ok) {
        const message = fmt(t.errors[analysis.error], {
          seconds: analysis.error === "rate-limited" ? analysis.retryAfter : 0,
        });
        return setState({ kind: "error", message });
      }
      setState({ kind: "done", data: { parsed, analysis: analysis.result } });
    })().catch(() => {
      // Aborted on unmount.
    });

    return () => controller.abort();
  }, [needsWork, source, t]);

  const editInHome = (text: string) => {
    rememberInput(text, source.kind === "repo" && source.includeDev);
    router.push("/");
  };

  if (state.kind === "done") {
    return (
      <div className="pt-6 sm:pt-12">
        <ForecastResult
          analysis={state.data.analysis}
          projectName={state.data.parsed.projectName ?? sourceLabel(source)}
          share={{ source, path }}
          onNewForecast={() => router.push("/")}
          notices={
            <ResultNotices result={state.data.analysis} parsed={state.data.parsed} onUseMonorepoExample={editInHome} />
          }
        />
      </div>
    );
  }

  return (
    <PendingShell label={sourceLabel(source) ?? t.shared.untitled}>
      {state.kind === "loading" ? (
        <AnalysisProgress done={state.done} total={state.total} current={state.current} />
      ) : (
        <div className="space-y-4">
          <div role="alert" className="flex gap-3 border border-alarm/60 bg-alarm/10 p-4 text-sm leading-relaxed text-bone">
            <ErrorIcon className="mt-0.5 size-4 shrink-0 text-alarm" />
            <p>{state.message}</p>
          </div>
          <Link href="/" className="inline-block font-mono text-xs tracking-[0.15em] text-fog uppercase hover:text-bone">
            ← {t.shared.home}
          </Link>
        </div>
      )}
    </PendingShell>
  );
}

/**
 * Same frame as the result's first screen (headline, clock, score area), so
 * swapping in the result doesn't push the page around.
 */
function PendingShell({ label, children }: { label?: string; children: ReactNode }) {
  const t = getMessages();
  return (
    <div className="space-y-10 pt-6 sm:pt-12">
      <div className="text-center sm:text-left">
        <p className="mb-2 font-mono text-[11px] tracking-[0.2em] text-amber uppercase">{t.shared.eyebrow}</p>
        <h1 className="mx-auto max-w-3xl font-display text-[1.55rem] leading-[1.08] break-words text-balance sm:mx-0 sm:text-5xl">
          {label ?? "\u00a0"}
        </h1>
      </div>
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-10">
        <DoomsdayClock minutes={null} level={null} className="w-[min(58vw,30dvh,300px)] shrink-0 sm:w-[min(34vw,320px)]" />
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}

/** Static shell while the route params are read. */
export function SharedForecastFallback() {
  return (
    <PendingShell>
      <AnalysisProgress done={null} total={0} />
    </PendingShell>
  );
}
