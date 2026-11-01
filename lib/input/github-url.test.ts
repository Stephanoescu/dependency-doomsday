import { describe, expect, it } from "vitest";
import {
  formatGitHubRef,
  gitHubWebUrl,
  looksLikeOtherHostUrl,
  parseGitHubRef,
  rawFileUrl,
} from "./github-url";

describe("parseGitHubRef", () => {
  it.each([
    "https://github.com/expressjs/express",
    "http://github.com/expressjs/express",
    "https://www.github.com/expressjs/express",
    "github.com/expressjs/express",
    "https://github.com/expressjs/express/",
    "https://github.com/expressjs/express.git",
    "git+https://github.com/expressjs/express.git",
    "git@github.com:expressjs/express.git",
    "expressjs/express",
    "  https://github.com/expressjs/express  ",
    "https://github.com/expressjs/express?tab=readme#install",
    "https://github.com/expressjs/express/issues",
    "HTTPS://GITHUB.COM/expressjs/express",
  ])("parses %j", (input) => {
    expect(parseGitHubRef(input)).toEqual({ owner: "expressjs", repo: "express" });
  });

  it("keeps repo names with dots", () => {
    expect(parseGitHubRef("vercel/next.js")).toEqual({ owner: "vercel", repo: "next.js" });
    expect(parseGitHubRef("https://github.com/vercel/next.js.git")).toEqual({
      owner: "vercel",
      repo: "next.js",
    });
  });

  it("parses /tree/<branch>/<path> for monorepo packages", () => {
    expect(parseGitHubRef("https://github.com/vercel/next.js/tree/canary/packages/next")).toEqual({
      owner: "vercel",
      repo: "next.js",
      ref: "canary",
      path: "packages/next",
    });
  });

  it("accepts HEAD as the branch", () => {
    expect(parseGitHubRef("https://github.com/babel/babel/tree/HEAD/packages/babel-core")).toEqual({
      owner: "babel",
      repo: "babel",
      ref: "HEAD",
      path: "packages/babel-core",
    });
    expect(parseGitHubRef("babel/babel/tree/HEAD/packages/babel-core")?.ref).toBe("HEAD");
  });

  it("parses /tree/<branch> without a path", () => {
    expect(parseGitHubRef("github.com/a/b/tree/v2")).toEqual({ owner: "a", repo: "b", ref: "v2" });
  });

  it("parses /blob/ links to package.json", () => {
    expect(
      parseGitHubRef("https://github.com/babel/babel/blob/main/packages/babel-core/package.json"),
    ).toEqual({ owner: "babel", repo: "babel", ref: "main", path: "packages/babel-core" });
    expect(parseGitHubRef("https://github.com/a/b/blob/main/package.json")).toEqual({
      owner: "a",
      repo: "b",
      ref: "main",
    });
  });

  it.each([
    "",
    "react",
    "@scope/pkg",
    "https://github.com/",
    "https://github.com/onlyowner",
    "https://gitlab.com/a/b",
    "https://github.com/-bad/repo",
    "https://github.com/a/..",
    "https://github.com/a/b/tree/main/../../etc",
    "https://github.com/a/b/tree/main/%E0%A4%A",
    "not a url at all",
    "a/b/c",
  ])("rejects %j", (input) => {
    expect(parseGitHubRef(input)).toBeNull();
  });
});

describe("looksLikeOtherHostUrl", () => {
  it("detects non-GitHub URLs", () => {
    expect(looksLikeOtherHostUrl("https://gitlab.com/a/b")).toBe(true);
    expect(looksLikeOtherHostUrl("gitlab.com/a/b")).toBe(true);
    expect(looksLikeOtherHostUrl("bitbucket.org/a/b")).toBe(true);
    expect(looksLikeOtherHostUrl("react")).toBe(false);
  });
});

describe("formatting", () => {
  it("formats canonical refs", () => {
    expect(formatGitHubRef({ owner: "a", repo: "b" })).toBe("a/b");
    expect(formatGitHubRef({ owner: "a", repo: "b", ref: "main" })).toBe("a/b/tree/main");
    expect(formatGitHubRef({ owner: "a", repo: "b", ref: "main", path: "packages/x" })).toBe(
      "a/b/tree/main/packages/x",
    );
    expect(formatGitHubRef({ owner: "a", repo: "b", path: "packages/x" })).toBe(
      "a/b/tree/HEAD/packages/x",
    );
  });

  it("round-trips through parseGitHubRef", () => {
    const ref = { owner: "vercel", repo: "next.js", ref: "canary", path: "packages/next" };
    expect(parseGitHubRef(formatGitHubRef(ref))).toEqual(ref);
    expect(parseGitHubRef(gitHubWebUrl(ref))).toEqual(ref);
  });

  it("builds raw.githubusercontent.com URLs, defaulting to HEAD", () => {
    expect(rawFileUrl({ owner: "a", repo: "b" })).toBe(
      "https://raw.githubusercontent.com/a/b/HEAD/package.json",
    );
    expect(rawFileUrl({ owner: "a", repo: "b", ref: "dev", path: "packages/x" })).toBe(
      "https://raw.githubusercontent.com/a/b/dev/packages/x/package.json",
    );
    expect(rawFileUrl({ owner: "a", repo: "b" }, "pnpm-workspace.yaml")).toBe(
      "https://raw.githubusercontent.com/a/b/HEAD/pnpm-workspace.yaml",
    );
  });
});
