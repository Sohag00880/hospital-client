const { test, expect } = require("@playwright/test");

test("pending bookings can cancel and confirmed bookings refund into a separate summary", async ({ page }) => {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());
  const requests = [];
  const rows = ["First Booking", "Second Booking"].map((patientName, index) => ({
    id: `${index + 1}5555555-5555-4555-8555-555555555555`, patientName, mrn: `00000${index + 1}`,
    doctorName: "Dr Test", doctorId: "44444444-4444-4444-8444-444444444444", date,
    amount: "500.00", status: "pending", serialNumber: null, revision: 1,
  }));
  let serial = 0;
  await page.route("**/api/v1/**", async route => {
    const request = route.request(), path = new URL(request.url()).pathname.replace(/^.*\/api\/v1/, "");
    const send = data => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data }) });
    if (path.startsWith("/auth/")) return send({ user: { id: "11111111-1111-4111-8111-111111111111", tenantId: "22222222-2222-4222-8222-222222222222", fullName: "Reception" }, accessToken: "fixture", permissions: ["appointment.view", "appointment.update"], roles: ["tenant_admin"], isPlatformAdmin: false });
    if (path === "/branding/appearance") return send({ displayName: "Hospital" });
    if (path === "/appointments/doctors" || path === "/appointments/schedules") return send([]);
    if (request.method() === "POST") {
      requests.push(path);
      const row = rows.find(row => path.startsWith(`/appointments/${row.id}/`));
      expect(row).toBeTruthy();
      expect(request.postDataJSON().expectedRevision).toBe(row.revision);
      if(path.endsWith("/refund")) {
        const released=row.serialNumber;
        Object.assign(row,{status:"refunded",refundAmount:row.amount,refundedAt:new Date().toISOString(),refundReason:request.postDataJSON().reason,serialNumber:null,revision:row.revision+1});
        for(const later of rows.filter(item=>item.serialNumber>released)) {later.serialNumber--;later.revision++;}
        serial--;
      } else {
        Object.assign(row, { status: "booked", serialNumber: ++serial, revision: row.revision + 1, checkedInAt: new Date().toISOString() });
      }
      return send(row);
    }
    if (path === "/appointments") {
      const pending = rows.filter(row => row.status === "pending");
      const counts={},amounts={};
      for(const row of rows){counts[row.status]=(counts[row.status] || 0)+1;amounts[row.status]={amount:String(counts[row.status]*500)};}
      return send({ items: rows.map(row => ({ ...row, estimatedSerialNumber: row.status === "pending" ? serial + pending.indexOf(row) + 1 : null })), total: 2, page: 1, pageSize: 20,
        counts, amounts });
    }
    return send(null);
  });
  await page.goto("/appointments");
  const totals = page.locator('[aria-label="Amounts by appointment status"]');
  await expect(totals.getByText("In consultation", { exact: true })).toHaveCount(0);
  await expect(totals.getByText("1000.00", { exact: true })).toBeVisible();
  const first = page.getByRole("row").filter({ hasText: "First Booking" });
  const second = page.getByRole("row").filter({ hasText: "Second Booking" });
  await expect(first.getByRole("button",{name:"Cancel",exact:true})).toBeVisible();
  await expect(first.getByRole("button",{name:"Refund",exact:true})).toHaveCount(0);
  await expect(first.getByText("Estimated", { exact: true })).toBeVisible();
  await expect(first.getByRole("button", { name: "Edit serial", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Check in", exact: true })).toHaveCount(0);
  await second.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(second.getByRole("cell").first()).toHaveText("1");
  await expect(second.getByRole("button",{name:"Cancel",exact:true})).toHaveCount(0);
  await expect(second.getByRole("button",{name:"Refund",exact:true})).toBeVisible();
  await expect(first.getByRole("cell").first()).toContainText("2");
  await expect(second.getByRole("button", { name: "Confirm", exact: true })).toHaveCount(0);
  await expect(totals.getByText("500.00", { exact: true })).toHaveCount(2);
  await first.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(first.getByRole("cell").first()).toHaveText("2");
  await expect(first.getByText("Estimated", { exact: true })).toHaveCount(0);
  await expect(totals.getByText("1000.00", { exact: true })).toBeVisible();
  expect(requests).toEqual(rows.slice().reverse().map(row => `/appointments/${row.id}/confirm`));
  await second.getByRole("button",{name:"Refund",exact:true}).click();
  const dialog=page.getByRole("dialog");
  await dialog.getByLabel("Reason",{exact:true}).fill("Patient requested full refund");
  await dialog.getByRole("button",{name:"Refund appointment",exact:true}).click();
  await expect(dialog).toHaveCount(0);
  await expect(totals.locator("p").filter({hasText:/^(Pending|Booked|Completed|Refund|Cancelled)$/})).toHaveText(["Pending","Booked","Completed","Refund","Cancelled"]);
  await expect(totals.locator(":scope > div").filter({has:page.getByText("Refund",{exact:true})})).toContainText("500.00");
  await expect(second.getByRole("button",{name:"Refund",exact:true})).toHaveCount(0);
  await expect(second.getByRole("cell").first()).toHaveText("-");
  await expect(second.getByRole("button",{name:"Edit serial",exact:true})).toHaveCount(0);
  await expect(first.getByRole("cell").first()).toHaveText("1");
  await second.getByRole("button",{name:"View",exact:true}).click();
  const details=page.getByRole("dialog",{name:"Patient and booking details"});
  await expect(details.locator("div.rounded-md").filter({has:page.getByText("Serial",{exact:true})}).locator("dd")).toHaveText("-");
});
