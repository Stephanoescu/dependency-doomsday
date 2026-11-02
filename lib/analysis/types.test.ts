import { describe, expect, it } from "vitest";
import { unscoredReasons, type PackageData } from "./types";

const pkg = (npmStatus: PackageData["npmStatus"]): PackageData => ({
  name: `p-${npmStatus}`,
  field: "dependencies",
  npmStatus,
  npm: npmStatus === "ok" ? ({ name: "p" } as PackageData["npm"]) : null,
  downloadsStatus: "ok",
  downloads: null,
  githubStatus: "no-repo",
  github: null,
});

describe("unscoredReasons", () => {
  it("tells a 404 from npm (likely private) apart from a failed source", () => {
    expect(unscoredReasons([pkg("ok"), pkg("not-found"), pkg("not-found"), pkg("error")])).toEqual({
      notFound: 2,
      failed: 1,
    });
  });

  it("is zero for packages that have data", () => {
    expect(unscoredReasons([pkg("ok")])).toEqual({ notFound: 0, failed: 0 });
  });
});
