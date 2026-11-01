import { after } from "next/server";
import { z } from "zod";
import type { AnalysisEvent } from "@/lib/analysis/types";
import { isValidPackageName } from "@/lib/input/package-json";
import { MAX_PACKAGES } from "@/lib/input/types";
import { analyzePackages } from "@/lib/server/analyze";
import { saveSummary } from "@/lib/server/forecast";
import { clientIp, rateLimit, rateLimitHeaders } from "@/lib/server/rate-limit";

/** Also covers the after() work: the analysis finishes even if the client leaves. 60 s works on Vercel Hobby. */
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
  const limited = await rateLimit("analyze", clientIp(request));
  if (!limited.ok) {
    return new Response(line({ type: "error", error: "rate-limited", retryAfter: limited.retryAfter }), {
      status: 429,
      headers: { ...NDJSON_HEADERS, ...rateLimitHeaders(limited) },
    });
  }

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
  let sendProgress: (done: number, total: number, name: string) => void = () => {};

  // Not tied to the request: if the visitor leaves, the analysis still finishes,
  // filling the cache and the share-image summary for whoever opens the link next.
  const work = analyzePackages(packages, {
    onProgress: (done, total, name) => sendProgress(done, total, name),
  });
  after(async () => {
    try {
      await saveSummary(packages, await work);
    } catch {
      // Already reported to the client; nothing to save.
    }
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AnalysisEvent) => {
        if (request.signal.aborted) return;
        try {
          controller.enqueue(encoder.encode(line(event)));
        } catch {
          // Stream already closed.
        }
      };
      sendProgress = (done, total, name) => send({ type: "progress", done, total, name });
      send({ type: "start", total: packages.length });
      try {
        send({ type: "result", result: await work });
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

  return new Response(stream, { headers: { ...NDJSON_HEADERS, ...rateLimitHeaders(limited) } });
}
