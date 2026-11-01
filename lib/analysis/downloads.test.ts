import { describe, expect, it } from "vitest";
import { chunk, isScoped, parseDownloadsResponse } from "./downloads";

describe("parseDownloadsResponse", () => {
  it("reads bulk responses and maps missing packages to null", () => {
    const json = {
      react: { downloads: 743344670, package: "react" },
      "left-pad": { downloads: 12252317, package: "left-pad" },
      "does-not-exist": null,
    };
    expect(parseDownloadsResponse(json, ["react", "left-pad", "does-not-exist", "absent"])).toEqual(
      new Map([
        ["react", 743344670],
        ["left-pad", 12252317],
        ["does-not-exist", null],
        ["absent", null],
      ]),
    );
  });

  it("reads the single-package shape", () => {
    const json = { downloads: 42, package: "@babel/core", start: "x", end: "y" };
    expect(parseDownloadsResponse(json, ["@babel/core"])).toEqual(new Map([["@babel/core", 42]]));
  });

  it("maps error bodies to null", () => {
    expect(parseDownloadsResponse({ error: "not found" }, ["x"])).toEqual(new Map([["x", null]]));
  });
});

describe("helpers", () => {
  it("splits into chunks", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 128)).toEqual([]);
  });

  it("detects scoped names", () => {
    expect(isScoped("@babel/core")).toBe(true);
    expect(isScoped("react")).toBe(false);
  });
});
