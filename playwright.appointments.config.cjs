const { defineConfig, devices } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "./appointment-e2e", workers: 1, timeout: 300000, expect: { timeout: 45000 }, reporter: [["list"]],
  use: { baseURL: "http://127.0.0.1:3110", actionTimeout: 20000, navigationTimeout: 60000, trace: "retain-on-failure" },
  outputDir: "test-results-appointments", projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: { command: "node node_modules/next/dist/bin/next start -p 3110", url: "http://127.0.0.1:3110/login", timeout: 60000, reuseExistingServer: false, env: { NEXT_VERIFY_BUILD: "1" } },
});
