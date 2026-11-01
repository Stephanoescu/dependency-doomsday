import validateNpmPackageName from "validate-npm-package-name";
import {
  MAX_INPUT_BYTES,
  MAX_PACKAGES,
  MONOREPO_DEPENDENCY_THRESHOLD,
  type Dependency,
  type DependencyField,
  type MonorepoInfo,
  type ParseResult,
  type SkipReason,
  type SkippedDependency,
} from "./types";

export interface ParseOptions {
  includeDev?: boolean;
  /** Globs from pnpm-workspace.yaml / lerna.json, used when package.json has no "workspaces". */
  externalWorkspaces?: string[];
}

type SpecClass = { kind: "registry"; target?: string } | { kind: "skip"; reason: SkipReason };

const PACKAGE_JSON_KEYS = [
  "name",
  "version",
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "scripts",
  "workspaces",
  "private",
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Old-style names (e.g. "JSONStream") are still valid registry packages. */
export function isValidPackageName(name: string): boolean {
  return validateNpmPackageName(name).validForOldPackages;
}

/**
 * Classifies a dependency version spec. Only specs that resolve to the npm
 * registry are analyzed; everything else is reported as skipped.
 */
export function classifySpec(spec: unknown): SpecClass {
  if (typeof spec !== "string") return { kind: "skip", reason: "invalid-spec" };
  const s = spec.trim();

  if (s.startsWith("npm:")) {
    const rest = s.slice(4);
    // "@scope/name@range" -> the version separator is the second "@".
    const at = rest.indexOf("@", rest.startsWith("@") ? 1 : 0);
    const target = at === -1 ? rest : rest.slice(0, at);
    return isValidPackageName(target)
      ? { kind: "registry", target }
      : { kind: "skip", reason: "invalid-spec" };
  }
  if (s.startsWith("workspace:")) return { kind: "skip", reason: "workspace" };
  if (/^(file|link|portal):/.test(s) || /^(\.{1,2}\/|\/|~\/)/.test(s)) {
    return { kind: "skip", reason: "local" };
  }
  if (/^(git\+|git:|git@|github:|gitlab:|bitbucket:|gist:)/.test(s)) {
    return { kind: "skip", reason: "git" };
  }
  if (/^https?:\/\//.test(s)) return { kind: "skip", reason: "url" };
  if (s.startsWith("jsr:")) return { kind: "skip", reason: "other-registry" };
  // Semver ranges and dist-tags never contain "/", so "owner/repo" is GitHub shorthand.
  if (s.includes("/")) return { kind: "skip", reason: "git" };

  // Ranges, dist-tags, "catalog:" (pnpm), "patch:" (yarn) and "" all come from the registry.
  return { kind: "registry" };
}

function readWorkspaces(pkg: Record<string, unknown>): string[] | undefined {
  const ws = pkg.workspaces;
  const list = Array.isArray(ws) ? ws : isPlainObject(ws) ? ws.packages : undefined;
  if (!Array.isArray(list)) return undefined;
  return list.filter((w): w is string => typeof w === "string");
}

function readDependencyMap(pkg: Record<string, unknown>, field: DependencyField) {
  const map = pkg[field];
  return isPlainObject(map) ? map : {};
}

/**
 * Turns raw package.json text into the list of registry packages to analyze.
 * Runs identically in the browser and on the server; never throws.
 */
export function parsePackageJson(text: string, options: ParseOptions = {}): ParseResult {
  const trimmed = text.replace(/^﻿/, "").trim();
  if (!trimmed) return { ok: false, error: "empty" };
  if (new TextEncoder().encode(trimmed).length > MAX_INPUT_BYTES) {
    return { ok: false, error: "too-large" };
  }

  let pkg: unknown;
  try {
    pkg = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: "invalid-json" };
  }
  if (!isPlainObject(pkg) || !PACKAGE_JSON_KEYS.some((key) => key in pkg)) {
    return { ok: false, error: "not-package-json" };
  }

  const runtimeDeps = readDependencyMap(pkg, "dependencies");
  const workspaces = readWorkspaces(pkg) ?? options.externalWorkspaces;
  const monorepo: MonorepoInfo | undefined =
    workspaces && Object.keys(runtimeDeps).length < MONOREPO_DEPENDENCY_THRESHOLD
      ? { workspaces }
      : undefined;

  const fields: DependencyField[] = options.includeDev
    ? ["dependencies", "devDependencies"]
    : ["dependencies"];

  const packages: Dependency[] = [];
  const skipped: SkippedDependency[] = [];
  const seen = new Set<string>();

  for (const field of fields) {
    for (const [key, spec] of Object.entries(readDependencyMap(pkg, field))) {
      const cls = classifySpec(spec);
      if (cls.kind === "skip") {
        skipped.push({ name: key, field, reason: cls.reason });
        continue;
      }
      const name = cls.target ?? key;
      if (!cls.target && !isValidPackageName(name)) {
        skipped.push({ name: key, field, reason: "invalid-name" });
        continue;
      }
      // A package listed in both fields is analyzed once, as a runtime dependency.
      if (seen.has(name)) continue;
      seen.add(name);
      packages.push(name === key ? { name, field } : { name, field, alias: key });
    }
  }

  if (packages.length === 0) {
    return { ok: false, error: "no-dependencies", ...(monorepo && { monorepo }) };
  }

  const projectName = typeof pkg.name === "string" && pkg.name.trim() ? pkg.name.trim() : undefined;
  return {
    ok: true,
    ...(projectName && { projectName }),
    packages: packages.slice(0, MAX_PACKAGES),
    skipped,
    truncated: Math.max(0, packages.length - MAX_PACKAGES),
    ...(monorepo && { monorepo }),
  };
}
