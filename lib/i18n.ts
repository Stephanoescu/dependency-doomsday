import { en } from "@/messages/en";

/**
 * All UI copy lives in /messages/<locale>.ts. Messages are plain, serializable
 * data (no functions) so they can later move to JSON or be passed from server
 * to client components. To add a language, create messages/es.ts typed as
 * `Messages` and register it below.
 */
export type Messages = typeof en;
export type Locale = "en";
export const defaultLocale: Locale = "en";

const dictionaries: Record<Locale, Messages> = { en };

export function getMessages(locale: Locale = defaultLocale): Messages {
  return dictionaries[locale];
}

export type Plural = { one: string; other: string };

/** Replaces {placeholders} in a message. */
export function fmt(template: string, values: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/** Picks the plural form for `count` and fills in {count} plus any other values. */
export function plural(
  forms: Plural,
  count: number,
  values: Record<string, string | number> = {},
  locale: Locale = defaultLocale,
): string {
  const category = new Intl.PluralRules(locale).select(count);
  return fmt(category === "one" ? forms.one : forms.other, {
    count: count.toLocaleString(locale),
    ...values,
  });
}
