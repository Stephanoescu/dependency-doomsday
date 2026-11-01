import { compressToEncodedURIComponent } from "lz-string";
import { describe, expect, it } from "vitest";
import {
  badgePath,
  decodeList,
  encodeList,
  listDependencies,
  MAX_ENCODED_LIST,
  ogImagePath,
  repoSourceFromRoute,
  sharePath,
  shareSourceFor,
  sourceFromParams,
  sourceLabel,
  sourceParams,
  sourceSlug,
  type ShareSource,
} from "./links";

describe("list encoding", () => {
  const list = {
    projectName: "acme-shop",
    dependencies: ["react", "@babel/core", "left-pad"],
    devDependencies: ["vitest"],
  };

  it("round-trips names and the project name", () => {
    expect(decodeList(encodeList(list))).toEqual(list);
  });

  it("is URL-safe and compact", () => {
    const names = Array.from({ length: 150 }, (_, i) => `some-package-name-${i}`);
    const encoded = encodeList({ dependencies: names, devDependencies: [] });
    expect(encoded).toMatch(/^[\w+$-]+$/);
    expect(encoded.length).toBeLessThan(MAX_ENCODED_LIST);
    expect(encodeURIComponent(encoded)).toBe(encoded.replace(/\+/g, "%2B").replace(/\$/g, "%24"));
  });

  it("re-validates, dedupes and caps names", () => {
    const raw = ["1", "x", "react,react,Bad Name,../evil,@scope/ok", "react,vitest"].join("\n");
    expect(decodeList(compressToEncodedURIComponent(raw))).toEqual({
      projectName: "x",
      dependencies: ["react", "@scope/ok"],
      devDependencies: ["vitest"],
    });
    const many = Array.from({ length: 200 }, (_, i) => `p${i}`).join(",");
    const decoded = decodeList(compressToEncodedURIComponent(["1", "", many, "dev-a"].join("\n")));
    expect(decoded?.dependencies).toHaveLength(150);
    expect(decoded?.devDependencies).toEqual([]);
  });

  it("rejects garbage, other versions, empty lists and huge inputs", () => {
    expect(decodeList(null)).toBeNull();
    expect(decodeList("")).toBeNull();
    expect(decodeList("not-lz-at-all!!")).toBeNull();
    expect(decodeList(compressToEncodedURIComponent("2\nx\nreact\n"))).toBeNull();
    expect(decodeList(compressToEncodedURIComponent("1\nx\n\n"))).toBeNull();
    expect(decodeList("a".repeat(MAX_ENCODED_LIST + 1))).toBeNull();
  });

  it("strips separators from the project name", () => {
    const decoded = decodeList(encodeList({ projectName: "evil\nname,with,commas", dependencies: ["a"], devDependencies: [] }));
    expect(decoded?.projectName).toBe("evil name with commas");
  });

  it("turns a list back into dependencies", () => {
    expect(listDependencies(list)).toEqual([
      { name: "react", field: "dependencies" },
      { name: "@babel/core", field: "dependencies" },
      { name: "left-pad", field: "dependencies" },
      { name: "vitest", field: "devDependencies" },
    ]);
  });
});

describe("sharePath", () => {
  it("uses short paths for repos", () => {
    expect(sharePath({ kind: "repo", ref: { owner: "expressjs", repo: "express" }, includeDev: false })).toBe(
      "/r/github/expressjs/express",
    );
    expect(
      sharePath({
        kind: "repo",
        ref: { owner: "vercel", repo: "next.js", path: "packages/next" },
        includeDev: true,
      }),
    ).toBe("/r/github/vercel/next.js/tree/HEAD/packages/next?dev=1");
    expect(sharePath({ kind: "repo", ref: { owner: "a", repo: "b", ref: "feat/x" }, includeDev: false })).toBe(
      "/r/github/a/b/tree/feat%2Fx",
    );
  });

  it("uses a compressed list for pasted package.json files", () => {
    const path = sharePath({ kind: "list", list: { dependencies: ["react"], devDependencies: [] } });
    expect(path).toMatch(/^\/list\?d=[\w+$-]+$/);
    expect(decodeList(path.split("d=")[1])).toEqual({ dependencies: ["react"], devDependencies: [] });
  });
});

describe("repoSourceFromRoute", () => {
  it("reads owner, repo, ref, path and the dev flag", () => {
    expect(repoSourceFromRoute("vercel", "next.js", ["tree", "HEAD", "packages", "next"], "1")).toEqual({
      kind: "repo",
      ref: { owner: "vercel", repo: "next.js", ref: "HEAD", path: "packages/next" },
      includeDev: true,
    });
    expect(repoSourceFromRoute("expressjs", "express", undefined, undefined)).toEqual({
      kind: "repo",
      ref: { owner: "expressjs", repo: "express" },
      includeDev: false,
    });
  });

  it("rejects invalid owners and path traversal", () => {
    expect(repoSourceFromRoute("-bad", "repo", undefined, undefined)).toBeNull();
    expect(repoSourceFromRoute("a", "b", ["tree", "HEAD", ".."], undefined)).toBeNull();
  });

  it("round-trips with sharePath", () => {
    const source: ShareSource = {
      kind: "repo",
      ref: { owner: "a", repo: "b", ref: "HEAD", path: "packages/x" },
      includeDev: false,
    };
    const [, , , owner, repo, ...rest] = sharePath(source).split("/");
    expect(repoSourceFromRoute(owner, repo, rest, undefined)).toEqual(source);
  });
});

describe("image and badge parameters", () => {
  const repo: ShareSource = {
    kind: "repo",
    ref: { owner: "vercel", repo: "next.js", ref: "canary", path: "packages/next" },
    includeDev: true,
  };
  const list: ShareSource = { kind: "list", list: { projectName: "x", dependencies: ["react"], devDependencies: [] } };

  it("round-trip through query parameters", () => {
    expect(sourceFromParams(sourceParams(repo))).toEqual(repo);
    expect(sourceFromParams(sourceParams(list))).toEqual(list);
  });

  it("rejects bad parameters", () => {
    expect(sourceFromParams(new URLSearchParams())).toBeNull();
    expect(sourceFromParams(new URLSearchParams("repo=nope"))).toBeNull();
    expect(sourceFromParams(new URLSearchParams("repo=a/b/c"))).toBeNull();
    expect(sourceFromParams(new URLSearchParams("repo=a/b&path=../x"))).toBeNull();
    expect(sourceFromParams(new URLSearchParams("d=garbage"))).toBeNull();
  });

  it("builds image and badge paths", () => {
    expect(ogImagePath(repo)).toBe("/api/og?repo=vercel%2Fnext.js&ref=canary&path=packages%2Fnext&dev=1");
    expect(ogImagePath(repo, "story")).toContain("&format=story");
    expect(badgePath({ owner: "expressjs", repo: "express" })).toBe("/api/badge?repo=expressjs%2Fexpress");
  });

  it("labels sources", () => {
    expect(sourceLabel(repo)).toBe("vercel/next.js/packages/next");
    expect(sourceLabel(list)).toBe("x");
    expect(sourceSlug(repo)).toBe("vercel-next.js-packages-next");
    expect(sourceSlug({ kind: "list", list: { dependencies: ["a"], devDependencies: [] } })).toBe("project");
  });
});

describe("shareSourceFor", () => {
  const parsed = {
    ok: true as const,
    projectName: "acme-internal",
    packages: [
      { name: "react", field: "dependencies" as const },
      { name: "@acme/secret-sdk", field: "dependencies" as const },
      { name: "vitest", field: "devDependencies" as const },
    ],
    skipped: [],
    truncated: 0,
  };

  it("leaves packages npm couldn't find out of list links", () => {
    const { source, excluded } = shareSourceFor(parsed, true, [
      { name: "react", npmStatus: "ok" },
      { name: "@acme/secret-sdk", npmStatus: "not-found" },
      { name: "vitest", npmStatus: "error" },
    ]);
    expect(excluded).toEqual(["@acme/secret-sdk"]);
    expect(source).toEqual({
      kind: "list",
      list: { projectName: "acme-internal", dependencies: ["react"], devDependencies: ["vitest"] },
    });
    expect(JSON.stringify(decodeList(sharePath(source).split("d=")[1]))).not.toContain("secret");
  });

  it("links repos by reference, whatever npm said", () => {
    const { source, excluded } = shareSourceFor({ ...parsed, ref: { owner: "a", repo: "b" } }, false, [
      { name: "@acme/secret-sdk", npmStatus: "not-found" },
    ]);
    expect(source).toEqual({ kind: "repo", ref: { owner: "a", repo: "b" }, includeDev: false });
    expect(excluded).toEqual([]);
  });
});
