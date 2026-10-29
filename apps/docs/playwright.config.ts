import { defineConfig, devices } from "@playwright/test";

const ci = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env
  .CI;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: Boolean(ci),
  retries: ci ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5173",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "pnpm exec vite --host 127.0.0.1 --port 5173 --strictPort",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
