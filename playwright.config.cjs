const { defineConfig, devices } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "./e2e", fullyParallel: false, workers: 1,
  timeout: 45000, expect: { timeout: 10000 },
  reporter: [["list"]],
  use: { baseURL: "http://127.0.0.1:3106", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node node_modules/next/dist/bin/next start -p 3106",
    url: "http://127.0.0.1:3106/login", timeout: 60000, reuseExistingServer: false,
    env: { NEXT_VERIFY_BUILD: "1" },
  },
});
