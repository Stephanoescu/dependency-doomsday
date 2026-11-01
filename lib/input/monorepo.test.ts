import { describe, expect, it } from "vitest";
import { monorepoExampleUrl, workspaceDir } from "./monorepo";

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
