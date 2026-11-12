import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests-integrated',
  workers: 1,
  retries: 0,
  timeout: 45_000,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report-smoke', open: 'never' }]],
  use: {
    baseURL: process.env.CENTRALIZA_SMOKE_URL ?? 'http://localhost:3000',
    channel: process.env.CENTRALIZA_PLAYWRIGHT_CHANNEL ?? 'msedge',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  outputDir: 'test-results-smoke',
});
