import type { GitHubRef } from "./types";

/** Picks the most likely folder for packages from workspace globs ("packages/*" -> "packages"). */
export function workspaceDir(workspaces: string[]): string {
  const dirs = workspaces
    .filter((w) => w.includes("*"))
    .map((w) => w.slice(0, w.indexOf("*")).replace(/^\.?\/+|\/+$/g, ""))
    .filter(Boolean);
  return dirs.find((d) => d === "packages" || d.startsWith("packages/")) ?? dirs[0] ?? "packages";
}

const MAX_CANDIDATES = 6;

/**
 * Folders likely to hold the repo's main package, most likely first: names
 * guessed from the repo and its owner (vercel/next.js → packages/next,
 * sveltejs/svelte → packages/svelte, babel/babel → packages/babel-core), then
 * workspaces listed by path inside the same folder. Paths elsewhere are
 * skipped: repos list docs, tests and fixtures that way.
 */
export function workspaceCandidates(workspaces: string[], { owner, repo }: Pick<GitHubRef, "owner" | "repo">): string[] {
  const dir = workspaceDir(workspaces);
  const explicit = workspaces
    .filter((w) => !w.includes("*") && !w.startsWith("!"))
    .map((w) => w.replace(/^\.?\/+|\/+$/g, ""))
    .filter((w) => w.startsWith(`${dir}/`));
  const bare = (name: string) => name.toLowerCase().replace(/\.?js$/, "");
  const names = [repo.toLowerCase(), bare(repo), bare(owner), `${bare(repo)}-core`, "core"].filter(Boolean);
  return [...new Set([...names.map((name) => `${dir}/${name}`), ...explicit])].slice(0, MAX_CANDIDATES);
}

/**
 * Example URL for the monorepo hint. With a known package folder it's ready to
 * analyze; otherwise it ends in "/" so the user can type the package name.
 * Uses the real repo when known. HEAD makes GitHub resolve the default branch.
 */
export function monorepoExampleUrl(workspaces: string[], ref?: GitHubRef, example?: string): string {
  const base = ref
    ? `https://github.com/${ref.owner}/${ref.repo}`
    : "https://github.com/your-org/your-repo";
  return `${base}/tree/${ref?.ref ?? "HEAD"}/${example ?? `${workspaceDir(workspaces)}/`}`;
}

/** The workspace folder `path` points at itself ("packages" for "packages/*"), if any. */
export function workspaceFolderOf(path: string, workspaces: string[]): string | undefined {
  const folder = path.replace(/^\/+|\/+$/g, "");
  return workspaces.some((w) => w.replace(/^\.?\/+/, "").replace(/\/\*\*?$/, "") === folder) ? folder : undefined;
}
