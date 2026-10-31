import type { GitHubRef } from "./types";

/** Picks the most likely folder for packages from workspace globs ("packages/*" -> "packages"). */
export function workspaceDir(workspaces: string[]): string {
  const dirs = workspaces
    .filter((w) => w.includes("*"))
    .map((w) => w.slice(0, w.indexOf("*")).replace(/^\.?\/+|\/+$/g, ""))
    .filter(Boolean);
  return dirs.find((d) => d === "packages" || d.startsWith("packages/")) ?? dirs[0] ?? "packages";
}

/**
 * Example URL for the monorepo hint, ending in "/" so the user can type the package name.
 * Uses the real repo when known; branch defaults to "main".
 */
export function monorepoExampleUrl(workspaces: string[], ref?: GitHubRef): string {
  const base = ref
    ? `https://github.com/${ref.owner}/${ref.repo}`
    : "https://github.com/your-org/your-repo";
  return `${base}/tree/${ref?.ref ?? "main"}/${workspaceDir(workspaces)}/`;
}
