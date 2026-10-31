import { describe, expect, it } from "vitest";
import { detectInput } from "./detect";

describe("detectInput", () => {
  it("detects package.json contents", () => {
    expect(detectInput('  {"dependencies": {}}')).toEqual({
      kind: "package-json",
      text: '{"dependencies": {}}',
    });
  });

  it("treats broken JSON as JSON so the parser can report it", () => {
    expect(detectInput("{ oops").kind).toBe("package-json");
  });

  it("detects GitHub references", () => {
    expect(detectInput("https://github.com/expressjs/express")).toEqual({
      kind: "github",
      ref: { owner: "expressjs", repo: "express" },
    });
    expect(detectInput("expressjs/express").kind).toBe("github");
  });

  it("reports empty input", () => {
    expect(detectInput("  \n ")).toEqual({ kind: "invalid", error: "empty" });
  });

  it("reports unsupported hosts", () => {
    expect(detectInput("https://gitlab.com/a/b")).toEqual({
      kind: "invalid",
      error: "unsupported-host",
    });
  });

  it("reports anything else as unrecognized", () => {
    expect(detectInput("react lodash")).toEqual({ kind: "invalid", error: "unrecognized" });
  });
});
