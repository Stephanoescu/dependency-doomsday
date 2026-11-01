export interface TreemapItem {
  id: string;
  value: number;
}

export interface TreemapRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Worst aspect ratio of a row laid along a side of length `side` (Bruls, Huizing & van Wijk). */
function worst(row: number[], side: number): number {
  const sum = row.reduce((a, b) => a + b, 0);
  const max = Math.max(...row);
  const min = Math.min(...row);
  const s2 = side * side;
  const sum2 = sum * sum;
  return Math.max((s2 * max) / sum2, sum2 / (s2 * min));
}

/**
 * Squarified treemap: areas proportional to `value`, tiles as close to square
 * as possible, largest first (top-left). Items with value <= 0 are dropped.
 */
export function squarify(items: TreemapItem[], width: number, height: number): TreemapRect[] {
  const sorted = items.filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  const total = sorted.reduce((sum, i) => sum + i.value, 0);
  if (total === 0 || width <= 0 || height <= 0) return [];

  const scale = (width * height) / total;
  const areas = sorted.map((i) => i.value * scale);
  const rects: TreemapRect[] = [];
  let free = { x: 0, y: 0, w: width, h: height };

  const layoutRow = (start: number, end: number) => {
    const row = areas.slice(start, end);
    const sum = row.reduce((a, b) => a + b, 0);
    if (free.w >= free.h) {
      // Column along the left edge.
      const colW = sum / free.h;
      let y = free.y;
      row.forEach((area, i) => {
        const h = area / colW;
        rects.push({ id: sorted[start + i].id, x: free.x, y, w: colW, h });
        y += h;
      });
      free = { x: free.x + colW, y: free.y, w: free.w - colW, h: free.h };
    } else {
      // Row along the top edge.
      const rowH = sum / free.w;
      let x = free.x;
      row.forEach((area, i) => {
        const w = area / rowH;
        rects.push({ id: sorted[start + i].id, x, y: free.y, w, h: rowH });
        x += w;
      });
      free = { x: free.x, y: free.y + rowH, w: free.w, h: free.h - rowH };
    }
  };

  let start = 0;
  let end = 1;
  while (start < areas.length) {
    const side = Math.min(free.w, free.h);
    if (end < areas.length && worst(areas.slice(start, end + 1), side) <= worst(areas.slice(start, end), side)) {
      end++;
    } else {
      layoutRow(start, end);
      start = end;
      end = start + 1;
    }
  }
  return rects;
}

export const MORE_ID = "__more__";

/**
 * Keeps the `max - 1` largest items and folds the rest into one "+N more"
 * tile, sized like an average kept tile so it neither hides nor dominates.
 */
export function capItems(items: TreemapItem[], max: number): { items: TreemapItem[]; hidden: string[] } {
  if (items.length <= max) return { items, hidden: [] };
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const kept = sorted.slice(0, max - 1);
  const hidden = sorted.slice(max - 1).map((i) => i.id);
  const average = kept.reduce((sum, i) => sum + i.value, 0) / kept.length;
  return { items: [...kept, { id: MORE_ID, value: average }], hidden };
}
