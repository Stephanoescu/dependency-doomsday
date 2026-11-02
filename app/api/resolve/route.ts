import { z } from "zod";
import { formatGitHubRef, looksLikeOtherHostUrl, parseGitHubRef } from "@/lib/input/github-url";
import { parsePackageJson } from "@/lib/input/package-json";
import {
  MONOREPO_DEPENDENCY_THRESHOLD,
  type InputErrorCode,
  type ParseResult,
  type ResolveResponse,
} from "@/lib/input/types";
import { workspaceFolderOf } from "@/lib/input/monorepo";
import {
  fetchExternalWorkspaces,
  fetchPackageJsonFromGitHub,
  fetchRootWorkspaces,
  findWorkspacePackage,
} from "@/lib/server/github";
import { clientIp, rateLimit, rateLimitHeaders } from "@/lib/server/rate-limit";

const MAX_BODY_BYTES = 8 * 1024;

const bodySchema = z.object({
  input: z.string().trim().min(1).max(2048),
  includeDev: z.boolean().optional().default(false),
});

const STATUS: Partial<Record<InputErrorCode, number>> = {
  "bad-request": 400,
  unrecognized: 400,
  "unsupported-host": 400,
  "repo-not-found": 404,
  "package-json-not-found": 404,
  "workspace-folder": 404,
  "github-rate-limited": 429,
  "rate-limited": 429,
  "github-timeout": 504,
  "github-unavailable": 502,
  "too-large": 413,
};

/** Cheap pre-check so ordinary repos don't pay for two extra file reads. */
function mightBeMonorepoRoot(result: ParseResult): boolean {
  if (result.monorepo) return false;
  if (!result.ok) return result.error === "no-dependencies";
  const runtime = result.packages.filter((p) => p.field === "dependencies").length;
  return runtime < MONOREPO_DEPENDENCY_THRESHOLD;
}

function reply(body: ResolveResponse, headers: Record<string, string> = {}) {
  const status = body.ok ? 200 : (STATUS[body.error] ?? 422);
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

/**
 * Reads package.json from a public GitHub repo and returns only the list of
 * package names — the file itself is never sent back or stored.
 */
export async function POST(request: Request) {
  const limited = await rateLimit("resolve", clientIp(request));
  if (!limited.ok) {
    return reply({ ok: false, error: "rate-limited", retryAfter: limited.retryAfter }, rateLimitHeaders(limited));
  }

  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return reply({ ok: false, error: "bad-request" });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return reply({ ok: false, error: "bad-request" });
  }
  const body = bodySchema.safeParse(json);
  if (!body.success) return reply({ ok: false, error: "bad-request" });

  const ref = parseGitHubRef(body.data.input);
  if (!ref) {
    const error = looksLikeOtherHostUrl(body.data.input) ? "unsupported-host" : "unrecognized";
    return reply({ ok: false, error });
  }

  const fetched = await fetchPackageJsonFromGitHub(ref);
  if (!fetched.ok) {
    // ".../tree/HEAD/packages/" is the folder that holds the packages: ask for one by name.
    if (fetched.error === "package-json-not-found" && ref.path) {
      const workspaces = await fetchRootWorkspaces(ref);
      const folder = workspaces && workspaceFolderOf(ref.path, workspaces);
      if (workspaces && folder) {
        const example = await findWorkspacePackage({ ...ref, path: undefined }, workspaces);
        return reply({ ok: false, error: "workspace-folder", ref, location: folder, ...(example && { example }) });
      }
    }
    return reply({
      ok: false,
      error: fetched.error,
      ref,
      ...(fetched.error === "package-json-not-found" && {
        location: `${formatGitHubRef(ref)}/package.json`,
      }),
    });
  }

  const options = { includeDev: body.data.includeDev };
  let result = parsePackageJson(fetched.text, options);
  // pnpm and Lerna declare workspaces outside package.json; they live at the repo root.
  if (!ref.path && mightBeMonorepoRoot(result)) {
    const externalWorkspaces = await fetchExternalWorkspaces(ref);
    if (externalWorkspaces) result = parsePackageJson(fetched.text, { ...options, externalWorkspaces });
  }
  // Give the monorepo hint a real package to point at, so its example works as is.
  if (!ref.path && result.monorepo) {
    const example = await findWorkspacePackage(ref, result.monorepo.workspaces);
    if (example) result = { ...result, monorepo: { ...result.monorepo, example } };
  }
  return reply({ ...result, ref });
}
