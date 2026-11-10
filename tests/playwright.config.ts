import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E testing of the Private Bookmark Chrome extension.
 *
 * Prerequisites:
 *   - Run `npm run build` before tests to generate `build/` (the unpacked extension).
 *   - Chromium is installed via `npx playwright install chromium`.
 *
 * The extension is loaded into each browser context using the `extensions`
 * browserContextOption, so all extension pages (popup, options, view, history)
 * are accessible via `chrome-extension://<id>/...` URLs.
 */
export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.test\.ts$/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: 'html',

  use: {
    browserName: 'chromium',
    channel: 'chromium',
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    actionTimeout: 0,
    navigationTimeout: 0,
  },

  projects: [
    {
      name: 'chromium',
      use: devices['Desktop Chrome'],
    },
  ],

  // Launch the extension alongside Chromium in every context.
  // The extension ID is derived from the `key` in src/manifest.json.
  webServer: undefined,
});
