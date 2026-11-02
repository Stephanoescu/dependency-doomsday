import Link from "next/link";
import { Suspense } from "react";
import { LogoMark } from "@/components/logo";
import { NavLinks, SiteNav } from "@/components/site-nav";
import { getMessages } from "@/lib/i18n";

export function SiteHeader() {
  const t = getMessages();
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 pt-4 sm:px-8 sm:pt-7">
      <Link
        href="/"
        aria-label={t.brand.home}
        className="group inline-flex min-w-0 items-center gap-2.5 py-1 font-mono text-xs font-semibold tracking-[0.2em] text-bone uppercase"
      >
        <LogoMark className="size-7 shrink-0 transition-transform group-hover:rotate-[-8deg] motion-reduce:transition-none" />
        <span className="hidden sm:inline">{t.brand.name}</span>
        <span className="sm:hidden">{t.brand.short}</span>
      </Link>
      <Suspense fallback={<NavLinks pathname={null} />}>
        <SiteNav />
      </Suspense>
    </header>
  );
}
