import { describe, expect, it } from "vitest";
import { redactEvent } from "./analytics";

describe("redactEvent", () => {
  it("drops the package list from /list URLs", () => {
    expect(redactEvent({ type: "pageview", url: "https://d.example/list?d=N4IgdghgtgpiBcIBGAnA" }).url).toBe(
      "https://d.example/list",
    );
  });

  it("leaves other URLs alone", () => {
    const url = "https://d.example/r/github/expressjs/express?dev=1";
    expect(redactEvent({ type: "pageview", url }).url).toBe(url);
  });
});
