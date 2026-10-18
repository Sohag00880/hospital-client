const { test, expect } = require("@playwright/test");
const patientId = "33333333-3333-4333-8333-333333333333";
async function session(page, permissions) {
  const paths = [];
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request(), path = new URL(request.url()).pathname.replace(/^.*\/api\/v1/, ""); paths.push({ path, method: request.method(), query: new URL(request.url()).search });
    const send = (data) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data }) });
    if (path.startsWith("/auth/")) return send({ user: { id: "11111111-1111-4111-8111-111111111111", tenantId: "22222222-2222-4222-8222-222222222222", fullName: "Read Only" }, accessToken: "fixture", permissions, roles: ["staff"], isPlatformAdmin: false });
    if (path === "/branding/appearance") return send({ displayName: "Hospital" });
    if (path === `/patients/${patientId}`) return send({ patient: { id: patientId, mrn: "000001", firstName: "Read", lastName: "Only", sex: "unknown", maritalStatus: "unknown", status: "active", revision: 1, createdAt: "2026-01-01T00:00:00Z" }, contacts: [], addresses: [], identifiers: [], aliases: [], canonicalPatient: null });
    if (path === "/patients") return send({ items: [], page: 1, pageSize: 20, total: 0 });
    if (path.endsWith("/timeline")) return send({ items: [], page: 1, pageSize: 20, total: 0 });
    return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ success: false }) });
  });
  return paths;
}
test("patient pages do not fetch records without patient viewing permission", async ({ page }) => {
  const paths = await session(page, []);
  await page.goto("/patients"); await expect(page.getByRole("main").getByRole("alert")).toHaveText("You do not have permission to view patients.");
  await page.goto("/patients/new"); await expect(page.getByRole("main").getByRole("alert")).toHaveText("You do not have permission to register patients.");
  await page.goto(`/patients/${patientId}`); await expect(page.getByRole("main").getByRole("alert")).toHaveText("You do not have permission to view this patient.");
  expect(paths.filter((request) => request.path.startsWith("/patients"))).toEqual([]);
});
test("read-only patient profile exposes no edit, merge or timeline write controls", async ({ page }) => {
  const paths = await session(page, ["patient.view"]);
  await page.goto(`/patients/${patientId}`);
  await expect(page.getByRole("heading", { name: "Read Only", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit demographics" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Merge another profile" })).toHaveCount(0);
  await page.getByRole("button", { name: "Contacts", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add guardian" })).toHaveCount(0);
  await page.getByRole("button", { name: "Timeline", exact: true }).click();
  await expect(page.getByLabel("Timeline note", { exact: true })).toHaveCount(0);
  expect(paths.filter((request) => request.path.startsWith("/patients") && request.method !== "GET")).toEqual([]);
});

test("appointment calendar filters the directory and can be cleared", async ({ page }) => {
  const paths = await session(page, ["patient.view"]);
  await page.goto("/patients");
  const calendar = page.getByLabel("Appointment date (Bangladesh time)", { exact: true });
  await expect(calendar).toHaveAttribute("type", "date");
  const today = await page.evaluate(() => new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Dhaka"}).format(new Date()));
  await expect(calendar).toHaveValue(today);
  await expect.poll(() => paths.some(({ path, query }) => path === "/patients" && new URLSearchParams(query).get("appointmentDate") === today)).toBe(true);
  await calendar.fill("2028-02-29");
  await expect.poll(() => paths.some(({ path, query }) => path === "/patients" && new URLSearchParams(query).get("appointmentDate") === "2028-02-29")).toBe(true);
  await page.getByRole("button", { name: "Clear date", exact: true }).click();
  await expect(calendar).toHaveValue("");
  await page.getByPlaceholder("Name, MRN, phone, email or identifier").fill("Amina");
  await expect.poll(() => paths.some(({ path, query }) => path === "/patients" && new URLSearchParams(query).get("search") === "Amina" && !new URLSearchParams(query).has("appointmentDate"))).toBe(true);
});
