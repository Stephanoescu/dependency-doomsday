import { expect, test, type Page } from "@playwright/test";
import { en } from "@/messages/en";
import { fakeApi, packageJson } from "./fake-api";

const SIX = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot"];

async function forecastExpress(page: Page) {
  await page.goto("/");
  await page.getByRole("textbox").fill("https://github.com/expressjs/express");
  await page.getByRole("button", { name: en.input.submit }).click();
  await expect(page).toHaveURL(/\/r\/github\/expressjs\/express$/);
  await expect(page.locator("#result-headline:visible")).toBeVisible();
}

/** Pastes a 6-package package.json and expects its own result, not the previous one. */
async function forecastSix(page: Page) {
  const submit = page.locator("form button[type=submit]");
  // The home page is restored, not remounted: the previous run must not leave it busy.
  await expect(submit).toBeEnabled();
  await expect(submit).toHaveText(new RegExp(en.input.submit));
  await page.getByRole("textbox").fill(packageJson("six-deps", SIX));
  await submit.click();
  await expect(page).toHaveURL(/\/list\?d=/);
  await expect(page.locator("#result-headline:visible")).toBeVisible();
  await expect(page.getByText(/6 dependencies checked/)).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await fakeApi(page);
});

test("a new package.json after a result starts a fresh analysis (header link)", async ({ page }) => {
  await forecastExpress(page);
  await page.getByRole("link", { name: en.brand.home }).click();
  await expect(page).toHaveURL(/\/$/);
  await forecastSix(page);
});

test("a new package.json after a result starts a fresh analysis (browser back)", async ({ page }) => {
  await forecastExpress(page);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await forecastSix(page);
});

test("tells packages missing from npm apart from sources that failed", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox").fill(packageJson("mixed", ["alpha", "@empresa-falsa/secreto", "flaky-one"]));
  await page.locator("form button[type=submit]").click();
  await expect(page.locator("#result-headline:visible")).toBeVisible();
  await expect(page.getByText("1 package wasn't found on npm (it may be private). It's left out of the score.")).toBeVisible();
  await expect(page.getByText("1 package has no npm data because a source failed. It's left out of the score.")).toBeVisible();
});
