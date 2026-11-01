import { describe, expect, it } from "vitest";
import { getMessages } from "@/lib/i18n";
import { describeRule, formatPoints } from "./explain";

const t = getMessages();

describe("describeRule", () => {
  it("describes simple rules", () => {
    expect(describeRule({ id: "single-maintainer", points: 30 }, t)).toBe("Single npm maintainer");
    expect(describeRule({ id: "no-repo", points: 10 }, t)).toBe("No repository linked");
  });

  it("says how old the release or push is", () => {
    expect(describeRule({ id: "stale-release", points: 25, basePoints: 25, months: 20, halvedBy: [] }, t)).toBe(
      "Last release 20 months ago",
    );
    expect(describeRule({ id: "stale-push", points: 15, months: 30 }, t)).toBe("No GitHub push in 2 years");
  });

  it("explains why a penalty was halved", () => {
    expect(
      describeRule(
        { id: "stale-release", points: 20, basePoints: 40, months: 50, halvedBy: ["possibly-finished", "recent-push"] },
        t,
      ),
    ).toBe("Last release 4 years ago (halved from 40: possibly finished, repo still active)");
  });
});

describe("formatPoints", () => {
  it("prefixes a plus sign", () => {
    expect(formatPoints(30)).toBe("+30");
  });
});
