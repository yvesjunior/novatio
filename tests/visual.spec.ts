import { test, expect, type Page } from "@playwright/test";

/**
 * Visual regression: verifies that every important route renders pixel-stable
 * across the breakpoints we ship. The first run captures baselines under
 * `tests/__screenshots__/`. Every subsequent run diffs against those.
 *
 * Run:    `npm run test:visual`
 * Update: `npm run test:visual:update` (after an intentional visual change)
 */

const ROUTES = [
  "/",
  "/about-us/",
  "/contact-us/",
  "/blog-grid/",
  "/services/",
  "/faq/",
] as const;

const VIEWPORTS = [
  { name: "mobile",  width:  375, height: 812 },
  { name: "tablet",  width: 1024, height: 768 },
  { name: "desktop", width: 1600, height: 900 },
] as const;

/** Make a route safe for use in a screenshot filename. */
function slug(route: string): string {
  return route === "/" ? "home" : route.replace(/^\/|\/$/g, "").replace(/\//g, "-");
}

/** Wait for fonts + images to settle, then a small grace period. */
async function waitForStable(page: Page) {
  await page.waitForLoadState("load");
  await page.evaluate(() => (document as Document).fonts?.ready);
  // The legacy site has lazy-loaded images and a brief reveal animation.
  // Force-load images and let layout settle.
  await page.evaluate(() => {
    const imgs = Array.from(document.images);
    imgs.forEach((img) => {
      img.loading = "eager";
      if (!img.complete && img.dataset.src) img.src = img.dataset.src;
    });
  });
  await page.waitForTimeout(750);
}

for (const viewport of VIEWPORTS) {
  test.describe(`visual @ ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of ROUTES) {
      test(`${route} renders pixel-stable`, async ({ page }) => {
        await page.goto(route);
        await waitForStable(page);
        await expect(page).toHaveScreenshot(`${viewport.name}__${slug(route)}.png`, {
          fullPage: false, // viewport only — keeps baseline files manageable
        });
      });
    }
  });
}
