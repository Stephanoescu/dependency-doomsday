import { describe, expect, it } from "vitest";
import { createLimiter } from "./limiter";

const tick = () => new Promise((resolve) => setTimeout(resolve, 1));

describe("createLimiter", () => {
  it("never runs more than N tasks at once and runs them all", async () => {
    const limit = createLimiter(3);
    let active = 0;
    let peak = 0;
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        limit(async () => {
          active++;
          peak = Math.max(peak, active);
          await tick();
          active--;
          return i;
        }),
      ),
    );
    expect(peak).toBe(3);
    expect(results).toEqual(Array.from({ length: 20 }, (_, i) => i));
  });

  it("propagates errors and keeps going", async () => {
    const limit = createLimiter(1);
    const failing = limit(async () => {
      throw new Error("boom");
    });
    const ok = limit(async () => "fine");
    await expect(failing).rejects.toThrow("boom");
    await expect(ok).resolves.toBe("fine");
  });

  it("starts tasks in FIFO order", async () => {
    const limit = createLimiter(1);
    const order: number[] = [];
    await Promise.all([1, 2, 3].map((n) => limit(async () => void order.push(n))));
    expect(order).toEqual([1, 2, 3]);
  });
});
