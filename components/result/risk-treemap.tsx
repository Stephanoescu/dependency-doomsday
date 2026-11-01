"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState } from "react";
import { WarningIcon } from "@/components/icons";
import { fmt, getMessages, plural } from "@/lib/i18n";
import type { RiskLevel, ScoredPackage } from "@/lib/risk";
import { capItems, MORE_ID, squarify } from "@/lib/treemap";
import { LEVEL_FILL, LevelGlyph } from "./risk-style";

interface Props {
  packages: ScoredPackage[];
  /** Start the cascade; false keeps tiles hidden until the reveal reaches them. */
  revealed: boolean;
  /** No cascade (reduced motion). */
  instant: boolean;
  onSelect: (pkg: ScoredPackage) => void;
  onMore: () => void;
}

const GAP = 2;
const MAX_TILES_NARROW = 40;
const MAX_TILES_WIDE = 80;

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((s) => (s && Math.abs(s.w - width) < 1 && Math.abs(s.h - height) < 1 ? s : { w: width, h: height }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}

/** Tile size is the package's weight in the score; color, glyph and number all show the risk. */
export const RiskTreemap = memo(function RiskTreemap({ packages, revealed, instant, onSelect, onMore }: Props) {
  const t = getMessages();
  const [ref, size] = useSize<HTMLDivElement>();

  const byName = useMemo(() => new Map(packages.map((p) => [p.name, p])), [packages]);

  const layout = useMemo(() => {
    if (!size) return null;
    const max = size.w < 640 ? MAX_TILES_NARROW : MAX_TILES_WIDE;
    const { items, hidden } = capItems(
      packages.map((p) => ({ id: p.name, value: p.risk?.weight ?? 1 })),
      max,
    );
    return { rects: squarify(items, size.w, size.h), hidden: hidden.length };
  }, [packages, size]);

  return (
    <div>
      <div
        ref={ref}
        role="group"
        aria-label={t.treemap.label}
        className="relative aspect-[4/5] w-full overflow-hidden bg-void sm:aspect-[16/9]"
      >
        {layout?.rects.map((r, i) => {
          const style = {
            left: r.x + GAP / 2,
            top: r.y + GAP / 2,
            width: Math.max(0, r.w - GAP),
            height: Math.max(0, r.h - GAP),
            animationDelay: instant ? undefined : `${Math.min(i * 22, 1_100)}ms`,
          };
          const motion = instant ? "" : revealed ? "animate-tile" : "opacity-0";
          const w = style.width;
          const h = style.height;

          if (r.id === MORE_ID) {
            return (
              <button
                key={r.id}
                type="button"
                onClick={onMore}
                style={style}
                aria-label={plural(t.treemap.moreLabel, layout.hidden)}
                className={`absolute flex items-center justify-center border border-dashed border-line-strong bg-ash-2 font-mono text-xs font-semibold text-bone hover:border-amber hover:text-amber ${motion}`}
              >
                {w >= 40 && h >= 20 ? fmt(t.treemap.more, { count: layout.hidden }) : "+"}
              </button>
            );
          }

          const pkg = byName.get(r.id)!;
          const risk = pkg.risk;
          const level: RiskLevel | null = risk?.level ?? null;
          const big = w >= 72 && h >= 46;
          const medium = w >= 34 && h >= 26;
          const label = !risk
            ? fmt(t.treemap.tileNoData, { name: pkg.name })
            : fmt(risk.critical ? t.treemap.tileCritical : t.treemap.tile, {
                name: pkg.name,
                risk: risk.risk,
                level: t.levels[risk.level],
              });

          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelect(pkg)}
              style={style}
              aria-label={label}
              title={label}
              className={`group absolute overflow-hidden text-left transition-[filter] hover:brightness-110 focus-visible:z-10 ${
                level ? `${LEVEL_FILL[level]} text-void` : "border border-fog/40 bg-line text-bone"
              } ${risk?.critical ? "shadow-[inset_0_0_0_3px_var(--color-amber),inset_0_0_0_5px_var(--color-void)]" : ""} ${motion}`}
            >
              {big ? (
                <span className="flex h-full flex-col justify-between p-2">
                  <span className="block truncate font-mono text-xs leading-tight font-bold sm:text-sm">
                    {pkg.name}
                  </span>
                  <span className="flex items-center gap-1">
                    <LevelGlyph level={level} className="size-3.5" />
                    <span className="font-mono text-lg leading-none font-bold tabular-nums">{risk ? risk.risk : ""}</span>
                  </span>
                </span>
              ) : medium ? (
                <span className="flex h-full items-center justify-center gap-0.5">
                  <LevelGlyph level={level} className="size-3" />
                  <span className="font-mono text-xs font-bold tabular-nums">{risk ? risk.risk : ""}</span>
                </span>
              ) : w >= 14 && h >= 14 ? (
                <span className="flex h-full items-center justify-center">
                  <LevelGlyph level={level} className="size-2.5" />
                </span>
              ) : null}
              {risk?.critical && (w >= 30 && h >= 30) && (
                <WarningIcon
                  className={`absolute size-4 rounded-sm bg-amber p-0.5 text-void ${big ? "top-1.5 right-1.5" : "top-1 right-1"}`}
                  strokeWidth={2.5}
                />
              )}
            </button>
          );
        })}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 font-mono text-xs text-fog">
        {(["low", "mid", "high"] as const).map((level) => (
          <li key={level} className="inline-flex items-center gap-1.5">
            <span className={`inline-flex size-4 items-center justify-center text-void ${LEVEL_FILL[level]}`}>
              <LevelGlyph level={level} className="size-3" />
            </span>
            {t.levels[level]}
          </li>
        ))}
        <li className="inline-flex items-center gap-1.5">
          <span className="inline-flex size-4 items-center justify-center bg-risk-high shadow-[inset_0_0_0_2px_var(--color-amber)]">
            <WarningIcon className="size-2.5 text-void" strokeWidth={3} />
          </span>
          {t.treemap.legendCritical}
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="inline-flex size-4 items-center justify-center border border-fog/40 bg-line text-bone">
            <LevelGlyph level={null} className="size-3" />
          </span>
          {t.treemap.legendNoData}
        </li>
      </ul>
    </div>
  );
});
