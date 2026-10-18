const { test, expect } = require("@playwright/test");
async function install(page, allowed) {
  const requests = [], doctorId = "44444444-4444-4444-8444-444444444444";
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request(), path = new URL(request.url()).pathname.replace(/^.*\/api\/v1/, ""); requests.push({ path, method: request.method() });
    const send = (data) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data }) });
    if (path.startsWith("/auth/")) return send({ user: { id: "11111111-1111-4111-8111-111111111111", tenantId: "22222222-2222-4222-8222-222222222222", fullName: "Queue Viewer" }, accessToken: "fixture", permissions: allowed ? ["appointment.view"] : [], roles: ["staff"], isPlatformAdmin: false });
    if (path === "/branding/appearance") return send({ displayName: "Hospital" });
    if (path === "/appointments/doctors") return send([{ id: doctorId, fullName: "Dr Test" }]);
    if (path === "/appointments/schedules") return send([]);
    if (["/appointments", "/appointments/opd"].includes(path)) return send({ items: [], total: 0, counts: {booked:2}, amounts:{booked:{amount:"1200.50"}}, page: 1, pageSize: 20 });
    if (path === "/appointments/queue") { return send([{ id: "55555555-5555-4555-8555-555555555555", patientName: "Waiting Patient", mrn: "000001", doctorName: "Dr Test", doctorId, startAt: "2026-01-01T09:00:00Z", endAt: "2026-01-01T09:15:00Z", status: "booked", queueToken: 1, revision: 1 }]); }
    return send(null);
  }); return requests;
}
test("appointment access denial makes no scheduling requests", async ({ page }) => {
  const requests = await install(page, false); await page.goto("/appointments");
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("You do not have permission to view appointments.");
  expect(requests.filter((r) => r.path.startsWith("/appointments"))).toEqual([]);
});
test("read-only OPD shows queue and totals without polling or write controls", async ({ page }) => {
  await page.clock.install();
  const requests = await install(page, true); await page.goto("/opd");
  await expect(page.getByRole("button", { name: "Book appointment", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add doctor schedule", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link",{name:"All Appointments",exact:true})).toBeVisible();
  await expect(page.getByRole("link",{name:"OPD",exact:true})).toBeVisible();
  await expect(page.getByRole("cell", { name: /Waiting Patient/ })).toBeVisible({ timeout: 15000 });
  await expect(page.locator('[aria-label="Amounts by appointment status"]').getByText("1200.50",{exact:true})).toBeVisible();
  await expect(page.getByRole("button", { name: "Call next", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Edit serial", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cancel", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Start consultation", exact: true })).toHaveCount(0);
  const before = requests.filter(r => r.path === "/appointments/queue").length;
  await page.clock.fastForward(16000);
  expect(requests.filter(r => r.path === "/appointments/queue").length).toBe(before);
  expect(requests.filter((r) => r.path.startsWith("/appointments") && r.method !== "GET")).toEqual([]);
});
