const { defineConfig, devices } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "./doctor-e2e", workers: 1, timeout: 240000, expect: { timeout: 45000 }, reporter: [["list"]],
  use: { baseURL: "http://127.0.0.1:3111", actionTimeout: 30000, navigationTimeout: 60000, trace: "retain-on-failure" },
  outputDir: "test-results-doctors", projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: { command: "node node_modules/next/dist/bin/next start -p 3111", url: "http://127.0.0.1:3111/login", timeout: 60000, reuseExistingServer: false, env: { NEXT_VERIFY_BUILD: "1" } },
});
