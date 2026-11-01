/**
 * Workspace globs declared outside package.json. Only GitHub inputs can use
 * these, since a pasted package.json comes without its sibling files.
 */

function unquote(value: string): string {
  return value.trim().replace(/^(['"])(.*)\1$/, "$2").trim();
}

/** Reads the `packages:` list of a pnpm-workspace.yaml. Exclusions ("!…") are dropped. */
export function parsePnpmWorkspaceYaml(yaml: string): string[] {
  const globs: string[] = [];
  let inPackages = false;

  for (const line of yaml.split(/\r?\n/)) {
    const key = /^packages\s*:\s*(.*)$/.exec(line);
    if (key) {
      // Flow style: packages: ['packages/*', 'apps/*']
      const flow = /^\[(.*)\]/.exec(key[1].trim());
      if (flow) globs.push(...flow[1].split(",").map(unquote));
      inPackages = !flow;
      continue;
    }
    if (!inPackages || /^\s*(#.*)?$/.test(line)) continue;

    const item = /^\s*-\s*(.+?)\s*(#.*)?$/.exec(line);
    if (item) globs.push(unquote(item[1]));
    else if (/^\S/.test(line)) inPackages = false; // next top-level key
  }
  return globs.filter((g) => g && !g.startsWith("!"));
}

/** Reads lerna.json `packages`, falling back to Lerna's default of ["packages/*"]. */
export function parseLernaJson(text: string): string[] | undefined {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (typeof json !== "object" || json === null || Array.isArray(json)) return undefined;
  const packages = (json as { packages?: unknown }).packages;
  if (!Array.isArray(packages)) return ["packages/*"];
  return packages.filter((p): p is string => typeof p === "string" && !p.startsWith("!"));
}
