import { describe, expect, it } from "vitest";
import { extractNpmInfo } from "./packument";

const leftPad = {
  name: "left-pad",
  "dist-tags": { latest: "1.3.0" },
  maintainers: [
    { name: "stevemao", email: "steve@example.com" },
    { name: "westlac", email: "w@example.com" },
  ],
  time: {
    created: "2014-03-14T00:00:00.000Z",
    modified: "2024-04-16T05:01:57.431Z",
    "1.2.0": "2017-11-01T00:00:00.000Z",
    "1.3.0": "2018-04-09T00:00:00.000Z",
  },
  versions: {
    "1.2.0": {},
    "1.3.0": { deprecated: "use String.prototype.padStart()" },
  },
  repository: { type: "git", url: "git+ssh://git@github.com/stevemao/left-pad.git" },
  readme: "x".repeat(10_000),
};

describe("extractNpmInfo", () => {
  it("keeps only the fields the rules need", () => {
    expect(extractNpmInfo("left-pad", leftPad)).toEqual({
      name: "left-pad",
      latestVersion: "1.3.0",
      deprecated: "use String.prototype.padStart()",
      unpublished: false,
      maintainers: ["stevemao", "westlac"],
      lastPublishAt: "2018-04-09T00:00:00.000Z",
      createdAt: "2014-03-14T00:00:00.000Z",
      repositoryUrl: "https://github.com/stevemao/left-pad",
      github: { owner: "stevemao", repo: "left-pad" },
    });
  });

  it("never stores maintainer emails", () => {
    expect(JSON.stringify(extractNpmInfo("left-pad", leftPad))).not.toContain("@example.com");
  });

  it("uses the newest publish of any version, so backports count as releases", () => {
    const doc = {
      "dist-tags": { latest: "2.0.0" },
      time: { "2.0.0": "2020-01-01T00:00:00Z", "1.9.9": "2023-06-01T00:00:00Z" },
      versions: { "2.0.0": {}, "1.9.9": {} },
    };
    expect(extractNpmInfo("x", doc).lastPublishAt).toBe("2023-06-01T00:00:00.000Z");
  });

  it("ignores times of versions that are no longer listed", () => {
    const doc = {
      "dist-tags": { latest: "1.0.0" },
      time: { "1.0.0": "2019-01-01T00:00:00Z", "1.0.1": "2024-01-01T00:00:00Z" },
      versions: { "1.0.0": {} },
    };
    expect(extractNpmInfo("x", doc).lastPublishAt).toBe("2019-01-01T00:00:00.000Z");
  });

  it("treats an empty deprecation message as not deprecated", () => {
    const doc = { "dist-tags": { latest: "1.0.0" }, versions: { "1.0.0": { deprecated: "" } } };
    expect(extractNpmInfo("x", doc).deprecated).toBeNull();
  });

  it("falls back to the latest manifest's repository", () => {
    const doc = {
      "dist-tags": { latest: "1.0.0" },
      versions: { "1.0.0": { repository: "github:a/b" } },
    };
    expect(extractNpmInfo("x", doc).github).toEqual({ owner: "a", repo: "b" });
  });

  it("detects unpublished packages", () => {
    const doc = {
      time: { created: "2016-01-01T00:00:00Z", unpublished: { time: "2016-03-23T00:00:00Z" } },
    };
    const info = extractNpmInfo("gone", doc);
    expect(info.unpublished).toBe(true);
    expect(info.latestVersion).toBeNull();
    expect(info.lastPublishAt).toBeNull();
  });

  it("accepts legacy string maintainers and dedupes them", () => {
    const doc = { maintainers: ["alice <a@x.com>", { name: "alice" }, { name: "bob" }] };
    expect(extractNpmInfo("x", doc).maintainers).toEqual(["alice", "bob"]);
  });

  it("survives garbage", () => {
    expect(extractNpmInfo("x", null)).toMatchObject({
      latestVersion: null,
      maintainers: [],
      repositoryUrl: null,
      github: null,
    });
  });
});
