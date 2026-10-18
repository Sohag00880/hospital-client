const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

async function installBrandingApi(page, { platform = false, allowed = true } = {}) {
  const inherited = { displayName: "Platform Brand", shortName: "", primaryColor: "#2563eb", accentColor: "#0891b2", address: "", phone: "", email: "", website: "", printHeader: "", printFooter: "", showLoginBranding: false, publicContacts: false };
  const state = { local: {}, writes: 0, paths: [] };
  const full = () => ({ ...inherited, ...state.local });
  const login = (branding) => branding.showLoginBranding ? { displayName: branding.displayName, primaryColor: branding.primaryColor, ...(branding.publicContacts ? { email: branding.email } : {}) } : null;
  const bundle = () => ({ branding: full(), local: state.local, inherited, login: login(full()) });
  const access = { user: { id: "11111111-1111-4111-8111-111111111111", tenantId: platform ? null : "22222222-2222-4222-8222-222222222222", fullName: "Test Admin" }, accessToken: "browser-fixture", roles: [platform ? "platform_super_admin" : "tenant_admin"], permissions: [...(allowed ? ["branding.manage"] : []), "tenant.view", "tenant.update", "user.view", "role.view"], isPlatformAdmin: platform, mustChangePassword: false };
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request(), path = new URL(request.url()).pathname.replace(/^.*\/api\/v1/, "");
    state.paths.push(path);
    const send = (data, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ success: true, data }) });
    if (path === "/auth/refresh" || path === "/auth/me") return send(access);
    if (path === "/branding/appearance") return send({ displayName: full().displayName, shortName: full().shortName, primaryColor: full().primaryColor, accentColor: full().accentColor });
    if (path === "/branding/preview" || path === "/platform/branding/preview") { const branding = { ...full(), ...request.postDataJSON() }; return send({ branding, login: login(branding) }); }
    if (path === "/branding" || path === "/platform/branding") {
      if (request.method() === "PATCH") { state.local = { ...state.local, ...request.postDataJSON() }; state.writes++; }
      if (request.method() === "DELETE") { state.local = {}; state.writes++; }
      return send(bundle());
    }
    return send(null, 404);
  });
  return state;
}

test("branding-only page saves immediately, previews without writes and restores inheritance", async ({ page }) => {
  const state = await installBrandingApi(page);
  await page.goto("/configuration");
  await expect(page.getByRole("heading", { name: "Branding", exact: true })).toBeVisible();
  await page.getByLabel("Display name", { exact: true }).fill("Saved Hospital");
  await page.getByRole("button", { name: "Save branding", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Branding saved. Changes are active.");
  expect(state.local.displayName).toBe("Saved Hospital");
  await page.getByLabel("Display name", { exact: true }).fill("Preview Hospital");
  await page.getByRole("button", { name: "Preview branding", exact: true }).click();
  await expect(page.getByText("Preview Hospital", { exact: true })).toBeVisible();
  expect(state.local.displayName).toBe("Saved Hospital"); expect(state.writes).toBe(1);
  await page.getByRole("button", { name: "Save branding", exact: true }).click();
  await expect(page.getByRole("button", { name: "Inherit platform branding" })).toBeEnabled();
  await page.getByRole("button", { name: "Inherit platform branding" }).click();
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue("Platform Brand");
  for (const name of ["General", "Fields", "Options", "Features", "Numbering", "History", "Create draft", "Publish draft"]) await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0);
  expect(state.paths.some((path) => path.includes("configuration"))).toBe(false);
  await expect(new AxeBuilder({ page }).analyze().then((result) => result.violations)).resolves.toEqual([]);
});

test("platform branding uses its own endpoint; tenant access stays permission restricted", async ({ page }) => {
  const platform = await installBrandingApi(page, { platform: true });
  await page.goto("/platform/configuration");
  await page.getByLabel("Display name", { exact: true }).fill("Platform Test");
  await page.getByRole("button", { name: "Save branding", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Branding saved. Changes are active.");
  expect(platform.paths).toContain("/platform/branding"); expect(platform.paths).not.toContain("/branding");
  await page.unrouteAll({ behavior: "wait" });
  const tenant = await installBrandingApi(page, { allowed: false });
  await page.goto("/configuration");
  await expect(page.getByRole("heading", { name: "Branding access denied" })).toBeVisible();
  expect(tenant.paths).not.toContain("/branding");
});
