import { describe, expect, it } from "vitest";
import { monorepoExampleUrl, workspaceCandidates, workspaceDir, workspaceFolderOf } from "./monorepo";

describe("workspaceDir", () => {
  it("prefers a packages/ glob", () => {
    expect(workspaceDir(["codemods/*", "packages/*", "test/esm"])).toBe("packages");
  });

  it("falls back to the first glob", () => {
    expect(workspaceDir(["apps/*", "libs/*"])).toBe("apps");
    expect(workspaceDir(["./modules/**"])).toBe("modules");
  });

  it("defaults to packages when no glob is usable", () => {
    expect(workspaceDir([])).toBe("packages");
    expect(workspaceDir(["docs", "*"])).toBe("packages");
  });
});

describe("monorepoExampleUrl", () => {
  it("uses the real repo and branch when known", () => {
    expect(monorepoExampleUrl(["packages/*"], { owner: "babel", repo: "babel" })).toBe(
      "https://github.com/babel/babel/tree/HEAD/packages/",
    );
    expect(
      monorepoExampleUrl(["apps/*"], { owner: "acme", repo: "mono", ref: "develop" }),
    ).toBe("https://github.com/acme/mono/tree/develop/apps/");
  });

  it("uses a placeholder repo for pasted package.json files", () => {
    expect(monorepoExampleUrl(["packages/*"])).toBe(
      "https://github.com/your-org/your-repo/tree/HEAD/packages/",
    );
  });
});

describe("monorepoExampleUrl with a known package", () => {
  it("points straight at it, ready to analyze", () => {
    expect(monorepoExampleUrl(["packages/*"], { owner: "vercel", repo: "next.js" }, "packages/next")).toBe(
      "https://github.com/vercel/next.js/tree/HEAD/packages/next",
    );
  });
});

describe("workspaceCandidates", () => {
  it("guesses the main package from the repo and owner names", () => {
    expect(workspaceCandidates(["packages/*"], { owner: "vercel", repo: "next.js" })).toEqual([
      "packages/next.js",
      "packages/next",
      "packages/vercel",
      "packages/next-core",
      "packages/core",
    ]);
    expect(workspaceCandidates(["packages/*"], { owner: "sveltejs", repo: "svelte" }).slice(0, 2)).toEqual([
      "packages/svelte",
      "packages/svelte-core",
    ]);
    expect(workspaceCandidates(["packages/*"], { owner: "babel", repo: "babel" })).toContain("packages/babel-core");
  });

  it("then tries workspaces listed by path in the same folder, never docs or tests elsewhere", () => {
    expect(
      workspaceCandidates(["packages/*", "packages/web", "docs", "test/esm", "!packages/old"], { owner: "a", repo: "b" }),
    ).toEqual(["packages/b", "packages/a", "packages/b-core", "packages/core", "packages/web"]);
  });

  it("asks for at most 6 files", () => {
    expect(workspaceCandidates(["a/x", "b/y", "c/z", "packages/*"], { owner: "o", repo: "r" }).length).toBeLessThanOrEqual(6);
  });
});

describe("workspaceFolderOf", () => {
  it("recognizes a path that is a workspace folder, not a package", () => {
    expect(workspaceFolderOf("packages", ["packages/*"])).toBe("packages");
    expect(workspaceFolderOf("packages/", ["./packages/**"])).toBe("packages");
    expect(workspaceFolderOf("packages/next", ["packages/*"])).toBeUndefined();
    expect(workspaceFolderOf("docs", ["packages/*"])).toBeUndefined();
  });
});
