import { defaultLocale, type Locale } from "@/lib/i18n";

/** 12252317 -> "12M", 1234 -> "1.2K". */
export function formatCompact(value: number, locale: Locale = defaultLocale): string {
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/** "3 years ago", "in 25 minutes", "now". Uses the largest whole unit. */
export function formatRelative(iso: string, now: number = Date.now(), locale: Locale = defaultLocale): string {
  const seconds = (Date.parse(iso) - now) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.trunc(seconds / size), unit);
  }
  return rtf.format(0, "minute");
}

/** "7:19 PM" in the reader's time zone. */
export function formatClockTime(iso: string, locale: Locale = defaultLocale): string {
  return new Intl.DateTimeFormat(locale, { timeStyle: "short" }).format(new Date(iso));
}
