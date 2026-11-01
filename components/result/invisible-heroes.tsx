import { HeartIcon, WarningIcon } from "@/components/icons";
import { formatCompact } from "@/lib/format";
import { fmt, getMessages } from "@/lib/i18n";
import { npmProfileUrl, type Hero } from "@/lib/narrative";

export function InvisibleHeroes({ heroes }: { heroes: Hero[] }) {
  const t = getMessages();
  if (heroes.length === 0) return null;

  return (
    <section aria-labelledby="heroes-title" className="space-y-4">
      <div>
        <h2 id="heroes-title" className="font-display text-3xl sm:text-4xl">
          {t.heroes.title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fog sm:text-base">{t.heroes.intro}</p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {heroes.map((hero) => (
          <li key={hero.name} className="flex flex-col gap-3 border border-line bg-ash/70 p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-mono text-sm font-semibold break-all text-bone">{hero.name}</p>
              {hero.critical && (
                <span className="inline-flex shrink-0 items-center gap-1 border border-amber px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-amber uppercase">
                  <WarningIcon className="size-3" />
                  {t.tags.critical}
                </span>
              )}
            </div>
            <p className="font-mono text-xs leading-relaxed text-fog">
              <span className="text-dim">{t.heroes.maintainedBy} </span>
              {hero.maintainers.map((user, i) => (
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
              {hero.maintainerCount > hero.maintainers.length && (
                <span className="text-dim">
                  {" "}
                  {fmt(t.heroes.andMore, { count: hero.maintainerCount - hero.maintainers.length })}
                </span>
              )}
              {hero.downloads !== null && (
                <span className="text-dim"> · {fmt(t.facts.downloads, { count: formatCompact(hero.downloads) })}</span>
              )}
            </p>
            {hero.support && (
              <a
                href={hero.support.kind === "funding" ? hero.support.link.url : hero.support.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group mt-auto inline-flex items-center justify-center gap-2 border px-3 py-2 font-mono text-xs font-semibold tracking-wider uppercase transition-colors ${
                  hero.support.kind === "funding"
                    ? "border-alarm bg-alarm/10 text-bone hover:bg-alarm hover:text-void"
                    : "border-line-strong text-fog hover:border-bone hover:text-bone"
                }`}
              >
                {hero.support.kind === "funding" ? (
                  <>
                    <HeartIcon className="size-4 text-alarm group-hover:text-void" />
                    <span aria-hidden>{t.heroes.support}</span>
                    <span className="sr-only">{fmt(t.heroes.supportSr, { name: hero.name })}</span>
                  </>
                ) : (
                  <>
                    <span aria-hidden>{t.heroes.profile}</span>
                    <span className="sr-only">{fmt(t.heroes.profileSr, { user: hero.support.user })}</span>
                  </>
                )}
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
