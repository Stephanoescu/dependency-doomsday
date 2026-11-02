/**
 * Writes app/favicon.ico (16, 32 and 48 px PNGs in one ICO) from the clock mark.
 * Run after changing the logo: node scripts/generate-favicon.mjs
 */
import { writeFileSync } from "node:fs";
import { createElement as h } from "react";
import { ImageResponse } from "next/dist/compiled/@vercel/og/index.node.js";

const mark = (size) =>
  h(
    "div",
    { style: { width: size, height: size, display: "flex", background: "#09090b", borderRadius: size * 0.2 } },
    h(
      "svg",
      { width: size, height: size, viewBox: "0 0 32 32", fill: "none" },
      h("circle", { cx: 16, cy: 16, r: 12.5, fill: "#111114", stroke: "#eeece6", strokeWidth: 2.8 }),
      h("path", { d: "M16 5.2v2.2", stroke: "#ff453a", strokeWidth: 3, strokeLinecap: "round" }),
      h("path", { d: "M16 16 15.7 11", stroke: "#eeece6", strokeWidth: 3.2, strokeLinecap: "round" }),
      h("path", { d: "M16 16 13 7", stroke: "#ff453a", strokeWidth: 2.4, strokeLinecap: "round" }),
      h("circle", { cx: 16, cy: 16, r: 2.2, fill: "#eeece6" }),
    ),
  );

const sizes = [16, 32, 48];
const pngs = await Promise.all(
  sizes.map(async (size) => Buffer.from(await new ImageResponse(mark(size), { width: size, height: size }).arrayBuffer())),
);

// ICO container: 6-byte header, 16-byte entry per image, then the PNG data.
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const entries = sizes.map((size, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(size, 0);
  e.writeUInt8(size, 1);
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(pngs[i].length, 8);
  e.writeUInt32LE(offset, 12);
  offset += pngs[i].length;
  return e;
});
writeFileSync(new URL("../app/favicon.ico", import.meta.url), Buffer.concat([header, ...entries, ...pngs]));
console.log(`app/favicon.ico: ${sizes.join(", ")} px`);
