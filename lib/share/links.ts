import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { parseGitHubRef } from "@/lib/input/github-url";
import { isValidPackageName } from "@/lib/input/package-json";
import { MAX_PACKAGES, type Dependency, type GitHubRef } from "@/lib/input/types";

/**
 * Shareable links carry everything needed to recompute a forecast; there is
 * no database. Repos get short readable paths, pasted package.json files a
 * compressed list of package names (nothing else from the file).
 */

export interface SharedList {
  projectName?: string;
  dependencies: string[];
  devDependencies: string[];
}

export type ShareSource =
  | { kind: "repo"; ref: GitHubRef; includeDev: boolean }
  | { kind: "list"; list: SharedList };

const LIST_VERSION = "1";
/** Compressed lists longer than this are rejected before decompressing. */
export const MAX_ENCODED_LIST = 8_000;
const MAX_PROJECT_NAME = 80;

function cleanProjectName(name: string | undefined): string {
  return (name ?? "").replace(/[\r\n,]/g, " ").trim().slice(0, MAX_PROJECT_NAME);
}

export function encodeList({ projectName, dependencies, devDependencies }: SharedList): string {
  const body = [LIST_VERSION, cleanProjectName(projectName), dependencies.join(","), devDependencies.join(",")];
  return compressToEncodedURIComponent(body.join("\n"));
}

/** Returns null for anything malformed. Names are re-validated, deduped and capped at 150. */
export function decodeList(encoded: string | null | undefined): SharedList | null {
  if (!encoded || encoded.length > MAX_ENCODED_LIST) return null;
  let text: string | null;
  try {
    text = decompressFromEncodedURIComponent(encoded);
  } catch {
    return null;
  }
  if (!text) return null;
  const [version, projectName, deps = "", dev = ""] = text.split("\n");
  if (version !== LIST_VERSION) return null;

  const seen = new Set<string>();
  const take = (csv: string) =>
    csv
      .split(",")
      .map((n) => n.trim())
      .filter((n) => n && isValidPackageName(n) && !seen.has(n) && seen.add(n));
  const dependencies = take(deps).slice(0, MAX_PACKAGES);
  const devDependencies = take(dev).slice(0, MAX_PACKAGES - dependencies.length);
  if (dependencies.length + devDependencies.length === 0) return null;

  const name = cleanProjectName(projectName);
  return { ...(name && { projectName: name }), dependencies, devDependencies };
}

export function listDependencies(list: SharedList): Dependency[] {
  return [
    ...list.dependencies.map((name): Dependency => ({ name, field: "dependencies" })),
    ...list.devDependencies.map((name): Dependency => ({ name, field: "devDependencies" })),
  ];
}

/** /r/github/owner/repo[/tree/<ref>/<path>][?dev=1] or /list?d=<lz>. */
export function sharePath(source: ShareSource): string {
  if (source.kind === "list") return `/list?d=${encodeList(source.list)}`;
  const { owner, repo, ref, path } = source.ref;
  const segments = [owner, repo];
  if (ref || path) segments.push("tree", ref ?? "HEAD", ...(path ? path.split("/") : []));
  return `/r/github/${segments.map(encodeURIComponent).join("/")}${source.includeDev ? "?dev=1" : ""}`;
}

/** Route params of /r/github/[owner]/[repo]/[[...rest]] back to a source. */
export function repoSourceFromRoute(
  owner: string,
  repo: string,
  rest: string[] | undefined,
  dev: string | string[] | undefined,
): ShareSource | null {
  const ref = parseGitHubRef(`github.com/${[owner, repo, ...(rest ?? [])].join("/")}`);
  return ref ? { kind: "repo", ref, includeDev: dev === "1" } : null;
}

/** Query parameters for /api/og and /api/badge. */
export function sourceParams(source: ShareSource): URLSearchParams {
  const params = new URLSearchParams();
  if (source.kind === "list") {
    params.set("d", encodeList(source.list));
    return params;
  }
  const { owner, repo, ref, path } = source.ref;
  params.set("repo", `${owner}/${repo}`);
  if (ref) params.set("ref", ref);
  if (path) params.set("path", path);
  if (source.includeDev) params.set("dev", "1");
  return params;
}

export function sourceFromParams(params: URLSearchParams): ShareSource | null {
  const d = params.get("d");
  if (d) {
    const list = decodeList(d);
    return list ? { kind: "list", list } : null;
  }
  const repo = params.get("repo");
  if (!repo) return null;
  const ref = params.get("ref");
  const path = params.get("path");
  const tree = ref || path ? `/tree/${encodeURIComponent(ref ?? "HEAD")}${path ? `/${path}` : ""}` : "";
  const parsed = parseGitHubRef(`github.com/${repo}${tree}`);
  if (!parsed || `${parsed.owner}/${parsed.repo}`.toLowerCase() !== repo.toLowerCase()) return null;
  return { kind: "repo", ref: parsed, includeDev: params.get("dev") === "1" };
}

export function ogImagePath(source: ShareSource, format: "wide" | "story" = "wide"): string {
  const params = sourceParams(source);
  if (format === "story") params.set("format", "story");
  return `/api/og?${params}`;
}

export function badgePath(ref: GitHubRef): string {
  return `/api/badge?${sourceParams({ kind: "repo", ref, includeDev: false })}`;
}

/** "expressjs/express", "vercel/next.js/packages/next" or the list's project name. */
export function sourceLabel(source: ShareSource): string | undefined {
  if (source.kind === "list") return source.list.projectName;
  const { owner, repo, path } = source.ref;
  return `${owner}/${repo}${path ? `/${path}` : ""}`;
}

/** File-name friendly label for downloads. */
export function sourceSlug(source: ShareSource): string {
  const label = sourceLabel(source) ?? "project";
  return label.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "project";
}
