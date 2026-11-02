import Link from "next/link";
import { getMessages } from "@/lib/i18n";
import { REPO_URL } from "@/lib/site";

export function SiteFooter() {
  const t = getMessages();
  const link = "text-fog underline underline-offset-4 hover:text-bone";
  return (
    <footer className="mx-auto w-full max-w-5xl px-5 pt-16 pb-10 sm:px-8">
      <div className="flex flex-col gap-4 border-t border-line pt-6 font-mono text-xs leading-relaxed text-dim sm:flex-row sm:justify-between">
        <div>
          <p>{t.footer.tagline}</p>
          <p>{t.footer.data}</p>
        </div>
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          <li>
            <Link href="/methodology" className={link}>
              {t.footer.methodology}
            </Link>
          </li>
          <li>
            <Link href="/ranking" className={link}>
              {t.footer.ranking}
            </Link>
          </li>
          <li>
            <a href={REPO_URL} className={link} rel="noopener noreferrer">
              {t.footer.source}
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
