import { describe, expect, it } from "vitest";
import type { PackageData } from "@/lib/analysis/types";
import { getMessages } from "@/lib/i18n";
import { forecast } from "@/lib/risk";
import { NOW, pkg } from "@/lib/test/packages";
import { badgeMarkdown, shareTexts } from "./texts";

const t = getMessages();
const URL = "https://doomsday.example/r/github/acme/shop";

function texts(...packages: PackageData[]) {
  const result = forecast(packages, NOW);
  return shareTexts(result.packages, result.forecast, URL, t);
}

const critical = (name: string) => pkg({ npm: { name, maintainers: ["solo"] }, downloads: 636_183_624 });
const healthy = (name: string) => pkg({ npm: { name } });

describe("shareTexts", () => {
  it("leads with minutes to midnight and the first-person headline", () => {
    const { x, xIntentUrl } = texts(critical("lodash"), healthy("react"));
    expect(x).toBe(
      "My project is 8 minutes to midnight. My most critical dependency (lodash, 636.2M downloads/month) has a single npm maintainer. Check yours:",
    );
    expect(xIntentUrl).toBe(`https://x.com/intent/post?text=${encodeURIComponent(x)}&url=${encodeURIComponent(URL)}`);
  });

  it("drops the package name when the post would exceed 280 characters", () => {
    const longName = `@acme/${"x".repeat(200)}`;
    const { x } = texts(critical(longName), healthy("react"));
    expect(x).toBe("My project is 8 minutes to midnight. My most critical dependency has a single npm maintainer. Check yours:");
    expect(x.length + 24).toBeLessThanOrEqual(280);
  });

  it("writes a full LinkedIn post with the score and the link", () => {
    const { linkedin, linkedinShareUrl } = texts(critical("lodash"), healthy("react"));
    expect(linkedin).toContain("My project is 8 minutes to midnight. Doomsday score: 75/100.");
    expect(linkedin).toContain("My most critical dependency (lodash, 636.2M downloads/month) has a single npm maintainer.");
    expect(linkedin.endsWith(`Check yours: ${URL}`)).toBe(true);
    expect(linkedinShareUrl).toBe(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(URL)}`);
  });

  it("celebrates all-clear results", () => {
    expect(texts(healthy("a"), healthy("b")).x).toBe(
      "My project is 10 minutes to midnight. Doomsday postponed: all 2 of my dependencies are low risk. Check yours:",
    );
  });

  it("uses the singular for 1 minute", () => {
    const deprecated = pkg({ npm: { name: "request", deprecated: "gone" } });
    expect(texts(deprecated).x).toBe(
      "My project is 1 minute to midnight. One of my dependencies (request) is deprecated. Check yours:",
    );
  });

  it("shares no score when most data is missing", () => {
    const noData = (name: string): PackageData => ({ ...healthy(name), npmStatus: "error", npm: null });
    const { x, linkedin } = texts(noData("a"), noData("b"), healthy("c"));
    expect(x).toBe("How close is your project to midnight? Check your npm dependencies:");
    expect(linkedin).not.toMatch(/\d+\/100/);
  });
});

describe("badgeMarkdown", () => {
  it("links the badge to the report", () => {
    expect(badgeMarkdown("https://d.example/api/badge?repo=a%2Fb", "https://d.example/r/github/a/b")).toBe(
      "[![Dependency Doomsday](https://d.example/api/badge?repo=a%2Fb)](https://d.example/r/github/a/b)",
    );
  });
});
