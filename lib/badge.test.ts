import { describe, expect, it } from "vitest";
import { BADGE_COLORS, badgeSvg, textWidth } from "./badge";

describe("textWidth", () => {
  it("grows with the text and treats unknown characters generously", () => {
    expect(textWidth("82/100")).toBeCloseTo(39.9, 1);
    expect(textWidth("doomsday")).toBeGreaterThan(textWidth("82/100"));
    expect(textWidth("Ж")).toBe(7.5);
  });
});

describe("badgeSvg", () => {
  const svg = badgeSvg("82/100", BADGE_COLORS.low);

  it("is an accessible two-part badge", () => {
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="\d+" height="20" role="img"/);
    expect(svg).toContain('aria-label="doomsday: 82/100"');
    expect(svg).toContain("<title>doomsday: 82/100</title>");
    expect(svg).toContain(`fill="${BADGE_COLORS.low}"`);
  });

  it("sizes the message box to its text", () => {
    const width = (s: string) => Number(/width="(\d+)"/.exec(s)![1]);
    expect(width(badgeSvg("analyzing…", BADGE_COLORS.neutral))).toBeGreaterThan(width(svg));
  });

  it("escapes XML", () => {
    expect(badgeSvg('<a&"b>', "#000")).toContain("&lt;a&amp;&quot;b&gt;");
    expect(badgeSvg('<a&"b>', "#000")).not.toContain("<a&");
  });
});
