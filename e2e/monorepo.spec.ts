import { expect, test, type Page } from "@playwright/test";
import { en } from "@/messages/en";

/** On screen, not in the screen-reader announcement (role=status), which repeats the text. */
const shown = (page: Page, text: string) => page.getByText(text).and(page.locator(":not([role=status])"));

test("a monorepo root shows only the monorepo hint, with a ready-to-use example", async ({ page }) => {
  // What /api/resolve answers for vercel/next.js: no dependencies of its own, a workspace found.
  await page.route("**/api/resolve", (route) =>
    route.fulfill({
      status: 422,
      json: {
        ok: false,
        error: "no-dependencies",
        monorepo: { workspaces: ["packages/*"], example: "packages/next" },
        ref: { owner: "vercel", repo: "next.js" },
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("textbox").fill("https://github.com/vercel/next.js");
  await page.locator("form button[type=submit]").click();

  await expect(shown(page, en.monorepo.message)).toBeVisible();
  // Not on screen, and not announced to screen readers either.
  await expect(page.getByText(en.errors["no-dependencies"])).toHaveCount(0);
  await expect(page.getByText("https://github.com/vercel/next.js/tree/HEAD/packages/next", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: en.monorepo.useExample }).click();
  await expect(page.getByRole("textbox")).toHaveValue("https://github.com/vercel/next.js/tree/HEAD/packages/next");
});

test("pointing at the workspace folder itself asks for a package name", async ({ page }) => {
  await page.route("**/api/resolve", (route) =>
    route.fulfill({
      status: 404,
      json: {
        ok: false,
        error: "workspace-folder",
        location: "packages",
        example: "packages/next",
        ref: { owner: "vercel", repo: "next.js", ref: "HEAD", path: "packages" },
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("textbox").fill("https://github.com/vercel/next.js/tree/HEAD/packages/");
  await page.locator("form button[type=submit]").click();
  await expect(
    shown(page, "Add a package name after packages/ — for example packages/next."),
  ).toBeVisible();
});
