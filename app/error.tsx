"use client";

import Link from "next/link";
import { useEffect } from "react";
import { DoomsdayClock } from "@/components/result/doomsday-clock";
import { getMessages } from "@/lib/i18n";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = getMessages().errorPage;
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col items-center px-5 pt-12 text-center sm:flex-row sm:gap-12 sm:px-8 sm:pt-24 sm:text-left">
      <DoomsdayClock minutes={1} level="high" className="w-[min(60vw,260px)] shrink-0" />
      <div className="mt-8 sm:mt-0">
        <p className="font-mono text-xs tracking-[0.25em] text-amber uppercase">{"// "}{t.eyebrow}</p>
        <h1 className="mt-3 font-display text-5xl text-balance sm:text-7xl">{t.title}</h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-fog">{t.body}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-3 bg-alarm px-6 py-3 font-display text-base text-void uppercase hover:bg-[#ff6a61]"
          >
            {t.retry}
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center border border-line-strong px-5 py-3 font-mono text-xs font-semibold tracking-wider text-bone uppercase hover:border-amber hover:text-amber"
          >
            {t.home}
          </Link>
        </div>
      </div>
    </main>
  );
}
