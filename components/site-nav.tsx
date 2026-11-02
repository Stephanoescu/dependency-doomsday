"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getMessages } from "@/lib/i18n";

/** The links, with the current page marked. Rendered without a current page while the path streams in. */
export function NavLinks({ pathname }: { pathname: string | null }) {
  const t = getMessages();
  const links = [
    { href: "/ranking", label: t.nav.ranking },
    { href: "/methodology", label: t.nav.methodology },
  ];
  return (
    <nav aria-label={t.nav.label}>
      <ul className="flex items-center gap-4 sm:gap-6">
        {links.map(({ href, label }) => {
          const current = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={`inline-block py-2 font-mono text-xs tracking-[0.15em] uppercase underline-offset-4 hover:text-bone hover:underline ${
                  current ? "text-bone underline decoration-alarm decoration-2" : "text-fog"
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SiteNav() {
  return <NavLinks pathname={usePathname()} />;
}
