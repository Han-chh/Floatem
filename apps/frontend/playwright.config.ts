import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/layout",
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    channel: "chrome",
    headless: true,
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm exec vite --config apps/frontend/vite.config.ts --host 127.0.0.1 --port 4173 --strictPort",
    port: 4173,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
