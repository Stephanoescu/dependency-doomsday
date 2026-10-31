import { z } from "zod";
import { formatGitHubRef, looksLikeOtherHostUrl, parseGitHubRef } from "@/lib/input/github-url";
import { parsePackageJson } from "@/lib/input/package-json";
import type { InputErrorCode, ResolveResponse } from "@/lib/input/types";
import { fetchPackageJsonFromGitHub } from "@/lib/server/github";

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
  "github-rate-limited": 429,
  "github-timeout": 504,
  "github-unavailable": 502,
  "too-large": 413,
};

function reply(body: ResolveResponse) {
  const status = body.ok ? 200 : (STATUS[body.error] ?? 422);
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Reads package.json from a public GitHub repo and returns only the list of
 * package names — the file itself is never sent back or stored.
 */
export async function POST(request: Request) {
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
    return reply({
      ok: false,
      error: fetched.error,
      ref,
      ...(fetched.error === "package-json-not-found" && {
        location: `${formatGitHubRef(ref)}/package.json`,
      }),
    });
  }

  return reply({ ...parsePackageJson(fetched.text, { includeDev: body.data.includeDev }), ref });
}
