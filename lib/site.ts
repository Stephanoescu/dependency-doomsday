/** Where the code lives. */
export const REPO_URL = "https://github.com/Stephanoescu/dependency-doomsday";

/**
 * Public origin for absolute URLs in metadata (Open Graph, Twitter cards).
 * NEXT_PUBLIC_SITE_URL wins; on Vercel the production domain is used; locally, localhost.
 * In the browser, prefer window.location.origin.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
