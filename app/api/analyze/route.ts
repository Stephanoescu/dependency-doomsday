import { z } from "zod";
import type { AnalysisEvent } from "@/lib/analysis/types";
import { isValidPackageName } from "@/lib/input/package-json";
import { MAX_PACKAGES } from "@/lib/input/types";
import { analyzePackages } from "@/lib/server/analyze";

export const maxDuration = 60;

const MAX_BODY_BYTES = 64 * 1024;

const bodySchema = z.object({
  packages: z
    .array(
      z.object({
        name: z.string().max(214).refine(isValidPackageName),
        field: z.enum(["dependencies", "devDependencies"]),
        alias: z.string().max(214).optional(),
      }),
    )
    .min(1)
    .max(MAX_PACKAGES),
});

const NDJSON_HEADERS = {
  "Content-Type": "application/x-ndjson; charset=utf-8",
  "Cache-Control": "no-store",
  // Keep proxies from buffering the progress lines.
  "X-Accel-Buffering": "no",
};

function line(event: AnalysisEvent): string {
  return `${JSON.stringify(event)}\n`;
}

/**
 * Receives package names only and streams NDJSON:
 * { type: "start" } → { type: "progress" }… → { type: "result" } (or "error").
 */
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return new Response(line({ type: "error", error: "bad-request" }), { status: 413, headers: NDJSON_HEADERS });
  }
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    json = null;
  }
  const body = bodySchema.safeParse(json);
  if (!body.success) {
    return new Response(line({ type: "error", error: "bad-request" }), { status: 400, headers: NDJSON_HEADERS });
  }

  const seen = new Set<string>();
  const packages = body.data.packages.filter((p) => !seen.has(p.name) && seen.add(p.name));

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AnalysisEvent) => {
        if (!request.signal.aborted) controller.enqueue(encoder.encode(line(event)));
      };
      send({ type: "start", total: packages.length });
      try {
        const result = await analyzePackages(packages, {
          signal: request.signal,
          onProgress: (done, total, name) => send({ type: "progress", done, total, name }),
        });
        send({ type: "result", result });
      } catch (error) {
        console.error("[analyze] failed:", error);
        send({ type: "error", error: "internal" });
      } finally {
        try {
          controller.close();
        } catch {
          // Client already went away.
        }
      }
    },
  });

  return new Response(stream, { headers: NDJSON_HEADERS });
}
