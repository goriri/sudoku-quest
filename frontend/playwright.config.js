import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: false,
  workers: 1, // run sequentially to avoid SQLite locks
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:8000',
    trace: 'on-first-retry',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'PYTHONPATH=.. ../venv/bin/uvicorn backend.main:app --port 8000',
    url: 'http://localhost:8000',
    reuseExistingServer: false,
    timeout: 15000,
  },
});
