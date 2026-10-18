const { test, expect } = require("@playwright/test");
async function session(page, allowed) {
  const paths = [];
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^.*\/api\/v1/, ""); paths.push({ path, method: route.request().method() });
    const send = (data) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data }) });
    if (path.startsWith("/auth/")) return send({ user: { id: "11111111-1111-4111-8111-111111111111", tenantId: "22222222-2222-4222-8222-222222222222", fullName: "Viewer" }, accessToken: "fixture", roles: ["staff"], permissions: allowed ? ["doctor.view"] : [], isPlatformAdmin: false });
    if (path === "/branding/appearance") return send({ displayName: "Hospital" });
    if (path === "/doctors/departments") return send([{ id: "33333333-3333-4333-8333-333333333333", name: "Cardiology" }]);
    if (path === "/doctors") return send({ items: [{ id: "44444444-4444-4444-8444-444444444444", fullName: "Test Doctor", qualification: "MBBS\nFCPS (Medicine)", loginId: "D12345", departmentName: "Cardiology", status: "active" }], total: 1 });
    return send(null);
  }); return paths;
}
test("doctor pages do not fetch without directory permission", async ({ page }) => {
  const paths = await session(page, false); await page.goto("/doctors");
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("You do not have permission to view doctors.");
  expect(paths.filter((r) => r.path.startsWith("/doctors"))).toEqual([]);
});
test("view-only doctors cannot create doctors, departments or reassign existing doctors", async ({ page }) => {
  const paths = await session(page, true); await page.goto("/doctors");
  await expect(page.getByRole("cell", { name: /Test Doctor/ })).toBeVisible();
  for (const name of ["Create doctor", "Create department", "Edit doctor", "Delete doctor"]) await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "View doctor", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("region", { name: "Qualifications" })).toHaveText(/MBBS\s+FCPS \(Medicine\)/);
  await page.getByRole("button", { name: "Close details", exact: true }).click();
  await page.getByRole("button", { name: "Departments", exact: true }).click();
  for (const name of ["Edit department", "Delete department"]) await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0);
  expect(paths.filter((r) => r.path.startsWith("/doctors") && r.method !== "GET")).toEqual([]);
});
