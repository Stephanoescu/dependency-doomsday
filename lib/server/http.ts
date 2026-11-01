export const USER_AGENT = "dependency-doomsday";

export type JsonResult =
  | { ok: true; status: number; json: unknown; headers: Headers }
  | {
      ok: false;
      reason: "http" | "timeout" | "network" | "aborted" | "parse";
      status?: number;
      headers?: Headers;
      /** Body of an HTTP error, when it was JSON. */
      json?: unknown;
    };

export interface GetJsonOptions {
  headers?: HeadersInit;
  /** Covers the whole exchange, including downloading the body. */
  timeoutMs: number;
  signal?: AbortSignal;
  /** Extra attempts after a network error or a retryable status. */
  retries?: number;
  retryStatuses?: number[];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isAbort(error: unknown, name: string): boolean {
  return error instanceof DOMException && error.name === name;
}

async function attempt(url: string, options: GetJsonOptions): Promise<JsonResult> {
  const timeout = AbortSignal.timeout(options.timeoutMs);
  const signal = options.signal ? AbortSignal.any([timeout, options.signal]) : timeout;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...options.headers },
      signal,
      cache: "no-store",
    });
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      if (timeout.aborted) return { ok: false, reason: "timeout" };
      if (options.signal?.aborted) return { ok: false, reason: "aborted" };
      if (res.ok) return { ok: false, reason: "parse", status: res.status, headers: res.headers };
      // Error responses often have non-JSON bodies; the status is what matters.
    }
    if (!res.ok) return { ok: false, reason: "http", status: res.status, headers: res.headers, json };
    return { ok: true, status: res.status, json, headers: res.headers };
  } catch (error) {
    if (timeout.aborted || isAbort(error, "TimeoutError")) return { ok: false, reason: "timeout" };
    if (options.signal?.aborted || isAbort(error, "AbortError")) return { ok: false, reason: "aborted" };
    return { ok: false, reason: "network" };
  }
}

/**
 * GET + JSON with a hard timeout (headers and body) and a short retry for
 * transient failures. Timeouts are not retried: a slow multi-MB document
 * would just time out again.
 */
export async function getJson(url: string, options: GetJsonOptions): Promise<JsonResult> {
  const retryStatuses = options.retryStatuses ?? [500, 502, 503, 504];
  let retriesLeft = options.retries ?? 1;
  for (;;) {
    const result = await attempt(url, options);
    const retryable =
      !result.ok &&
      (result.reason === "network" ||
        (result.reason === "http" && retryStatuses.includes(result.status ?? 0)));
    if (!retryable || retriesLeft-- <= 0) return result;
    await sleep(400);
  }
}
