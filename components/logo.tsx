import type { SVGProps } from "react";

/**
 * The mark: a clock three minutes to midnight. The same geometry is used by
 * app/icon.svg, app/apple-icon.tsx and scripts/generate-favicon.mjs.
 */
export function LogoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden {...props}>
      <circle cx="16" cy="16" r="13.5" fill="#111114" stroke="#eeece6" strokeWidth="2.5" />
      <path d="M16 4.6v2.4" stroke="#ff453a" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M16 16 15.7 10.6" stroke="#eeece6" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M16 16 12.9 6.5" stroke="#ff453a" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="16" r="2" fill="#eeece6" />
    </svg>
  );
}
