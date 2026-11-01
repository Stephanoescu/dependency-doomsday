import Link from "next/link";
import { getMessages } from "@/lib/i18n";

export function SiteFooter() {
  const t = getMessages();
  return (
    <footer className="mx-auto w-full max-w-5xl px-5 pt-16 pb-10 sm:px-8">
      <div className="border-t border-line pt-6 font-mono text-xs leading-relaxed text-dim">
        <p>{t.footer.tagline}</p>
        <p>{t.footer.data}</p>
        <p className="mt-3">
          <Link href="/methodology" className="text-fog underline underline-offset-4 hover:text-bone">
            {t.footer.methodology}
          </Link>
        </p>
      </div>
    </footer>
  );
}
