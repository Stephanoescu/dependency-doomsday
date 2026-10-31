import type { GitHubRef } from "./types";

// GitHub usernames: alphanumerics and hyphens, max 39 chars, no leading hyphen.
const OWNER_RE = /^[a-z\d][a-z\d-]{0,38}$/i;
const REPO_RE = /^[\w.-]{1,100}$/;
const SHORTHAND_RE = /^[a-z\d][a-z\d-]{0,38}\/[\w.-]{1,100}(\/(tree|blob)\/.+)?$/i;

function safeDecode(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

/**
 * Parses the many ways people paste a GitHub repo:
 *   https://github.com/owner/repo(.git)
 *   github.com/owner/repo, www.github.com/owner/repo
 *   owner/repo, owner/repo/tree/<branch>/<path>
 *   git@github.com:owner/repo.git
 *   https://github.com/owner/repo/tree/<branch>/<path>
 *   https://github.com/owner/repo/blob/<branch>/<path>/package.json
 *
 * Branch names containing "/" are ambiguous in URLs; the first segment after
 * /tree/ is taken as the branch.
 */
export function parseGitHubRef(input: string): GitHubRef | null {
  let s = input.trim();

  const ssh = /^git@github\.com:(.+)$/i.exec(s);
  if (ssh) {
    s = ssh[1];
  } else {
    s = s.replace(/^(git\+)?https?:\/\//i, "").replace(/^www\./i, "");
    if (/^github\.com\//i.test(s)) {
      s = s.slice("github.com/".length);
    } else if (!SHORTHAND_RE.test(s)) {
      return null;
    }
  }

  s = s.split(/[?#]/)[0];
  const segments = s.split("/").filter(Boolean);
  if (segments.length < 2) return null;

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/i, "");
  if (!OWNER_RE.test(owner) || !REPO_RE.test(repo) || repo === "." || repo === "..") {
    return null;
  }

  const result: GitHubRef = { owner, repo };
  const [kind, rawRef, ...rest] = segments.slice(2);
  if ((kind === "tree" || kind === "blob") && rawRef) {
    const ref = safeDecode(rawRef);
    if (!ref) return null;
    result.ref = ref;

    const pathSegments: string[] = [];
    for (const raw of rest) {
      const seg = safeDecode(raw);
      if (seg === null || seg === "." || seg === ".." || seg.includes("\\")) return null;
      pathSegments.push(seg);
    }
    if (pathSegments.at(-1)?.toLowerCase() === "package.json") pathSegments.pop();
    if (pathSegments.length) result.path = pathSegments.join("/");
  }
  return result;
}

/** True for URLs that point to a code host we don't support (GitLab, Bitbucket, …). */
export function looksLikeOtherHostUrl(input: string): boolean {
  const s = input.trim();
  return /^(https?:\/\/|www\.)/i.test(s) || /^(gitlab\.com|bitbucket\.org|codeberg\.org)\//i.test(s);
}

/** Canonical short form, used in share links: "owner/repo" or "owner/repo/tree/main/packages/x". */
export function formatGitHubRef({ owner, repo, ref, path }: GitHubRef): string {
  const base = `${owner}/${repo}`;
  if (!ref && !path) return base;
  return `${base}/tree/${ref ?? "HEAD"}${path ? `/${path}` : ""}`;
}

export function gitHubWebUrl(ref: GitHubRef): string {
  return `https://github.com/${formatGitHubRef(ref)}`;
}

/** raw.githubusercontent.com does not count against the GitHub API rate limit. */
export function rawPackageJsonUrl({ owner, repo, ref, path }: GitHubRef): string {
  const segments = [owner, repo, ref ?? "HEAD", ...(path ? path.split("/") : []), "package.json"];
  return `https://raw.githubusercontent.com/${segments.map(encodeURIComponent).join("/")}`;
}
