import { describe, expect, it } from "vitest";
import { classifySpec, parsePackageJson } from "./package-json";
import { MAX_INPUT_BYTES, MAX_PACKAGES } from "./types";

const pkg = (obj: unknown) => JSON.stringify(obj);

describe("classifySpec", () => {
  it.each([
    ["^1.2.3"],
    ["~4.0.0"],
    [">=1 <3"],
    ["1.0.0 - 2.0.0"],
    ["latest"],
    ["*"],
    [""],
    ["catalog:"],
  ])("treats %j as a registry dependency", (spec) => {
    expect(classifySpec(spec)).toEqual({ kind: "registry" });
  });

  it.each([
    ["workspace:*", "workspace"],
    ["workspace:^1.0.0", "workspace"],
    ["file:../lib", "local"],
    ["link:./pkg", "local"],
    ["portal:../x", "local"],
    ["./vendor/pkg", "local"],
    ["../sibling", "local"],
    ["git+https://github.com/a/b.git", "git"],
    ["git://github.com/a/b.git", "git"],
    ["git@github.com:a/b.git", "git"],
    ["github:a/b", "git"],
    ["gitlab:a/b", "git"],
    ["expressjs/express", "git"],
    ["expressjs/express#v4", "git"],
    ["https://example.com/pkg.tgz", "url"],
    ["jsr:@std/path", "other-registry"],
  ])("skips %j as %s", (spec, reason) => {
    expect(classifySpec(spec)).toEqual({ kind: "skip", reason });
  });

  it("resolves npm: aliases to the real package", () => {
    expect(classifySpec("npm:lodash@^4.17.21")).toEqual({ kind: "registry", target: "lodash" });
    expect(classifySpec("npm:@babel/core@7")).toEqual({ kind: "registry", target: "@babel/core" });
    expect(classifySpec("npm:react")).toEqual({ kind: "registry", target: "react" });
  });

  it("rejects non-string and broken alias specs", () => {
    expect(classifySpec(42)).toEqual({ kind: "skip", reason: "invalid-spec" });
    expect(classifySpec(null)).toEqual({ kind: "skip", reason: "invalid-spec" });
    expect(classifySpec("npm:../evil")).toEqual({ kind: "skip", reason: "invalid-spec" });
  });
});

describe("parsePackageJson", () => {
  it("extracts runtime dependencies only by default", () => {
    const result = parsePackageJson(
      pkg({
        name: "my-app",
        dependencies: { react: "^19.0.0", "@tanstack/react-query": "^5" },
        devDependencies: { vitest: "^3" },
      }),
    );
    expect(result).toEqual({
      ok: true,
      projectName: "my-app",
      packages: [
        { name: "react", field: "dependencies" },
        { name: "@tanstack/react-query", field: "dependencies" },
      ],
      skipped: [],
      truncated: 0,
    });
  });

  it("includes devDependencies when asked", () => {
    const result = parsePackageJson(
      pkg({ dependencies: { react: "1" }, devDependencies: { vitest: "1" } }),
      { includeDev: true },
    );
    expect(result.ok && result.packages.map((p) => p.name)).toEqual(["react", "vitest"]);
    expect(result.ok && result.packages[1].field).toBe("devDependencies");
  });

  it("deduplicates packages listed in both fields, keeping the runtime entry", () => {
    const result = parsePackageJson(
      pkg({ dependencies: { react: "1" }, devDependencies: { react: "1", vitest: "1" } }),
      { includeDev: true },
    );
    expect(result.ok && result.packages).toEqual([
      { name: "react", field: "dependencies" },
      { name: "vitest", field: "devDependencies" },
    ]);
  });

  it("deduplicates aliases that resolve to an already listed package", () => {
    const result = parsePackageJson(
      pkg({ dependencies: { lodash: "^4", "lodash-legacy": "npm:lodash@3" } }),
    );
    expect(result.ok && result.packages).toEqual([{ name: "lodash", field: "dependencies" }]);
  });

  it("keeps the alias name for display", () => {
    const result = parsePackageJson(pkg({ dependencies: { "my-react": "npm:react@19" } }));
    expect(result.ok && result.packages).toEqual([
      { name: "react", field: "dependencies", alias: "my-react" },
    ]);
  });

  it("reports skipped dependencies with a reason", () => {
    const result = parsePackageJson(
      pkg({
        dependencies: {
          react: "1",
          "@acme/ui": "workspace:*",
          local: "file:../local",
          forked: "github:me/forked",
          "Bad Name!": "1",
        },
      }),
    );
    expect(result.ok && result.skipped).toEqual([
      { name: "@acme/ui", field: "dependencies", reason: "workspace" },
      { name: "local", field: "dependencies", reason: "local" },
      { name: "forked", field: "dependencies", reason: "git" },
      { name: "Bad Name!", field: "dependencies", reason: "invalid-name" },
    ]);
  });

  it("accepts legacy names with capital letters", () => {
    const result = parsePackageJson(pkg({ dependencies: { JSONStream: "^1.3.5" } }));
    expect(result.ok && result.packages).toEqual([{ name: "JSONStream", field: "dependencies" }]);
  });

  it(`caps the analysis at ${MAX_PACKAGES} packages and reports the rest`, () => {
    const dependencies = Object.fromEntries(
      Array.from({ length: MAX_PACKAGES + 12 }, (_, i) => [`pkg-${i}`, "1.0.0"]),
    );
    const result = parsePackageJson(pkg({ dependencies }));
    expect(result.ok && result.packages).toHaveLength(MAX_PACKAGES);
    expect(result.ok && result.truncated).toBe(12);
  });

  it("strips a UTF-8 BOM and surrounding whitespace", () => {
    const result = parsePackageJson(`﻿\n  ${pkg({ dependencies: { a: "1" } })}  \n`);
    expect(result.ok).toBe(true);
  });

  describe("errors", () => {
    it("rejects empty input", () => {
      expect(parsePackageJson("   ")).toEqual({ ok: false, error: "empty" });
    });

    it("rejects invalid JSON", () => {
      expect(parsePackageJson("{ dependencies: }")).toEqual({ ok: false, error: "invalid-json" });
    });

    it("rejects JSON that is not a package.json", () => {
      expect(parsePackageJson("[1, 2]")).toEqual({ ok: false, error: "not-package-json" });
      expect(parsePackageJson('"hello"')).toEqual({ ok: false, error: "not-package-json" });
      expect(parsePackageJson('{"foo": 1}')).toEqual({ ok: false, error: "not-package-json" });
    });

    it("rejects a package.json without analyzable dependencies", () => {
      expect(parsePackageJson(pkg({ name: "x", devDependencies: { a: "1" } }))).toEqual({
        ok: false,
        error: "no-dependencies",
      });
      expect(parsePackageJson(pkg({ name: "x", dependencies: { a: "workspace:*" } }))).toEqual({
        ok: false,
        error: "no-dependencies",
      });
    });

    it("rejects oversized input", () => {
      const huge = pkg({ name: "x".repeat(MAX_INPUT_BYTES) });
      expect(parsePackageJson(huge)).toEqual({ ok: false, error: "too-large" });
    });
  });

  describe("monorepo detection", () => {
    it("flags a workspace root with fewer than 5 runtime dependencies", () => {
      const result = parsePackageJson(
        pkg({ workspaces: ["packages/*", "apps/*"], dependencies: { a: "1", b: "1" } }),
      );
      expect(result.ok && result.monorepo).toEqual({ workspaces: ["packages/*", "apps/*"] });
    });

    it("supports the yarn object form of workspaces", () => {
      const result = parsePackageJson(
        pkg({ workspaces: { packages: ["packages/*"] }, dependencies: { a: "1" } }),
      );
      expect(result.ok && result.monorepo).toEqual({ workspaces: ["packages/*"] });
    });

    it("does not flag a workspace root with 5 or more runtime dependencies", () => {
      const dependencies = { a: "1", b: "1", c: "1", d: "1", e: "1" };
      const result = parsePackageJson(pkg({ workspaces: ["packages/*"], dependencies }));
      expect(result.ok && result.monorepo).toBeUndefined();
    });

    it("counts runtime dependencies even when devDependencies are included", () => {
      const devDependencies = { a: "1", b: "1", c: "1", d: "1", e: "1", f: "1" };
      const result = parsePackageJson(
        pkg({ workspaces: ["packages/*"], dependencies: { x: "1" }, devDependencies }),
        { includeDev: true },
      );
      expect(result.ok && result.monorepo).toBeDefined();
    });

    it("attaches the hint to the error when the root has no dependencies at all", () => {
      const result = parsePackageJson(
        pkg({ private: true, workspaces: ["packages/*"], devDependencies: { turbo: "1" } }),
      );
      expect(result).toEqual({
        ok: false,
        error: "no-dependencies",
        monorepo: { workspaces: ["packages/*"] },
      });
    });

    it("uses external workspace globs (pnpm, lerna) when package.json has none", () => {
      const result = parsePackageJson(pkg({ name: "root", dependencies: { a: "1" } }), {
        externalWorkspaces: ["packages/*"],
      });
      expect(result.ok && result.monorepo).toEqual({ workspaces: ["packages/*"] });
    });

    it("prefers package.json workspaces over external globs", () => {
      const result = parsePackageJson(pkg({ workspaces: ["apps/*"], dependencies: { a: "1" } }), {
        externalWorkspaces: ["packages/*"],
      });
      expect(result.ok && result.monorepo).toEqual({ workspaces: ["apps/*"] });
    });

    it("does not flag packages without workspaces", () => {
      const result = parsePackageJson(pkg({ dependencies: { a: "1" } }));
      expect(result.ok && result.monorepo).toBeUndefined();
    });
  });
});
