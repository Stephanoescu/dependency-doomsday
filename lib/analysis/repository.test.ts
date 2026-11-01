import { describe, expect, it } from "vitest";
import { parseRepositoryField } from "./repository";

const gh = (owner: string, repo: string) => ({
  url: `https://github.com/${owner}/${repo}`,
  github: { owner, repo },
});

describe("parseRepositoryField", () => {
  it.each([
    [{ type: "git", url: "git+https://github.com/facebook/react.git" }],
    [{ type: "git", url: "https://github.com/facebook/react" }],
    ["git+https://github.com/facebook/react.git"],
    ["git://github.com/facebook/react.git"],
    ["git+ssh://git@github.com/facebook/react.git"],
    ["ssh://git@github.com/facebook/react.git"],
    ["git@github.com:facebook/react.git"],
    ["github:facebook/react"],
    ["facebook/react"],
    ["http://github.com/facebook/react"],
    ["https://github.com/facebook/react/tree/main/packages/react"],
    ["git+https://github.com/facebook/react.git#main"],
    [{ type: "git", url: "https://github.com/facebook/react.git", directory: "packages/react" }],
  ])("parses %j as GitHub", (field) => {
    expect(parseRepositoryField(field)).toEqual(gh("facebook", "react"));
  });

  it("keeps non-GitHub hosts as a plain URL", () => {
    expect(parseRepositoryField("gitlab:inkscape/inkscape")).toEqual({
      url: "https://gitlab.com/inkscape/inkscape",
      github: null,
    });
    expect(parseRepositoryField({ url: "git+https://bitbucket.org/a/b.git" })).toEqual({
      url: "https://bitbucket.org/a/b",
      github: null,
    });
    expect(parseRepositoryField("git@gitlab.com:a/b.git")).toEqual({
      url: "https://gitlab.com/a/b",
      github: null,
    });
  });

  it.each([[undefined], [null], [""], ["   "], [{}], [{ url: 42 }], ["not a url"], ["https://"]])(
    "treats %j as no repository",
    (field) => {
      expect(parseRepositoryField(field)).toEqual({ url: null, github: null });
    },
  );
});
