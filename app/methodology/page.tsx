import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { RichText } from "@/components/rich-text";
import { formatCompact } from "@/lib/format";
import { fmt, getMessages } from "@/lib/i18n";
import { METHODOLOGY_VERSION, RULES, type RiskLevel } from "@/lib/risk";
import { pageOpenGraph } from "@/lib/site";

const t = getMessages();
const m = t.methodology;
const version = { version: METHODOLOGY_VERSION };

export const metadata: Metadata = {
  title: m.metaTitle,
  description: m.metaDescription,
  alternates: { canonical: "/methodology" },
  // The image comes from ./opengraph-image.tsx.
  openGraph: pageOpenGraph({ title: m.metaTitle, description: m.metaDescription, url: "/methodology" }),
};

const strong = "font-semibold text-bone";

const LEVEL_STYLE: Record<RiskLevel, string> = {
  low: "border-risk-low text-risk-low",
  mid: "border-risk-mid text-risk-mid",
  high: "border-risk-high text-risk-high",
};

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  const id = `section-${n}`;
  return (
    <section aria-labelledby={id} className="border-t border-line pt-8">
      <h2 id={id} className="flex items-baseline gap-3 font-display text-2xl sm:text-3xl">
        <span aria-hidden className="font-mono text-sm font-normal tracking-normal text-amber">
          {String(n).padStart(2, "0")}
        </span>
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-base leading-relaxed text-pretty text-fog">{children}</div>
    </section>
  );
}

function Rich({ text }: { text: string }) {
  return <RichText text={text} strongClassName={strong} />;
}

export default function MethodologyPage() {
  const rows = m.package.rows;
  const ruleRows: { rule: string; why: string; points: string }[] = [
    { ...rows.terminal, points: fmt(m.package.terminalPoints, { max: RULES.terminal }) },
    { ...rows.singleMaintainer, points: `+${RULES.singleMaintainer}` },
    { ...rows.releaseOld, points: `+${RULES.releaseOver36Months}` },
    { ...rows.releaseStale, points: `+${RULES.releaseOver18Months}` },
    { ...rows.push, points: `+${RULES.pushOver24Months}` },
    { ...rows.noRepo, points: `+${RULES.noRepository}` },
  ];

  let n = 0;

  return (
    <main className="mx-auto w-full max-w-5xl px-5 pt-12 sm:px-8 sm:pt-20">
      <header className="max-w-3xl">
        <p className="font-mono text-xs tracking-[0.25em] text-amber uppercase">
          {"// "}
          {m.eyebrow}
        </p>
        <h1 className="mt-4 font-display text-[2.75rem] text-balance sm:text-7xl">{m.title}</h1>
        <p className="mt-5 inline-block border border-line-strong px-2 py-1 font-mono text-xs tracking-wider text-bone uppercase">
          {fmt(m.version, version)}
        </p>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-pretty text-fog sm:text-lg">{m.intro}</p>
      </header>

      <div className="mt-12 max-w-3xl space-y-12">
        <Section n={++n} title={m.sources.title}>
          <ul className="space-y-2">
            {m.sources.items.map((item) => (
              <li key={item} className="flex gap-3">
                <span aria-hidden className="font-mono text-dim">
                  –
                </span>
                <span>
                  <Rich text={item} />
                </span>
              </li>
            ))}
          </ul>
          <p className="font-mono text-sm text-dim">{m.sources.privacy}</p>
        </Section>

        <Section n={++n} title={m.package.title}>
          <p>{fmt(m.package.intro, { max: RULES.maxRisk })}</p>
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line-strong font-mono text-[11px] tracking-[0.2em] text-dim uppercase">
                <th scope="col" className="py-2 pr-4 font-normal">
                  {m.package.ruleHeader}
                </th>
                <th scope="col" className="py-2 text-right font-normal">
                  {m.package.pointsHeader}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ruleRows.map((row, i) => (
                <tr key={row.rule}>
                  <td className="py-3 pr-4 align-top">
                    <span className="block font-semibold text-bone">{row.rule}</span>
                    <span className="mt-0.5 block text-fog">{row.why}</span>
                  </td>
                  <td
                    className={`py-3 text-right align-top font-mono text-base font-semibold whitespace-nowrap tabular-nums ${
                      i === 0 ? "text-alarm" : "text-amber"
                    }`}
                  >
                    {row.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-sm">
            <Rich text={m.package.maintainersNote} />
          </p>
        </Section>

        <Section n={++n} title={m.discounts.title}>
          <p>
            <Rich text={m.discounts.intro} />
          </p>
          <ul className="space-y-3">
            <li className="border-l-2 border-risk-low pl-4">
              <Rich text={fmt(m.discounts.finished, { issues: RULES.finishedMaxOpenIssues })} />
            </li>
            <li className="border-l-2 border-risk-low pl-4">
              <Rich text={fmt(m.discounts.alive, { months: RULES.recentPushMonths })} />
            </li>
          </ul>
          <p className="font-mono text-sm text-dim">
            {fmt(m.discounts.example, {
              full: RULES.releaseOver36Months,
              halved: Math.round(RULES.releaseOver36Months * RULES.halvingFactor),
            })}
          </p>
        </Section>

        <Section n={++n} title={m.colors.title}>
          <ul className="grid gap-3 sm:grid-cols-3">
            {(["low", "mid", "high"] as const).map((level) => (
              <li key={level} className={`border-l-4 bg-ash/70 px-4 py-3 ${LEVEL_STYLE[level]}`}>
                <span className="block font-mono text-2xl font-semibold tabular-nums">{m.colors[level]}</span>
                <span className="mt-1 block text-sm text-bone">{t.levels[level]}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section n={++n} title={m.critical.title}>
          <p>
            <Rich text={fmt(m.critical.body, { downloads: formatCompact(RULES.criticalDownloads) })} />
          </p>
        </Section>

        <Section n={++n} title={m.project.title}>
          <p>
            <Rich text={m.project.body} />
          </p>
          <pre className="overflow-x-auto border border-line bg-ash/70 p-4 font-mono text-[13px] leading-relaxed text-bone">
            {m.project.formula.map((line) => fmt(line, { critical: RULES.criticalWeight })).join("\n")}
          </pre>
          <p>{m.project.weights}</p>
        </Section>

        <Section n={++n} title={m.clock.title}>
          <p>{m.clock.body}</p>
        </Section>

        <Section n={++n} title={m.missing.title}>
          <p>
            <Rich text={m.missing.body} />
          </p>
        </Section>

        <Section n={++n} title={m.limits.title}>
          <ul className="space-y-2">
            {m.limits.items.map((item) => (
              <li key={item} className="flex gap-3">
                <span aria-hidden className="font-mono text-dim">
                  –
                </span>
                <span>
                  <Rich text={item} />
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section n={++n} title={m.versioning.title}>
          <p>
            <Rich text={fmt(m.versioning.body, version)} />
          </p>
        </Section>

        <Link
          href="/"
          className="inline-flex w-full items-center justify-center gap-3 bg-alarm px-7 py-4 font-display text-lg text-void uppercase transition-[background-color,transform] hover:bg-[#ff6a61] active:translate-y-px sm:w-auto"
        >
          {m.cta} <span aria-hidden>→</span>
        </Link>
      </div>
    </main>
  );
}
