const { defineConfig, devices } = require("@playwright/test");
if (!process.env.E2E_API_BASEURL || !process.env.E2E_LOGIN_ID || !process.env.E2E_PASSWORD) throw new Error("Run through backend test:patients:integration -- --browser for isolated fixtures.");
module.exports = defineConfig({
  testDir: "./patient-e2e", workers: 1, timeout: 420000, expect: { timeout: 60000 },
  reporter: [["list"]], outputDir: "test-results-patients",
  use: { baseURL: "http://127.0.0.1:3109", actionTimeout: 30000, navigationTimeout: 90000, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "patients-live", use: { ...devices["Desktop Chrome"] } }],
  webServer: { command: "node node_modules/next/dist/bin/next start -p 3109", url: "http://127.0.0.1:3109/login", timeout: 60000, reuseExistingServer: false, env: { NEXT_VERIFY_BUILD: "1" } },
});
