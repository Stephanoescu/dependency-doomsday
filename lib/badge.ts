import type { RiskLevel } from "@/lib/risk";

/** Approximate Verdana 11px advance widths, as used by shields.io-style badges. */
const WIDTHS: Record<string, number> = {
  a: 6.7, b: 6.9, c: 5.8, d: 6.9, e: 6.6, f: 3.9, g: 6.9, h: 7.0, i: 3.0, j: 3.8, k: 6.5, l: 3.0, m: 10.7,
  n: 7.0, o: 6.7, p: 6.9, q: 6.9, r: 4.7, s: 5.7, t: 4.3, u: 7.0, v: 6.5, w: 9.0, x: 6.5, y: 6.5, z: 5.8,
  "0": 7.0, "1": 7.0, "2": 7.0, "3": 7.0, "4": 7.0, "5": 7.0, "6": 7.0, "7": 7.0, "8": 7.0, "9": 7.0,
  "/": 4.9, ".": 3.9, ",": 3.9, " ": 3.9, "?": 5.9, "-": 4.9, "…": 11.0,
};
const DEFAULT_WIDTH = 7.5;
const PADDING = 6;

export function textWidth(text: string): number {
  let width = 0;
  for (const ch of text) width += WIDTHS[ch] ?? WIDTHS[ch.toLowerCase()] ?? DEFAULT_WIDTH;
  return Math.round(width * 10) / 10;
}

/** Darker than the site's risk colors so white text stays readable. */
export const BADGE_COLORS: Record<RiskLevel | "neutral", string> = {
  low: "#2a9d5c",
  mid: "#b98900",
  high: "#d6352b",
  neutral: "#8a8a8a",
};

function escapeXml(text: string): string {
  return text.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);
}

/** Flat shields-style badge: "doomsday | 82/100". */
export function badgeSvg(message: string, color: string, label = "doomsday"): string {
  const lw = Math.round(textWidth(label) + PADDING * 2);
  const rw = Math.round(textWidth(message) + PADDING * 2);
  const w = lw + rw;
  const l = escapeXml(label);
  const m = escapeXml(message);
  const lx = lw / 2;
  const rx = lw + rw / 2;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="${l}: ${m}">`,
    `<title>${l}: ${m}</title>`,
    `<linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>`,
    `<clipPath id="r"><rect width="${w}" height="20" rx="3" fill="#fff"/></clipPath>`,
    `<g clip-path="url(#r)"><rect width="${lw}" height="20" fill="#555"/><rect x="${lw}" width="${rw}" height="20" fill="${color}"/><rect width="${w}" height="20" fill="url(#s)"/></g>`,
    `<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">`,
    `<text x="${lx}" y="15" fill="#010101" fill-opacity=".3">${l}</text><text x="${lx}" y="14">${l}</text>`,
    `<text x="${rx}" y="15" fill="#010101" fill-opacity=".3">${m}</text><text x="${rx}" y="14">${m}</text>`,
    `</g></svg>`,
  ].join("");
}
