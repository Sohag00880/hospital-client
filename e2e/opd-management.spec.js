const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

test("OPD manages arrival, consultation, completion and searchable status records", async ({ page }) => {
  const doctorId = "44444444-4444-4444-8444-444444444444";
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());
  const errors = [], writes = [];
  page.on("pageerror", error => errors.push(error.message));
  const rows = [
    { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", patientName: "Ayesha Patient", phone: "01711111111", status: "booked", serialNumber: 1 },
    { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", patientName: "Bilal Patient", phone: "01822222222", status: "booked", serialNumber: 2 },
    { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", patientName: "Chaya Patient", phone: "01933333333", status: "pending", serialNumber: null, estimatedSerialNumber: 3 },
    { id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", patientName: "Cancelled Patient", phone: "01644444444", status: "cancelled", serialNumber: 4 },
  ].map((row, index) => ({ ...row, doctorId, doctorName: "Dr Test", date, mrn: String(index + 1).padStart(6, "0"), ageYears: 30, gender: "female", visitType: "new", amount: "500.00", createdAt: new Date().toISOString(), revision: 1, checkedInAt: row.status === "booked" ? new Date().toISOString() : null }));
  await page.route("**/api/v1/**", async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname.replace(/^.*\/api\/v1/, "");
    const send = (data, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ success: status === 200, data }) });
    if (path.startsWith("/auth/")) return send({ user: { id: "11111111-1111-4111-8111-111111111111", tenantId: "22222222-2222-4222-8222-222222222222", fullName: "OPD Staff" }, accessToken: "fixture", permissions: ["appointment.view", "appointment.update"], roles: ["tenant_admin"], isPlatformAdmin: false });
    if (path === "/branding/appearance") return send({ displayName: "Hospital" });
    if (path === "/appointments/doctors") return send([{ id: doctorId, fullName: "Dr Test" }]);
    if (path === "/appointments/schedules") return send([]);
    if (path === "/appointments/queue") return send(rows.filter(row => ["booked", "in_consultation"].includes(row.status)));
    if (["/appointments", "/appointments/opd"].includes(path) && request.method() === "GET") {
      const status = url.searchParams.get("status"), search = (url.searchParams.get("search") || "").toLowerCase();
      const visible = path.endsWith("/opd") ? rows.filter(row => row.checkedInAt) : rows;
      const items = visible.filter(row => (!status || row.status === status) && (!search || `${row.patientName} ${row.mrn} ${row.phone}`.toLowerCase().includes(search)));
      const counts = {}, amounts = {};
      for (const row of visible) { counts[row.status] = (counts[row.status] || 0) + 1; amounts[row.status] = { amount: String(counts[row.status] * 500) }; }
      return send({ items, total: items.length, counts, amounts, page: 1, pageSize: 20 });
    }
    if (request.method() === "POST" && path.startsWith("/appointments/")) {
      const body = request.postDataJSON();
      writes.push({ path, body });
      const operation = path.split("/").at(-1);
      const row = operation === "next" ? rows.find(row => row.status === "booked") : rows.find(row => path.includes(row.id));
      if (!row) return send(null, 404);
      if (operation === "confirm") { row.status = "booked"; row.serialNumber = 3; row.checkedInAt = new Date().toISOString(); }
      if (operation === "next" || operation === "start") { row.status = "in_consultation"; row.startedAt = new Date().toISOString(); }
      if (operation === "complete") { row.status = "completed"; row.completedAt = new Date().toISOString(); }
      row.revision++;
      return send(row);
    }
    return send(null);
  });
  await page.goto("/opd");
  await expect(page.getByRole("button", { name: /print|save pdf/i })).toHaveCount(0);
  const views = page.getByRole("group", { name: "OPD views" });
  await expect(page.getByRole("row").filter({ hasText: "Ayesha Patient" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Call next", exact: true })).toBeDisabled();
  await page.getByLabel("Doctor", { exact: true }).selectOption(doctorId);
  await expect(views.getByRole("button", { name: /^Booked/ })).toHaveCount(0);
  for (const name of ["Edit serial", "History", "Reschedule", "Cancel", "Confirm"]) await expect(page.getByRole("button",{name,exact:true})).toHaveCount(0);
  await views.getByRole("button", { name: "All patients", exact: true }).click();
  await expect(page.getByRole("row").filter({hasText:"Chaya Patient"})).toHaveCount(0);
  await expect(page.getByRole("row").filter({hasText:"Cancelled Patient"})).toHaveCount(0);
  await page.getByRole("link", {name:"All Appointments",exact:true}).click();
  await page.getByRole("row").filter({ hasText: "Chaya Patient" }).getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByRole("row").filter({hasText:"Chaya Patient"}).getByRole("cell",{name:/^Booked/})).toBeVisible();
  await page.getByRole("link", {name:"OPD",exact:true}).click();
  await page.getByLabel("Doctor", {exact:true}).selectOption(doctorId);
  await expect(page.getByRole("row").filter({ hasText: "Chaya Patient" })).toBeVisible();
  await expect(page.getByRole("row").filter({hasText:"Ayesha Patient"}).getByRole("button",{name:"Start consultation",exact:true})).toBeEnabled();
  await expect(page.getByRole("row").filter({hasText:"Bilal Patient"}).getByRole("button",{name:"Start consultation",exact:true})).toBeDisabled();
  await expect(page.getByRole("row").filter({hasText:"Chaya Patient"}).getByRole("button",{name:"Start consultation",exact:true})).toBeDisabled();
  // Searching for a later serial must not allow skipping the unfiltered queue.
  await page.getByLabel("Search patient",{exact:true}).fill("Bilal");
  await expect(page.getByRole("row").filter({hasText:"Ayesha Patient"})).toHaveCount(0);
  await expect(page.getByRole("row").filter({hasText:"Bilal Patient"}).getByRole("button",{name:"Start consultation",exact:true})).toBeDisabled();
  await page.getByLabel("Search patient",{exact:true}).fill("");
  await page.getByRole("button", { name: "Call next", exact: true }).click();
  const current = page.getByRole("region", { name: "Current consultations" });
  await expect(current.getByRole("heading", { name: "Ayesha Patient" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Call next", exact: true })).toBeDisabled();
  await expect(page.getByRole("row").filter({ hasText: "Bilal Patient" }).getByRole("button", { name: "Start consultation", exact: true })).toBeDisabled();
  await current.getByRole("button", { name: "Complete consultation", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).last().click();
  expect(writes.filter(write => write.path.endsWith("/complete"))).toHaveLength(0);
  await current.getByRole("button", { name: "Complete consultation", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Complete consultation", exact: true }).click();
  await expect(current).toHaveCount(0);
  await views.getByRole("button", { name: /^Completed/ }).click();
  await expect(page.getByRole("row").filter({ hasText: "Ayesha Patient" })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "Ayesha Patient" }).getByRole("button", { name: "Complete", exact: true })).toHaveCount(0);
  await page.getByLabel("Search patient", { exact: true }).fill("01711111111");
  await expect(page.getByRole("row").filter({ hasText: "Ayesha Patient" })).toBeVisible();
  await page.getByLabel("Search patient", { exact: true }).fill("");
  await views.getByRole("button", { name: "Live queue", exact: true }).click();
  await page.getByRole("row").filter({ hasText: "Bilal Patient" }).getByRole("button", { name: "Start consultation", exact: true }).click();
  await expect(current.getByRole("heading", { name: "Bilal Patient" })).toBeVisible();
  await views.getByRole("button", { name: /^In consultation/ }).click();
  await expect(page.getByRole("row").filter({ hasText: "Bilal Patient" })).toBeVisible();
  await views.getByRole("button", { name: /^Cancelled/ }).click();
  await expect(page.getByRole("row").filter({ hasText: "Cancelled Patient" })).toHaveCount(0);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
  expect(writes.filter(write => write.path.endsWith("/complete"))).toHaveLength(1);
  expect(writes.find(write => write.path.endsWith("/start")).body.expectedRevision).toBe(1);
  expect(errors).toEqual([]);
});
