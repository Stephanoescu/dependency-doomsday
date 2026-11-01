import Link from "next/link";
import { getMessages } from "@/lib/i18n";

export function SiteHeader() {
  const t = getMessages();
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 pt-5 sm:px-8 sm:pt-8">
      <Link
        href="/"
        aria-label={t.brand.home}
        className="group inline-flex items-center gap-2.5 font-mono text-xs font-semibold tracking-[0.2em] text-bone uppercase"
      >
        <span aria-hidden className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-alarm opacity-60 motion-reduce:hidden" />
          <span className="relative inline-flex size-2.5 rounded-full bg-alarm" />
        </span>
        {t.brand.name}
      </Link>
      <nav>
        <Link
          href="/methodology"
          className="font-mono text-xs tracking-[0.15em] text-fog uppercase underline-offset-4 hover:text-bone hover:underline"
        >
          {t.nav.methodology}
        </Link>
      </nav>
    </header>
  );
}
