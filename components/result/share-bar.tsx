import type { ComponentType, SVGProps } from "react";
import { BadgeIcon, DownloadIcon, LinkIcon } from "@/components/icons";
import { getMessages } from "@/lib/i18n";

function XLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z" />
    </svg>
  );
}

function LinkedInLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4v11H3v-11Zm6.5 0h3.8v1.5h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1v5.45h-4v-4.83c0-1.15-.02-2.63-1.6-2.63-1.6 0-1.85 1.25-1.85 2.55v4.91h-4v-11Z" />
    </svg>
  );
}

/** In place for the design; wired up with shareable links in the next phase. */
export function ShareBar() {
  const t = getMessages();
  const actions: { label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
    { label: t.share.copyLink, Icon: LinkIcon },
    { label: t.share.linkedin, Icon: LinkedInLogo },
    { label: t.share.x, Icon: XLogo },
    { label: t.share.image, Icon: DownloadIcon },
    { label: t.share.badge, Icon: BadgeIcon },
  ];

  return (
    <section aria-labelledby="share-title" className="border border-line bg-ash/70 p-4 sm:p-5">
      <h2 id="share-title" className="font-mono text-[11px] tracking-[0.2em] text-dim uppercase">
        {t.share.title}
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {actions.map(({ label, Icon }, i) => (
          <button
            key={label}
            type="button"
            aria-disabled
            aria-describedby="share-soon"
            className={`inline-flex cursor-not-allowed items-center justify-center gap-2 border border-line-strong px-3 py-2.5 font-mono text-xs font-semibold tracking-wider text-fog uppercase opacity-70 ${
              i === 0 ? "col-span-2 sm:col-span-1" : ""
            }`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>
      <p id="share-soon" className="mt-3 font-mono text-xs text-dim">
        {t.share.soon}
      </p>
    </section>
  );
}
