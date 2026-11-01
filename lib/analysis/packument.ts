import { parseRepositoryField } from "./repository";
import type { NpmInfo } from "./types";

type Doc = Record<string, unknown>;

function isObject(value: unknown): value is Doc {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isoOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

/**
 * Reduces a full registry document (which can weigh several MB) to the few
 * fields the risk rules need. Only this small object is ever cached.
 */
export function extractNpmInfo(name: string, doc: unknown): NpmInfo {
  const d = isObject(doc) ? doc : {};
  const versions = isObject(d.versions) ? d.versions : {};
  const time = isObject(d.time) ? d.time : {};
  const distTags = isObject(d["dist-tags"]) ? d["dist-tags"] : {};

  const latestVersion = typeof distTags.latest === "string" ? distTags.latest : null;
  const latest = latestVersion && isObject(versions[latestVersion]) ? versions[latestVersion] : null;

  const deprecated =
    latest && typeof latest.deprecated === "string" && latest.deprecated.trim()
      ? latest.deprecated.trim()
      : null;

  const maintainers = Array.isArray(d.maintainers)
    ? [
        ...new Set(
          d.maintainers
            .map((m) => (isObject(m) ? m.name : typeof m === "string" ? m.split(" <")[0] : null))
            .filter((m): m is string => typeof m === "string" && m.length > 0),
        ),
      ]
    : [];

  // Last release = newest publish of any version still listed, so backport releases count.
  let lastPublish = -Infinity;
  for (const version of Object.keys(versions)) {
    const t = typeof time[version] === "string" ? Date.parse(time[version]) : NaN;
    if (t > lastPublish) lastPublish = t;
  }

  const dependencyCount = latest
    ? isObject(latest.dependencies)
      ? Object.keys(latest.dependencies).length
      : 0
    : null;

  const repository = parseRepositoryField(d.repository ?? latest?.repository);

  return {
    name,
    latestVersion,
    deprecated,
    unpublished: !latestVersion && isObject(time.unpublished),
    maintainers,
    lastPublishAt: Number.isFinite(lastPublish) ? new Date(lastPublish).toISOString() : null,
    createdAt: isoOrNull(time.created),
    dependencyCount,
    repositoryUrl: repository.url,
    github: repository.github,
  };
}
