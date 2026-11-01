import { describe, expect, it } from "vitest";
import { parseLernaJson, parsePnpmWorkspaceYaml } from "./workspaces";

describe("parsePnpmWorkspaceYaml", () => {
  it("reads a block list with mixed quoting and comments", () => {
    const yaml = [
      "# root workspace",
      "packages:",
      "  - 'packages/*'",
      '  - "apps/*" # the apps',
      "  - tools/cli",
      "",
      "  # excluded:",
      "  - '!**/test/**'",
      "catalog:",
      "  react: ^19",
      "  - not-a-package",
    ].join("\n");
    expect(parsePnpmWorkspaceYaml(yaml)).toEqual(["packages/*", "apps/*", "tools/cli"]);
  });

  it("reads items at the same indentation as the key", () => {
    expect(parsePnpmWorkspaceYaml("packages:\n- packages/*\n- bench\n")).toEqual([
      "packages/*",
      "bench",
    ]);
  });

  it("reads flow-style lists", () => {
    expect(parsePnpmWorkspaceYaml("packages: ['packages/*', \"apps/*\"]\n")).toEqual([
      "packages/*",
      "apps/*",
    ]);
  });

  it("handles CRLF line endings", () => {
    expect(parsePnpmWorkspaceYaml("packages:\r\n  - packages/*\r\n")).toEqual(["packages/*"]);
  });

  it("returns an empty list when there is no packages key", () => {
    expect(parsePnpmWorkspaceYaml("catalog:\n  react: ^19\n")).toEqual([]);
    expect(parsePnpmWorkspaceYaml("")).toEqual([]);
  });
});

describe("parseLernaJson", () => {
  it("reads packages", () => {
    expect(parseLernaJson('{"packages": ["modules/*", "!modules/old"]}')).toEqual(["modules/*"]);
  });

  it("falls back to Lerna's default", () => {
    expect(parseLernaJson('{"version": "independent"}')).toEqual(["packages/*"]);
  });

  it("ignores invalid files", () => {
    expect(parseLernaJson("not json")).toBeUndefined();
    expect(parseLernaJson("[]")).toBeUndefined();
  });
});
