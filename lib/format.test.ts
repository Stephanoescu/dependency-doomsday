import { describe, expect, it } from "vitest";
import { formatCompact, formatMonths, formatRelative } from "./format";

const NOW = Date.parse("2026-11-01T12:00:00Z");

describe("formatCompact", () => {
  it("abbreviates large numbers", () => {
    expect(formatCompact(12_252_317)).toBe("12.3M");
    expect(formatCompact(1_234)).toBe("1.2K");
    expect(formatCompact(999)).toBe("999");
    expect(formatCompact(1_209_172_369)).toBe("1.2B");
  });
});

describe("formatRelative", () => {
  it("uses the largest whole unit", () => {
    expect(formatRelative("2018-04-09T00:00:00Z", NOW)).toBe("8 years ago");
    expect(formatRelative("2026-08-01T12:00:00Z", NOW)).toBe("3 months ago");
    expect(formatRelative("2026-10-31T12:00:00Z", NOW)).toBe("yesterday");
    expect(formatRelative("2026-11-01T12:25:00Z", NOW)).toBe("in 25 minutes");
    expect(formatRelative("2026-11-01T12:00:10Z", NOW)).toBe("this minute");
  });
});

describe("formatMonths", () => {
  it("uses months below two years and whole years from there", () => {
    expect([1, 20, 23, 24, 50].map((m) => formatMonths(m))).toEqual([
      "1 month",
      "20 months",
      "23 months",
      "2 years",
      "4 years",
    ]);
  });
});
