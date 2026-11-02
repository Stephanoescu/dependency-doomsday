import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { HeartIcon, WarningIcon } from "@/components/icons";
import { RichText } from "@/components/rich-text";
import { DoomsdayClock } from "@/components/result/doomsday-clock";
import { LEVEL_TEXT } from "@/components/result/risk-style";
import { formatCompact, formatRelative } from "@/lib/format";
import { fmt, getMessages, plural } from "@/lib/i18n";
import { writeFinding } from "@/lib/narrative";
import { RANKING_PROJECTS, type RankingSnapshot } from "@/lib/ranking";
import { METHODOLOGY_VERSION } from "@/lib/risk";
import { advanceRanking, getRankingSnapshot } from "@/lib/server/ranking";

/** A cold first visit may compute the ranking itself. */
export const maxDuration = 60;

const t = getMessages();
const r = t.ranking;

export const metadata: Metadata = {
  title: r.metaTitle,
  description: r.metaDescription,
  alternates: { canonical: "/ranking" },
  openGraph: { title: r.metaTitle, description: r.metaDescription, url: "/ranking" },
};

const strong = "font-semibold text-bone";

async function loadSnapshot(): Promise<RankingSnapshot | null> {
  await connection();
  const snapshot = await getRankingSnapshot();
  if (snapshot) return snapshot;
  // Normally the daily cron has published it; locally or on a first deploy, compute it now.
  const result = await advanceRanking({ budgetMs: 40_000 });
  return result.snapshot ?? null;
}

function Heroes({ snapshot }: { snapshot: RankingSnapshot }) {
  if (snapshot.heroes.length === 0) return null;
  return (
    <section aria-labelledby="heroes-title" className="border border-amber/40 bg-amber/[0.04] p-5 sm:p-8">
      <h2 id="heroes-title" className="font-display text-3xl sm:text-5xl">
        {r.heroesTitle}
      </h2>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-fog">{r.heroesIntro}</p>
      <ol className="mt-6 grid gap-3 sm:grid-cols-2">
        {snapshot.heroes.map((hero) => {
          const shown = hero.packages.slice(0, 3);
          return (
            <li key={hero.user} className="flex flex-col gap-3 border border-line bg-ash/80 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <a
                  href={`https://www.npmjs.com/~${encodeURIComponent(hero.user)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-base font-semibold break-words text-bone underline-offset-4 hover:text-amber hover:underline"
                >
                  {hero.user}
                </a>
                <span className="shrink-0 font-mono text-xs text-amber">{plural(r.reliedOn, hero.projects.length)}</span>
              </div>
              <ul className="space-y-1 font-mono text-xs text-fog">
                {shown.map((p) => (
                  <li key={p.name} className="flex flex-wrap items-center gap-x-2">
                    <span className="text-bone">{p.name}</span>
                    {p.downloads !== null && <span>{fmt(t.facts.downloads, { count: formatCompact(p.downloads) })}</span>}
                    {p.critical && (
                      <span className="inline-flex items-center gap-1 text-amber">
                        <WarningIcon className="size-3" />
                        {t.tags.critical}
                      </span>
                    )}
                  </li>
                ))}
                {hero.packages.length > shown.length && (
                  <li className="text-dim">{plural(r.morePackages, hero.packages.length - shown.length)}</li>
                )}
              </ul>
              <p className="font-mono text-[11px] leading-relaxed text-dim">{hero.projects.join(" · ")}</p>
              <a
                href={hero.support.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-auto inline-flex items-center justify-center gap-2 border px-3 py-2 font-mono text-xs font-semibold tracking-wider uppercase transition-colors ${
                  hero.support.kind === "funding"
                    ? "border-alarm bg-alarm/10 text-bone hover:bg-alarm hover:text-void"
                    : "border-line-strong text-fog hover:border-bone hover:text-bone"
                }`}
              >
                {hero.support.kind === "funding" && <HeartIcon className="size-4" />}
                {hero.support.kind === "funding" ? r.support : r.profile}
                <span className="sr-only"> — {hero.user}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Projects({ snapshot }: { snapshot: RankingSnapshot }) {
  return (
    <section aria-labelledby="projects-title" className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="projects-title" className="font-display text-3xl sm:text-4xl">
          {r.projectsTitle}
        </h2>
        <p className="font-mono text-xs text-dim">
          {fmt(r.updated, { time: formatRelative(snapshot.generatedAt), version: METHODOLOGY_VERSION })}
        </p>
      </div>
      <ol className="space-y-3">
        {snapshot.entries.map((entry, i) => {
          const scored = entry.score !== null && entry.minutesToMidnight !== null && entry.state !== "insufficient";
          const headline = writeFinding(entry.finding, t.og.headline, { project: entry.label });
          return (
            <li key={entry.id}>
              <Link
                href={entry.path}
                className="group grid grid-cols-[auto_1fr] items-center gap-4 border border-line bg-ash/70 p-4 transition-colors hover:border-line-strong sm:grid-cols-[auto_auto_1fr_auto] sm:gap-6 sm:p-5"
              >
                <span className="hidden font-mono text-sm text-dim sm:block">{fmt(r.rank, { rank: i + 1 })}</span>
                <DoomsdayClock minutes={scored ? entry.minutesToMidnight : null} level={entry.level} className="size-16 sm:size-20" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-mono text-sm font-semibold break-all text-bone group-hover:text-amber">
                      {entry.label}
                    </span>
                    <span className="font-mono text-[10px] tracking-wider text-dim uppercase">{r.category[entry.category]}</span>
                  </div>
                  <p className="mt-1.5 text-sm leading-snug text-pretty text-fog">
                    <RichText text={headline} strongClassName="font-semibold text-bone" />
                  </p>
                  <p className="mt-1.5 font-mono text-[11px] text-dim">
                    {plural(r.dependencies, entry.total)}
                    {entry.critical > 0 && ` · ${plural(r.critical, entry.critical)}`}
                    {scored && ` · ${plural(t.forecast.minutes, entry.minutesToMidnight!)}`}
                  </p>
                </div>
                <div className="col-span-2 flex items-baseline justify-between gap-3 border-t border-line pt-3 sm:col-span-1 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                  <span className={`font-display text-4xl tabular-nums sm:text-5xl ${entry.level ? LEVEL_TEXT[entry.level] : "text-fog"}`}>
                    {scored ? entry.score : "?"}
                    <span className="font-mono text-sm font-normal tracking-normal text-dim">{t.forecast.outOf}</span>
                  </span>
                  <span className="font-mono text-[11px] tracking-wider text-fog uppercase group-hover:text-bone">
                    {r.viewReport} →
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
      {snapshot.failed.length > 0 && (
        <p className="font-mono text-xs text-dim">
          {fmt(r.failed, {
            projects: snapshot.failed
              .map((id) => RANKING_PROJECTS.find((p) => p.id === id))
              .map((p) => (p ? `${p.ref.owner}/${p.ref.repo}` : ""))
              .join(", "),
          })}
        </p>
      )}
    </section>
  );
}

async function RankingContent() {
  const snapshot = await loadSnapshot();
  if (!snapshot) return <p className="border-l-2 border-amber pl-3 text-amber">{r.computing}</p>;
  return (
    <>
      <Heroes snapshot={snapshot} />
      <Projects snapshot={snapshot} />
    </>
  );
}

function RankingSkeleton() {
  return (
    <div aria-hidden className="space-y-3">
      <div className="h-64 animate-pulse border border-line bg-ash/50" />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-28 animate-pulse border border-line bg-ash/50" />
      ))}
    </div>
  );
}

/** /ranking — ten popular projects and the people their dependencies rely on. */
export default function RankingPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 pt-12 sm:px-8 sm:pt-20">
      <header className="max-w-3xl">
        <p className="font-mono text-xs tracking-[0.25em] text-amber uppercase">
          {"// "}
          {r.eyebrow}
        </p>
        <h1 className="mt-4 font-display text-[2.75rem] text-balance sm:text-7xl">{r.title}</h1>
        <p className="mt-6 text-base leading-relaxed text-pretty text-fog sm:text-lg">{r.intro}</p>
      </header>

      <aside aria-labelledby="note-title" className="mt-8 max-w-3xl border-l-2 border-line-strong pl-4">
        <h2 id="note-title" className="font-mono text-[11px] tracking-[0.2em] text-dim uppercase">
          {r.noteTitle}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-fog">
          <RichText text={r.note} strongClassName={strong} />
        </p>
      </aside>

      <div className="mt-12 space-y-14">
        <Suspense fallback={<RankingSkeleton />}>
          <RankingContent />
        </Suspense>
        <Link
          href="/"
          className="inline-flex w-full items-center justify-center gap-3 bg-alarm px-7 py-4 font-display text-lg text-void uppercase transition-[background-color,transform] hover:bg-[#ff6a61] active:translate-y-px sm:w-auto"
        >
          {r.cta} <span aria-hidden>→</span>
        </Link>
      </div>
    </main>
  );
}
