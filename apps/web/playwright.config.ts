import { defineConfig, devices } from '@playwright/test';

// Smoke test of the built site (run `npm run build` first). It uses ?mock=1, so it needs
// no API and no network for the analysis; only the basemap and NASA GIBS tiles are remote.
const PORT = 4322;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'en-US',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  // `vite preview` serves the static dist/ in the foreground. `astro preview` 7.2+ moves
  // itself to the background when it detects an AI agent, which Playwright reads as a crash.
  webServer: {
    command: `npx vite preview --outDir dist --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
});
