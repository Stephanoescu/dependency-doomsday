"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode, type SVGProps } from "react";
import { BadgeIcon, CheckIcon, DownloadIcon, LinkIcon, Spinner } from "@/components/icons";
import { getMessages, plural } from "@/lib/i18n";
import type { Forecast, ScoredPackage } from "@/lib/risk";
import { badgePath, ogImagePath, sourceSlug, type ShareSource } from "@/lib/share/links";
import { badgeMarkdown, shareTexts } from "@/lib/share/texts";

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

function ShareIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M12 3v13M7 8l5-5 5 5" />
      <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </svg>
  );
}

const buttonClass =
  "inline-flex items-center justify-center gap-2 border border-line-strong px-3 py-2.5 font-mono text-xs font-semibold tracking-wider text-bone uppercase transition-colors hover:border-amber hover:text-amber disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line-strong disabled:hover:text-bone";

function Action({
  label,
  Icon,
  onClick,
  href,
  disabled,
  describedBy,
  className = "",
  children,
}: {
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  describedBy?: string;
  className?: string;
  children?: ReactNode;
}) {
  const content = (
    <>
      <Icon className="size-4" />
      {children ?? label}
    </>
  );
  if (href && !disabled) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={`${buttonClass} ${className}`}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-describedby={describedBy} className={`${buttonClass} ${className}`}>
      {content}
    </button>
  );
}

type ImageFormat = "wide" | "story";

interface Props {
  source: ShareSource;
  path: string;
  packages: ScoredPackage[];
  forecast: Forecast;
}

export function ShareBar({ source, path, packages, forecast }: Props) {
  const t = getMessages();
  const s = t.share;
  const [origin, setOrigin] = useState("");
  const [feedback, setFeedback] = useState("");
  const [copied, setCopied] = useState<"link" | "badge" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [rendering, setRendering] = useState<ImageFormat | null>(null);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Browser-only values, read after mount.
    const id = requestAnimationFrame(() => {
      setOrigin(window.location.origin);
      setCanNativeShare(typeof navigator.share === "function");
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menuOpen]);

  const url = `${origin}${path}`;
  const texts = useMemo(() => shareTexts(packages, forecast, url, t), [packages, forecast, url, t]);
  const excluded = source.kind === "list" ? packages.filter((p) => p.npmStatus === "not-found").length : 0;

  function flash(kind: "link" | "badge", message: string) {
    setCopied(kind);
    setFeedback(message);
    setTimeout(() => setCopied((c) => (c === kind ? null : c)), 2_000);
  }

  async function copy(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  async function copyLink() {
    if (await copy(url)) flash("link", s.copied);
  }

  async function copyBadge() {
    if (source.kind !== "repo") return;
    const markdown = badgeMarkdown(`${origin}${badgePath(source.ref)}`, url);
    if (await copy(markdown)) flash("badge", s.badgeCopied);
  }

  async function shareLinkedIn() {
    // LinkedIn can't prefill text: copy the post, then open the share dialog.
    const ok = await copy(texts.linkedin);
    window.open(texts.linkedinShareUrl, "_blank", "noopener,noreferrer");
    if (ok) setFeedback(s.linkedinCopied);
  }

  async function shareNative() {
    try {
      await navigator.share({ title: t.brand.name, text: texts.x, url });
    } catch {
      // Dismissed.
    }
  }

  async function download(format: ImageFormat) {
    setMenuOpen(false);
    setRendering(format);
    setFeedback(s.imageWorking);
    try {
      const res = await fetch(`${ogImagePath(source, format)}&download=1`);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `doomsday-${sourceSlug(source)}-${format === "story" ? "story" : "1200x630"}.png`;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 10_000);
      setFeedback("");
    } catch {
      setFeedback(s.imageFailed);
    } finally {
      setRendering(null);
    }
  }

  return (
    <section aria-labelledby="share-title" className="border border-line bg-ash/70 p-4 sm:p-5">
      <h2 id="share-title" className="font-mono text-[11px] tracking-[0.2em] text-dim uppercase">
        {s.title}
      </h2>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <Action label={s.copyLink} Icon={copied === "link" ? CheckIcon : LinkIcon} onClick={copyLink} disabled={!origin} className="col-span-2 sm:col-span-1">
          {copied === "link" ? s.copied : s.copyLink}
        </Action>
        {canNativeShare && <Action label={s.native} Icon={ShareIcon} onClick={shareNative} className="col-span-2 sm:col-span-1" />}
        <Action label={s.x} Icon={XLogo} href={origin ? texts.xIntentUrl : undefined} disabled={!origin} />
        <Action label={s.linkedin} Icon={LinkedInLogo} onClick={shareLinkedIn} disabled={!origin} />

        <div ref={menuRef} className="relative">
          <button
            type="button"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            aria-controls="image-menu"
            disabled={rendering !== null}
            onClick={() => setMenuOpen((o) => !o)}
            className={`${buttonClass} w-full`}
          >
            {rendering ? <Spinner className="size-4" /> : <DownloadIcon className="size-4" />}
            {rendering ? s.imageWorking : s.image}
          </button>
          {menuOpen && (
            <div
              id="image-menu"
              className="absolute bottom-full left-0 z-20 mb-2 w-64 border border-line-strong bg-ash-2 p-1 shadow-[0_20px_60px_-20px_rgb(0_0_0/0.8)] sm:top-full sm:bottom-auto sm:mt-2 sm:mb-0"
            >
              {(
                [
                  ["wide", s.imageWide, s.imageWideHint],
                  ["story", s.imageStory, s.imageStoryHint],
                ] as const
              ).map(([format, label, hint]) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => void download(format)}
                  className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-line focus-visible:bg-line"
                >
                  <span className="font-mono text-xs font-semibold text-bone">{label}</span>
                  <span className="font-mono text-[11px] text-dim">{hint}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <Action
          label={s.badge}
          Icon={copied === "badge" ? CheckIcon : BadgeIcon}
          onClick={copyBadge}
          disabled={source.kind !== "repo" || !origin}
          describedBy={source.kind !== "repo" ? "badge-note" : undefined}
        />
      </div>

      <div className="mt-3 space-y-1 font-mono text-xs text-dim">
        {source.kind === "list" && <p>{s.listPrivacy}</p>}
        {excluded > 0 && <p className="text-amber">{plural(s.excluded, excluded)}</p>}
        {source.kind !== "repo" && <p id="badge-note">{s.badgeReposOnly}</p>}
        <p role="status" className="min-h-4 text-fog">
          {feedback}
        </p>
      </div>
    </section>
  );
}
