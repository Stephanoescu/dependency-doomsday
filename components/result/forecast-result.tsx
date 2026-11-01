"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ReplayIcon } from "@/components/icons";
import { RichText } from "@/components/rich-text";
import type { AnalysisResult } from "@/lib/analysis/types";
import { fmt, getMessages, plural } from "@/lib/i18n";
import { headline, heroes, resultState, sentences, type ResultState } from "@/lib/narrative";
import type { Forecast, ScoredPackage } from "@/lib/risk";
import { CLOCK_START_MINUTES, DoomsdayClock } from "./doomsday-clock";
import { InvisibleHeroes } from "./invisible-heroes";
import { PackageDialog } from "./package-dialog";
import { PackageList } from "./package-list";
import { RiskTreemap } from "./risk-treemap";
import { LEVEL_TEXT } from "./risk-style";
import { ShareBar } from "./share-bar";
import { easeOutCubic, progress, REVEAL, usePrefersReducedMotion, useRevealClock } from "./use-reveal";

interface Props {
  analysis: AnalysisResult;
  projectName?: string;
  /** Warnings shown between the sentences and the treemap (quota, monorepo, truncation…). */
  notices?: ReactNode;
  onNewForecast: () => void;
}

/** Riskiest first; packages without data last. */
const byRisk = (a: ScoredPackage, b: ScoredPackage) => (b.risk?.risk ?? -1) - (a.risk?.risk ?? -1);

export function ForecastResult({ analysis, projectName, notices, onNewForecast }: Props) {
  const t = getMessages();
  const reduced = usePrefersReducedMotion();
  const [run, setRun] = useState(0);
  const [selected, setSelected] = useState<ScoredPackage | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const listRef = useRef<HTMLDetailsElement>(null);

  const { forecast } = analysis;
  const now = Date.parse(analysis.generatedAt);
  const packages = useMemo(() => [...analysis.packages].sort(byRisk), [analysis.packages]);
  const story = useMemo(
    () => ({
      state: resultState(forecast, packages.length),
      headline: headline(packages, forecast, t),
      sentences: sentences(packages, forecast, t),
      heroes: heroes(packages),
    }),
    [forecast, packages, t],
  );

  // Land at the top with the headline focused: it's the first thing to read (and to record).
  useEffect(() => {
    window.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  const showMore = useCallback(() => {
    const details = listRef.current;
    if (!details) return;
    details.open = true;
    details.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }, [reduced]);

  const allClear = story.state === "all-clear";

  return (
    <div className="space-y-14 sm:space-y-20">
      <section aria-labelledby="result-headline" className="space-y-10">
        <div className="text-center sm:text-left">
          {projectName && (
            <p className="mb-2 font-mono text-[11px] tracking-[0.2em] text-dim uppercase">{projectName}</p>
          )}
          <h1
            id="result-headline"
            ref={headingRef}
            tabIndex={-1}
            className="mx-auto max-w-3xl font-display text-[1.55rem] leading-[1.08] text-balance focus:outline-none sm:mx-0 sm:text-5xl"
          >
            <RichText text={story.headline} strongClassName={allClear ? "text-risk-low" : "text-alarm"} />
          </h1>
        </div>

        <RevealStage
          key={run}
          reduced={reduced}
          forecast={forecast}
          state={story.state}
          sentences={story.sentences}
          packages={packages}
          notices={notices}
          onReplay={() => setRun((r) => r + 1)}
          onSelect={setSelected}
          onMore={showMore}
        />
      </section>

      <InvisibleHeroes heroes={story.heroes} />

      <ShareBar />

      <details ref={listRef} className="group scroll-mt-6">
        <summary className="cursor-pointer font-mono text-xs tracking-[0.2em] text-fog uppercase marker:text-dim hover:text-bone">
          {plural(t.result.allPackages, packages.length)}
        </summary>
        <div className="mt-4">
          <PackageList packages={packages} now={now} />
        </div>
      </details>

      <div className="flex flex-col-reverse items-stretch gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/methodology"
          className="text-center font-mono text-xs tracking-[0.15em] text-fog uppercase underline-offset-4 hover:text-bone hover:underline"
        >
          {fmt(t.forecast.methodology, { version: forecast.methodology })}
        </Link>
        <button
          type="button"
          onClick={onNewForecast}
          className="inline-flex items-center justify-center gap-3 bg-alarm px-7 py-4 font-display text-lg text-void uppercase transition-[background-color,transform] hover:bg-[#ff6a61] active:translate-y-px"
        >
          {t.result.newForecast} <span aria-hidden>→</span>
        </button>
      </div>

      <PackageDialog pkg={selected} now={now} onClose={() => setSelected(null)} />
    </div>
  );
}

interface StageProps {
  reduced: boolean;
  forecast: Forecast;
  state: ResultState;
  sentences: string[];
  packages: ScoredPackage[];
  notices?: ReactNode;
  onReplay: () => void;
  onSelect: (pkg: ScoredPackage) => void;
  onMore: () => void;
}

/** Everything that plays in sequence. Remounted (new key) to replay. */
function RevealStage({ reduced, forecast, state, sentences, packages, notices, onReplay, onSelect, onMore }: StageProps) {
  const t = getMessages();
  const elapsed = useRevealClock(reduced);
  const scored = state !== "insufficient" && forecast.score !== null && forecast.minutesToMidnight !== null;

  const clockT = easeOutCubic(progress(elapsed, 0, REVEAL.clockEnd));
  const minutes = scored ? CLOCK_START_MINUTES + (forecast.minutesToMidnight! - CLOCK_START_MINUTES) * clockT : null;
  const shownScore = scored ? Math.round(forecast.score! * easeOutCubic(progress(elapsed, REVEAL.scoreStart, REVEAL.scoreEnd))) : null;
  const scoreVisible = elapsed >= REVEAL.scoreStart;
  const level = scored ? forecast.level : null;

  return (
    <>
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-10">
        <DoomsdayClock
          minutes={minutes}
          level={level}
          className="w-[min(58vw,30dvh,300px)] shrink-0 sm:w-[min(34vw,320px)]"
        />

        <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
          <p className="font-mono text-[11px] tracking-[0.2em] text-dim uppercase" aria-hidden>
            {t.forecast.scoreLabel}
          </p>
          <p
            aria-hidden
            className={`font-display text-[5.25rem] leading-none tabular-nums transition-opacity duration-300 sm:text-9xl ${
              level ? LEVEL_TEXT[level] : "text-fog"
            } ${scoreVisible || !scored ? "opacity-100" : "opacity-25"}`}
          >
            {scored ? shownScore : t.result.unknownScore}
            <span className="font-mono text-2xl font-normal tracking-normal text-dim sm:text-3xl">{t.forecast.outOf}</span>
          </p>
          <p
            aria-hidden
            className={`mt-1 font-mono text-sm font-semibold tracking-wider text-amber uppercase ${
              elapsed >= REVEAL.scoreEnd || !scored ? "animate-fade" : "opacity-0"
            }`}
          >
            {scored ? plural(t.forecast.minutes, forecast.minutesToMidnight!) : t.forecast.noScore}
          </p>
          <p className="sr-only">
            {scored
              ? fmt(t.result.scoreSr, {
                  score: forecast.score!,
                  minutes: plural(t.forecast.minutes, forecast.minutesToMidnight!),
                })
              : t.forecast.noScore}
          </p>
          {!reduced && (
            <button
              type="button"
              onClick={onReplay}
              className="mt-3 inline-flex items-center gap-1.5 font-mono text-xs tracking-[0.15em] text-fog uppercase hover:text-bone"
            >
              <ReplayIcon className="size-3.5" />
              {t.result.replay}
            </button>
          )}
        </div>
      </div>

      <ul className="max-w-3xl space-y-2 text-base leading-relaxed text-pretty text-fog sm:text-lg">
        {sentences.map((sentence, i) => {
          const visible = elapsed >= REVEAL.sentencesStart + i * REVEAL.sentenceStagger;
          return (
            <li key={sentence} className={`border-l-2 border-line-strong pl-3 ${visible ? "animate-fade" : "opacity-0"}`}>
              {sentence}
            </li>
          );
        })}
        {state === "all-clear" && (
          <li
            className={`border-l-2 border-risk-low pl-3 text-bone ${
              elapsed >= REVEAL.sentencesStart + sentences.length * REVEAL.sentenceStagger ? "animate-fade" : "opacity-0"
            }`}
          >
            {t.result.allClearNote}
          </li>
        )}
      </ul>

      {notices && <div className="space-y-3">{notices}</div>}

      <section aria-labelledby="treemap-title" className="space-y-3">
        <div>
          <h2 id="treemap-title" className="font-display text-3xl sm:text-4xl">
            {t.treemap.title}
          </h2>
          <p className="mt-1 text-sm text-fog">{t.treemap.hint}</p>
        </div>
        <RiskTreemap
          packages={packages}
          revealed={elapsed >= REVEAL.treemapStart}
          instant={reduced}
          onSelect={onSelect}
          onMore={onMore}
        />
      </section>
    </>
  );
}
