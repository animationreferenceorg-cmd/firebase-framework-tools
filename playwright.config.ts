import { defineConfig, devices } from '@playwright/test';

/**
 * Browser smoke tests. By default this starts `next dev` on port 3002 (or
 * reuses one already running). Point at another deployment with
 * PLAYWRIGHT_BASE_URL, and use an installed browser with PLAYWRIGHT_CHANNEL
 * (e.g. `msedge` or `chrome`) instead of `npx playwright install chromium`.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3002';
const channel = process.env.PLAYWRIGHT_CHANNEL || undefined;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    navigationTimeout: 60_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel }, grep: /@mobile/ },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npx next dev -p 3002',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 240_000,
      },
});
