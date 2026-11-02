"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { WarningIcon } from "@/components/icons";
import { RichText } from "@/components/rich-text";
import { CLOCK_START_MINUTES, DoomsdayClock } from "@/components/result/doomsday-clock";
import { LEVEL_FILL, LEVEL_TEXT, LevelGlyph } from "@/components/result/risk-style";
import { easeOutCubic, progress, usePrefersReducedMotion, useRevealClock } from "@/components/result/use-reveal";
import { homeSample as sample } from "@/lib/home-sample";
import { fmt, getMessages, plural } from "@/lib/i18n";
import { squarify } from "@/lib/treemap";

const T = { clockEnd: 1_400, scoreEnd: 2_300, text: 2_300, tiles: 2_700, end: 2_800 };

/** A real forecast, replayed when it scrolls into view, so the result makes sense before trying it. */
export function HomePreview() {
  const t = getMessages();
  const p = t.home.preview;
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const date = new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(sample.generatedAt));

  return (
    <section aria-labelledby="preview-title" className="space-y-4">
      <div>
        <h2 id="preview-title" className="font-display text-3xl sm:text-4xl">
          {p.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-fog sm:text-base">{fmt(p.body, { label: sample.label, date })}</p>
      </div>
      <div ref={ref}>
        <Link
          href={sample.path}
          className="group block border border-line bg-ash/70 p-4 transition-colors hover:border-line-strong sm:p-6"
        >
          <span className="sr-only">
            {fmt(p.srSummary, {
              label: sample.label,
              score: sample.score,
              minutes: plural(t.forecast.minutes, sample.minutesToMidnight),
            })}
          </span>
          {inView ? <Stage reduced={reduced} /> : <Frame elapsed={0} />}
          <span className="mt-4 inline-block font-mono text-xs tracking-[0.15em] text-fog uppercase group-hover:text-amber">
            {p.cta} →
          </span>
        </Link>
      </div>
    </section>
  );
}

function Stage({ reduced }: { reduced: boolean }) {
  const elapsed = useRevealClock(reduced, T.end);
  return <Frame elapsed={elapsed} />;
}

function Frame({ elapsed }: { elapsed: number }) {
  const t = getMessages();
  const minutes =
    CLOCK_START_MINUTES + (sample.minutesToMidnight - CLOCK_START_MINUTES) * easeOutCubic(progress(elapsed, 0, T.clockEnd));
  const score = Math.round(sample.score * easeOutCubic(progress(elapsed, T.clockEnd, T.scoreEnd)));
  const textVisible = elapsed >= T.text;

  return (
    <div aria-hidden className="grid gap-5 sm:grid-cols-[auto_1fr] sm:gap-8">
      <div className="flex items-center gap-5">
        <DoomsdayClock minutes={minutes} level={sample.level} className="w-28 shrink-0 sm:w-40" />
        <div>
          <p className="font-mono text-[11px] tracking-[0.2em] text-dim uppercase">{sample.label}</p>
          <p className={`font-display text-6xl leading-none tabular-nums sm:text-7xl ${LEVEL_TEXT[sample.level]}`}>
            {score}
            <span className="font-mono text-lg font-normal tracking-normal text-dim">{t.forecast.outOf}</span>
          </p>
          <p className={`mt-1 font-mono text-xs font-semibold tracking-wider text-amber uppercase ${textVisible ? "animate-fade" : "opacity-0"}`}>
            {plural(t.forecast.minutes, sample.minutesToMidnight)}
          </p>
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <p className={`font-display text-lg leading-snug text-balance sm:text-xl ${textVisible ? "animate-fade" : "opacity-0"}`}>
          <RichText text={sample.headline} strongClassName="text-alarm" />
        </p>
        <Tiles revealed={elapsed >= T.tiles} instant={elapsed === Infinity} />
      </div>
    </div>
  );
}

function Tiles({ revealed, instant }: { revealed: boolean; instant: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const rects = useMemo(
    () => (size ? squarify(sample.tiles.map((tile) => ({ id: tile.name, value: tile.weight })), size.w, size.h) : []),
    [size],
  );
  const byName = useMemo(() => new Map(sample.tiles.map((tile) => [tile.name, tile])), []);

  return (
    <div ref={ref} className="relative aspect-[16/7] w-full overflow-hidden">
      {rects.map((r, i) => {
        const tile = byName.get(r.id)!;
        const w = r.w - 2;
        const h = r.h - 2;
        return (
          <div
            key={r.id}
            style={{ left: r.x + 1, top: r.y + 1, width: w, height: h, animationDelay: instant ? undefined : `${i * 25}ms` }}
            className={`absolute flex items-center justify-center text-void ${tile.level ? LEVEL_FILL[tile.level] : "bg-line"} ${
              tile.critical ? "shadow-[inset_0_0_0_2px_var(--color-amber),inset_0_0_0_3px_var(--color-void)]" : ""
            } ${instant ? "" : revealed ? "animate-tile" : "opacity-0"}`}
          >
            {w >= 22 && h >= 18 && (tile.critical ? <WarningIcon className="size-3" strokeWidth={2.5} /> : <LevelGlyph level={tile.level} className="size-3" />)}
          </div>
        );
      })}
    </div>
  );
}
