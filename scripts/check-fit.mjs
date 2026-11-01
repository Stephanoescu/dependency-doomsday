/**
 * Checks that the headline, doomsday clock, score and minutes fit in one
 * phone screen without scrolling, so the result can be recorded vertically.
 *
 *   npm run dev            (or npm start)
 *   npm run check:fit      [-- http://localhost:3000]
 *
 * Uses your installed Chrome through playwright-core (no browser download).
 */
import { chromium } from "playwright-core";

const BASE = process.argv[2] ?? "http://localhost:3000";
const VIEWPORTS = [
  { name: "iPhone 12–15", width: 390, height: 844 },
  { name: "small Android", width: 360, height: 740 },
];
// A long headline (critical package) is the worst case for height.
const SAMPLE = JSON.stringify({
  name: "fit-check",
  dependencies: { chalk: "^5", lodash: "^4", request: "^2", "left-pad": "^1", react: "^19", express: "^5" },
});

const browser = await chromium.launch({ channel: "chrome" });
let failed = false;

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce", // final state at once
  });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.fill("textarea", SAMPLE);
  await page.click("button[type=submit]");
  await page.waitForSelector("#result-headline", { timeout: 60_000 });
  await page.waitForTimeout(300);

  const bottoms = await page.evaluate(() => {
    const bottom = (el) => (el ? el.getBoundingClientRect().bottom : Infinity);
    const stage = document.querySelector("#result-headline")?.closest("section");
    const minutes = [...(stage?.querySelectorAll("p") ?? [])].find((p) => /midnight|score/i.test(p.textContent ?? "") && p.className.includes("text-amber"));
    return {
      headline: bottom(document.querySelector("#result-headline")),
      clock: bottom(stage?.querySelector("svg")),
      minutes: bottom(minutes),
      scrollY: window.scrollY,
    };
  });
  const lowest = Math.max(bottoms.headline, bottoms.clock, bottoms.minutes);
  const ok = lowest <= vp.height && bottoms.scrollY === 0;
  failed ||= !ok;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${vp.width}x${vp.height} (${vp.name}): lowest element ends at ${Math.round(lowest)}px of ${vp.height}px`,
  );
  await context.close();
}

await browser.close();
process.exit(failed ? 1 : 0);
