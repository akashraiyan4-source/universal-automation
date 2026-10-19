import { defineConfig } from '@playwright/test';

/**
 * API contract tests (no browsers needed). Run with `npm test`.
 * Point at a deployed backend with BASE_URL=https://your-backend.vercel.app npm test
 */
const PORT = Number(process.env.PORT ?? 3000);
const baseURL = process.env.BASE_URL || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    extraHTTPHeaders: { Accept: 'application/json' },
  },
  projects: [{ name: 'api' }],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: `npx next dev -p ${PORT}`,
        url: `${baseURL}/api/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          // Generous limits so the suite itself never trips the limiter.
          RATE_LIMIT_PER_MINUTE: '1000',
          RATE_LIMIT_STRICT_PER_MINUTE: '1000',
        },
      },
});
