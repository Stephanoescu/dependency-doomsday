import { describe, expect, it } from "vitest";
import { emphasisWords } from "./share-image";

describe("emphasisWords", () => {
  it("keeps emphasized parts inside their words so lines break only between words", () => {
    expect(emphasisWords("dependency (**once**, 664.5M) has **a single** maintainer.")).toEqual([
      [{ text: "dependency", strong: false }],
      [
        { text: "(", strong: false },
        { text: "once", strong: true },
        { text: ",", strong: false },
      ],
      [{ text: "664.5M)", strong: false }],
      [{ text: "has", strong: false }],
      [{ text: "a", strong: true }],
      [{ text: "single", strong: true }],
      [{ text: "maintainer.", strong: false }],
    ]);
  });

  it("shortens package names too long to wrap", () => {
    const [[piece]] = emphasisWords(`**@acme/${"x".repeat(60)}**`);
    expect(piece.text.length).toBeLessThanOrEqual(28);
    expect(piece.text).toContain("…");
  });
});
