"use client";

import { useEffect, useRef } from "react";
import { CrossIcon, ExternalIcon, HeartIcon, WarningIcon } from "@/components/icons";
import { npmPackageUrl, packageFacts } from "@/lib/explain";
import { getMessages } from "@/lib/i18n";
import { npmProfileUrl } from "@/lib/narrative";
import type { ScoredPackage } from "@/lib/risk";
import { PackageTags } from "./package-tags";
import { LEVEL_TEXT, LevelGlyph } from "./risk-style";
import { RuleList } from "./rule-list";

interface Props {
  pkg: ScoredPackage | null;
  now: number;
  onClose: () => void;
}

const linkClass =
  "inline-flex items-center gap-1.5 border border-line-strong px-2.5 py-1.5 font-mono text-xs text-bone transition-colors hover:border-amber hover:text-amber";

/** Bottom sheet on phones, side panel on larger screens. Native <dialog>: focus trap and Esc for free. */
export function PackageDialog({ pkg, now, onClose }: Props) {
  const t = getMessages();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (pkg && !dialog.open) dialog.showModal();
    if (!pkg && dialog.open) dialog.close();
  }, [pkg]);

  const risk = pkg?.risk ?? null;
  const funding = pkg?.npm?.funding?.[0];

  return (
    <dialog
      ref={ref}
      aria-labelledby="package-dialog-title"
      onClose={onClose}
      onClick={(e) => {
        // A click on the backdrop lands on the <dialog> element itself.
        if (e.target === e.currentTarget) ref.current?.close();
      }}
      className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto border-t border-line-strong bg-ash p-0 text-bone backdrop:bg-void/75 backdrop:backdrop-blur-[2px] open:animate-rise sm:inset-y-0 sm:right-0 sm:left-auto sm:h-full sm:max-h-none sm:w-[440px] sm:border-t-0 sm:border-l"
    >
      {pkg && (
        <div className="space-y-5 p-5">
          <div className="flex items-start justify-between gap-4">
            <h2 id="package-dialog-title" className="font-mono text-lg font-semibold break-all">
              {pkg.name}
            </h2>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              className="-m-1 shrink-0 p-1 text-fog hover:text-bone"
              aria-label={t.detail.close}
            >
              <CrossIcon className="size-5" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${risk ? LEVEL_TEXT[risk.level] : "text-dim"}`}>
              <LevelGlyph level={risk?.level ?? null} className="size-6" />
              <span className="font-display text-5xl tabular-nums">{risk ? risk.risk : "—"}</span>
            </div>
            <div className="font-mono text-xs">
              <p className="tracking-[0.2em] text-dim uppercase">{t.detail.risk}</p>
              <p className="text-bone">{risk ? t.levels[risk.level] : t.tags.noData}</p>
            </div>
            {risk?.critical && (
              <p className="ml-auto inline-flex items-center gap-1.5 border border-amber px-2 py-1 font-mono text-[11px] font-semibold tracking-wider text-amber uppercase">
                <WarningIcon className="size-3.5" />
                {t.tags.critical}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <PackageTags pkg={pkg} t={t} />
          </div>

          <section>
            <h3 className="font-mono text-[11px] tracking-[0.2em] text-dim uppercase">{t.detail.why}</h3>
            {!risk ? (
              <p className="mt-2 text-sm text-fog">{t.detail.noData}</p>
            ) : risk.rules.length === 0 ? (
              <p className="mt-2 text-sm text-fog">{t.detail.noRules}</p>
            ) : (
              <RuleList risk={risk} t={t} className="mt-2 text-sm" />
            )}
          </section>

          {pkg.npm && (
            <section>
              <h3 className="font-mono text-[11px] tracking-[0.2em] text-dim uppercase">{t.detail.evidence}</h3>
              <ul className="mt-2 space-y-1 font-mono text-xs text-fog">
                {packageFacts(pkg, t, now).map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
              {pkg.npm.maintainers.length > 0 && (
                <p className="mt-3 font-mono text-xs leading-relaxed">
                  <span className="text-dim">{t.detail.maintainers}: </span>
                  {pkg.npm.maintainers.map((user, i) => (
                    <span key={user}>
                      {i > 0 && ", "}
                      <a
                        href={npmProfileUrl(user)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-bone underline underline-offset-2 hover:text-amber"
                      >
                        {user}
                      </a>
                    </span>
                  ))}
                </p>
              )}
            </section>
          )}

          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            {funding && (
              <a href={funding.url} target="_blank" rel="noopener noreferrer" className={`${linkClass} border-alarm/60`}>
                <HeartIcon className="size-3.5 text-alarm" />
                {t.detail.support}
              </a>
            )}
            {pkg.npmStatus !== "not-found" && (
              <a href={npmPackageUrl(pkg.name)} target="_blank" rel="noopener noreferrer" className={linkClass}>
                {t.detail.npm}
                <ExternalIcon className="size-3.5" />
              </a>
            )}
            {pkg.npm?.repositoryUrl && (
              <a href={pkg.npm.repositoryUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
                {t.detail.repo}
                <ExternalIcon className="size-3.5" />
              </a>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
