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
    storageState: {
      cookies: [],
      origins: [
        {
          origin: "http://127.0.0.1:4173",
          localStorage: [{ name: "stickit.settings", value: JSON.stringify({ language: "en" }) }],
        },
      ],
    },
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm exec vite --config vite.config.ts --host 127.0.0.1 --port 4173 --strictPort",
    port: 4173,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
