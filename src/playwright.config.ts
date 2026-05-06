import { defineConfig, devices } from "@playwright/test";

/**
 * Visual regression config. Tests run against the Next.js dev server.
 *
 * - `webServer` boots `next dev` on port 3001 if it isn't already running.
 * - We pin Chromium-only (visual diffing across browsers introduces noise).
 * - Snapshots live in `tests/__screenshots__/` next to the spec.
 * - Animations are disabled per-screenshot via the spec.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
    // Tighter than the default 5px to catch real drift; relax if flaky.
    screenshot: { mode: "off" }, // we capture explicitly via expect(page).toHaveScreenshot
  },

  expect: {
    toHaveScreenshot: {
      // % of pixels allowed to differ before a test fails.
      maxDiffPixelRatio: 0.005, // 0.5%
      // Per-pixel tolerance (0–255). Tiny anti-aliasing wiggles get smoothed.
      threshold: 0.2,
      animations: "disabled",
      caret: "hide",
    },
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "npm run dev -- -p 3001",
    url: "http://localhost:3001/",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
