"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnalysisProgress } from "@/components/analysis-progress";
import { ErrorIcon } from "@/components/icons";
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
export function SharedForecast({ source, path }: { source: ShareSource; path: string }) {
  const t = getMessages();
  const router = useRouter();
  const [state, setState] = useState<State>(() => {
    const handed = peekForecast(path);
    return handed ? { kind: "done", data: handed } : { kind: "loading", done: null, total: 0 };
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

  const label = sourceLabel(source);
  return (
    <div className="mx-auto max-w-3xl space-y-6 pt-12 sm:pt-20">
      <div>
        <p className="font-mono text-xs tracking-[0.25em] text-amber uppercase">
          {"// "}
          {t.shared.eyebrow}
        </p>
        <h1 className="mt-3 font-display text-4xl break-words sm:text-6xl">{label ?? t.shared.untitled}</h1>
      </div>
      {state.kind === "loading" ? (
        <AnalysisProgress done={state.done} total={state.total} current={state.current} />
      ) : (
        <div role="alert" className="flex gap-3 border border-alarm/60 bg-alarm/10 p-4 text-sm leading-relaxed text-bone">
          <ErrorIcon className="mt-0.5 size-4 shrink-0 text-alarm" />
          <p>{state.message}</p>
        </div>
      )}
      <Link href="/" className="inline-block font-mono text-xs tracking-[0.15em] text-fog uppercase hover:text-bone">
        ← {t.shared.home}
      </Link>
    </div>
  );
}

/** Static shell while the route params are read. */
export function SharedForecastFallback() {
  const t = getMessages();
  return (
    <div className="mx-auto max-w-3xl space-y-6 pt-12 sm:pt-20">
      <p className="font-mono text-xs tracking-[0.25em] text-amber uppercase">
        {"// "}
        {t.shared.eyebrow}
      </p>
      <AnalysisProgress done={null} total={0} />
    </div>
  );
}
