import { looksLikeOtherHostUrl, parseGitHubRef } from "./github-url";
import type { GitHubRef, InputErrorCode } from "./types";

export type DetectedInput =
  | { kind: "package-json"; text: string }
  | { kind: "github"; ref: GitHubRef }
  | { kind: "invalid"; error: InputErrorCode };

/** Decides whether the user pasted package.json contents or a GitHub reference. */
export function detectInput(raw: string): DetectedInput {
  const text = raw.replace(/^﻿/, "").trim();
  if (!text) return { kind: "invalid", error: "empty" };
  // Anything that starts like JSON is treated as JSON so syntax errors are reported as such.
  if (text.startsWith("{") || text.startsWith("[")) return { kind: "package-json", text };

  const ref = parseGitHubRef(text);
  if (ref) return { kind: "github", ref };
  if (looksLikeOtherHostUrl(text)) return { kind: "invalid", error: "unsupported-host" };
  return { kind: "invalid", error: "unrecognized" };
}
