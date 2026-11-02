import { after } from "next/server";
import { advanceRanking } from "@/lib/server/ranking";

/** The longest a Vercel Hobby function may run (with or without Fluid compute). */
export const maxDuration = 60;

/**
 * New waves of projects start only within this budget, leaving room for the last wave
 * to finish. RANKING_BUDGET_MS overrides it (e.g. to exercise the chaining locally).
 */
const BUDGET_MS = Number(process.env.RANKING_BUDGET_MS) || 30_000;

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Without a secret, only non-production may run it. */
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * Daily ranking refresh (see vercel.json). Resumable: progress lives in the
 * cache, and when projects remain the route calls itself once more, so each
 * invocation stays well inside maxDuration.
 */
export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });

  const result = await advanceRanking({ budgetMs: BUDGET_MS });
  const chained = !result.done;
  if (chained) {
    const next = new URL(request.url);
    const authorization = request.headers.get("authorization");
    after(async () => {
      try {
        // Only needs to start the next invocation, not wait for it.
        await fetch(next, {
          headers: authorization ? { authorization } : {},
          signal: AbortSignal.timeout(3_000),
        });
      } catch {
        // Timed out after starting it, or the next daily run picks up the progress.
      }
    });
  }

  console.log(
    `[ranking] processed ${result.processed.join(", ") || "nothing"} in ${result.elapsedMs} ms; ` +
      (result.done ? "snapshot published" : `remaining: ${result.remaining.join(", ")}`),
  );
  return Response.json(
    {
      done: result.done,
      processed: result.processed,
      remaining: result.remaining,
      elapsedMs: result.elapsedMs,
      chained,
      ...(result.snapshot && { failed: result.snapshot.failed, generatedAt: result.snapshot.generatedAt }),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
