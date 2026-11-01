import { parseGitHubRef } from "@/lib/input/github-url";

export interface RepositoryInfo {
  url: string | null;
  github: { owner: string; repo: string } | null;
}

const NONE: RepositoryInfo = { url: null, github: null };

const SHORTHAND_HOSTS: Record<string, string> = {
  github: "github.com",
  gitlab: "gitlab.com",
  bitbucket: "bitbucket.org",
};

/**
 * Normalizes the many shapes of package.json "repository":
 *   "github:user/repo", "user/repo", "gitlab:user/repo",
 *   { url: "git+https://github.com/user/repo.git" },
 *   "git://github.com/user/repo.git", "git+ssh://git@github.com/user/repo.git",
 *   "git@github.com:user/repo.git"
 */
export function parseRepositoryField(field: unknown): RepositoryInfo {
  const raw =
    typeof field === "string"
      ? field
      : typeof field === "object" && field !== null && "url" in field
        ? (field as { url: unknown }).url
        : undefined;
  if (typeof raw !== "string" || !raw.trim()) return NONE;

  let s = raw.trim().split("#")[0];
  const shorthand = /^(github|gitlab|bitbucket):(.+)$/i.exec(s);
  if (shorthand) {
    s = `https://${SHORTHAND_HOSTS[shorthand[1].toLowerCase()]}/${shorthand[2]}`;
  } else if (/^gist:/i.test(s)) {
    return { url: `https://gist.github.com/${s.slice(5)}`, github: null };
  } else if (/^[\w.-]+\/[\w.-]+$/.test(s)) {
    s = `https://github.com/${s}`;
  } else {
    s = s
      .replace(/^git\+/i, "")
      .replace(/^(git|ssh|git\+ssh):\/\/(git@)?/i, "https://")
      .replace(/^git@([^:/]+):/i, "https://$1/")
      .replace(/^http:\/\//i, "https://");
  }
  s = s.replace(/\.git$/i, "").replace(/\/+$/, "");

  if (!/^https:\/\/[^/\s]+\.[^/\s]+/i.test(s)) return NONE;

  const ref = /^https:\/\/(www\.)?github\.com\//i.test(s) ? parseGitHubRef(s) : null;
  if (ref) {
    return {
      url: `https://github.com/${ref.owner}/${ref.repo}`,
      github: { owner: ref.owner, repo: ref.repo },
    };
  }
  return { url: s, github: null };
}
