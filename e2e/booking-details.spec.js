const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

test("Appointments hides demographic/time columns and shows booking creator and full details", async ({ page }) => {
  const createdAt = "2026-10-16T18:35:00.000Z";
  const row = { id: "55555555-5555-4555-8555-555555555555", canonicalPatientId: "33333333-3333-4333-8333-333333333333", patientName: "Test Patient", mrn: "000001", phone: "01711111111", doctorId: "44444444-4444-4444-8444-444444444444", doctorName: "Dr Test", date: "2026-10-20", createdAt, createdByName: "Reception Staff", ageYears: 35, ageRecordedOn: "2026-10-16", gender: "female", visitType: "new", amount: "650.50", serialNumber: 1, status: "booked", revision: 1 };
  const writes = [], errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/v1/**", async route => {
    const request = route.request(), path = new URL(request.url()).pathname.replace(/^.*\/api\/v1/, "");
    const send = data => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data }) });
    if (request.method() !== "GET" && !path.startsWith("/auth/")) writes.push(path);
    if (path.startsWith("/auth/")) return send({ user: { id: "11111111-1111-4111-8111-111111111111", tenantId: "22222222-2222-4222-8222-222222222222", fullName: "Viewer" }, accessToken: "fixture", permissions: ["appointment.view", "patient.view"], roles: ["staff"], isPlatformAdmin: false });
    if (path === "/branding/appearance") return send({ displayName: "Hospital" });
    if (path === "/appointments/doctors") return send([{ id: row.doctorId, fullName: row.doctorName }]);
    if (path === "/appointments/schedules") return send([]);
    if (path === "/appointments") return send({ items: [row], total: 1, counts: { booked: 1 }, amounts: { booked: { amount: "650.50" } }, page: 1, pageSize: 20 });
    return send(null);
  });
  await page.goto("/appointments");
  await expect(page.locator("thead th").filter({hasText:/^Created By$/})).toBeVisible();
  for (const name of ["Age", "Gender", "Time"]) await expect(page.locator("thead th").filter({hasText:new RegExp(`^${name}$`)})).toHaveCount(0);
  await expect(page.getByRole("cell", { name: "Reception Staff", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "View", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Patient and booking details" });
  const detail = name => dialog.locator("dl > div").filter({ has: page.locator("dt", { hasText: new RegExp(`^${name}$`) }) });
  await expect(detail("Age").locator("dd")).toHaveText("35");
  await expect(detail("Gender").locator("dd")).toHaveText("Female");
  await expect(detail("Created By").locator("dd")).toHaveText("Reception Staff");
  await expect(detail("Appointment date").locator("dd")).toHaveText("2026-10-20");
  // Booking at 18:35 UTC is the following date in Bangladesh, independent of visit date.
  const formatted = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" }).format(new Date(createdAt));
  await expect(detail("Time & date").locator("dd")).toHaveText(`${formatted} (Bangladesh time)`);
  await expect(dialog.getByRole("link", { name: "Full patient profile", exact: true })).toHaveCount(0);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
  await dialog.getByRole("button", { name: "Close", exact: true }).last().click();
  await expect(dialog).toHaveCount(0);
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
});
