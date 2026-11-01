import type { Ref } from "react";
import { fmt, getMessages, plural } from "@/lib/i18n";
import { MAX_PACKAGES, type ParseSuccess } from "@/lib/input/types";

interface Props {
  result: ParseSuccess;
  headingRef?: Ref<HTMLHeadingElement>;
}

/** Temporary Phase 1 view: confirms which packages will be analyzed. */
export function DependencyPreview({ result, headingRef }: Props) {
  const t = getMessages();
  const { packages, skipped, truncated, projectName } = result;

  return (
    <section className="animate-rise border border-line bg-ash/70">
      <p className="border-b border-line px-4 py-2.5 font-mono text-[11px] tracking-[0.2em] text-dim uppercase">
        {t.preview.title}
      </p>

      <div className="space-y-5 p-4 sm:p-5">
        <div>
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-3xl text-balance sm:text-4xl"
          >
            {plural(t.preview.ready, packages.length)}
          </h2>
          {projectName && (
            <p className="mt-2 font-mono text-sm text-fog">
              {fmt(t.preview.project, { name: projectName })}
            </p>
          )}
        </div>

        {truncated > 0 && (
          <p className="border-l-2 border-amber pl-3 text-sm text-amber">
            {plural(t.preview.truncated, truncated, { max: MAX_PACKAGES })}
          </p>
        )}

        <ul className="flex flex-wrap gap-1.5">
          {packages.map((pkg, i) => (
            <li
              key={pkg.name}
              style={{ animationDelay: `${Math.min(i * 12, 600)}ms` }}
              className="animate-rise border border-line bg-void px-2 py-1 font-mono text-xs text-bone"
            >
              {pkg.name}
              {pkg.field === "devDependencies" && (
                <span className="ml-1.5 text-amber">{t.preview.devTag}</span>
              )}
              {pkg.alias && (
                <span className="ml-1.5 text-dim">
                  ({fmt(t.preview.aliasOf, { alias: pkg.alias })})
                </span>
              )}
            </li>
          ))}
        </ul>

        {skipped.length > 0 && (
          <details className="group border-t border-line pt-4">
            <summary className="cursor-pointer font-mono text-xs text-fog marker:text-dim hover:text-bone">
              {plural(t.preview.skipped, skipped.length)}
            </summary>
            <ul className="mt-3 space-y-1 font-mono text-xs">
              {skipped.map((s) => (
                <li key={`${s.field}:${s.name}`} className="flex flex-wrap gap-x-2">
                  <span className="text-bone">{s.name}</span>
                  <span className="text-dim">— {t.skipReasons[s.reason]}</span>
                </li>
              ))}
            </ul>
          </details>
        )}

        <p className="border-t border-line pt-4 font-mono text-xs leading-relaxed text-dim">
          {t.preview.pending}
        </p>
      </div>
    </section>
  );
}
