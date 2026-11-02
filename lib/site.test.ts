import { describe, expect, it } from "vitest";
import { pageOpenGraph } from "./site";

describe("pageOpenGraph", () => {
  it("repeats the layout's shared fields, since a page's openGraph replaces them", () => {
    expect(pageOpenGraph({ title: "T", description: "D", url: "/methodology" })).toEqual({
      siteName: "Dependency Doomsday",
      type: "website",
      title: "T",
      description: "D",
      url: "/methodology",
    });
  });
});
