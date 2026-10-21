const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

test("Users references manage non-login contacts, default selection and booking ID/name lookup", async ({ page }) => {
  const doctorId = "44444444-4444-4444-8444-444444444444", refs = [], appointments = [], writes = [], errors = [];
  let nextId = 1;
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/v1/**", async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname.replace(/^.*\/api\/v1/, ""), method = request.method();
    const send = data => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data }) });
    if (path.startsWith("/auth/")) return send({ user: { id: "11111111-1111-4111-8111-111111111111", tenantId: "22222222-2222-4222-8222-222222222222", fullName: "Reception" }, accessToken: "fixture", permissions: ["user.view", "user.create", "user.update", "appointment.view", "appointment.create", "patient.view"], roles: ["staff"], isPlatformAdmin: false });
    if (path === "/branding/appearance") return send({ displayName: "Hospital" });
    if (path === "/locations/districts") return send([{id:"1",name:"Comilla",bnName:"কুমিল্লা"}]);
    if (path === "/locations/upazilas") return send([{id:"1",parentId:"1",name:"Debidwar",bnName:"দেবিদ্বার"}]);
    if (path === "/locations/unions") return send([{id:"1",parentId:"1",name:"Subil",bnName:"সুবিল"}]);
    if (method !== "GET") writes.push({ path, method, body: request.postDataJSON() });
    if (["/references", "/references/booking"].includes(path) && method === "GET") {
      const search = (url.searchParams.get("search") || "").toLowerCase();
      const items = refs.filter(row => !row.deleted && `${row.code} ${row.name}`.toLowerCase().includes(search));
      return send({ items, total: items.length, page: 1, pageSize: 20, defaultReference: refs.find(row => row.isDefault && !row.deleted) || null });
    }
    if (path === "/references" && method === "POST") {
      const n = nextId++, row = { ...request.postDataJSON(), id: `aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12,"0")}`, code: `REF${String(n).padStart(6,"0")}`, revision: 1, isDefault: false };
      refs.push(row); return send(row);
    }
    if (path === "/references/default") {
      const { referenceId } = request.postDataJSON();
      refs.forEach(row => { row.isDefault = row.id === referenceId; row.revision++; });
      return send(refs.find(row => row.isDefault) || null);
    }
    if (path.startsWith("/references/") && method === "PATCH") { const row = refs.find(row => path.endsWith(row.id)); Object.assign(row, request.postDataJSON(), { revision: row.revision + 1 }); return send(row); }
    if (path.startsWith("/references/") && method === "DELETE") { const row = refs.find(row => path.endsWith(row.id)); row.deleted = true; return send(row); }
    if (path === "/appointments/doctors") return send([{ id: doctorId, fullName: "Dr Test", newVisitFee: "500.00", followUpFee: "300.00" }]);
    if (path === "/appointments/schedules") return send([]);
    if (path === "/appointments/reception/lookup") return send([]);
    if (path === "/appointments/reception") {
      const body = request.postDataJSON(), reference = refs.find(row => row.id === body.referenceId);
      const row = { ...body, id: "55555555-5555-4555-8555-555555555555", canonicalPatientId: "33333333-3333-4333-8333-333333333333", patientName: body.name, doctorName: "Dr Test", phone: body.phone, ageYears: body.age, ageRecordedOn: body.date, amount: "500.00", mrn: "000001", serialNumber: null, estimatedSerialNumber: 1, status: "pending", createdAt: new Date().toISOString(), createdByName: "Reception", referenceName: reference?.name, referenceCode: reference?.code, revision: 1 };
      appointments.push(row); return send(row);
    }
    if (path === "/appointments") return send({ items: appointments, total: appointments.length, page: 1, pageSize: 20, counts: { pending: appointments.length }, amounts: { pending: { amount: String(appointments.length * 500) } } });
    return send(null);
  });
  await page.goto("/users/references");
  await expect(page.getByRole("link", {name:"Employee",exact:true})).toHaveAttribute("href","/users");
  await expect(page.getByRole("link", {name:"Reference",exact:true})).toHaveAttribute("href","/users/references");
  const create = async name => {
    await page.getByRole("button",{name:"Add reference",exact:true}).click();
    const dialog = page.getByRole("dialog",{name:"Create reference",exact:true});
    await expect(dialog.getByLabel(/password|email|login/i)).toHaveCount(0);
    await dialog.getByLabel("Name",{exact:true}).fill(name);
    await dialog.getByLabel("Phone",{exact:true}).fill("01712345678");
    await dialog.getByLabel("Designation",{exact:true}).fill("Consultant");
    await dialog.getByLabel("Address",{exact:true}).fill("Dhaka");
    await dialog.getByRole("button",{name:"Save reference",exact:true}).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("row").filter({hasText:name})).toBeVisible();
  };
  await create("Default Referral"); await create("Other Referral");
  await page.getByLabel("Default reference",{exact:true}).selectOption(refs[0].id);
  await expect(page.getByRole("row").filter({hasText:"REF000001"}).getByRole("button",{name:"Delete",exact:true})).toBeDisabled();
  const other = page.getByRole("row").filter({hasText:"REF000002"});
  await other.getByRole("button",{name:"Edit",exact:true}).click();
  let dialog = page.getByRole("dialog",{name:"Edit reference",exact:true});
  await dialog.getByLabel("Designation",{exact:true}).fill("Senior Consultant");
  await dialog.getByRole("button",{name:"Save reference",exact:true}).click();
  await expect(other).toContainText("Senior Consultant");
  await page.getByRole("link",{name:"All",exact:true}).click();
  await page.getByRole("button",{name:"Book appointment",exact:true}).click();
  await expect(page).toHaveURL(/\/appointments\/book/);
  dialog = page.locator("form").filter({has:page.getByLabel("Doctor name",{exact:true})});
  await expect(dialog).toContainText("REF000001"); await expect(dialog).toContainText("Default Referral");
  const search = dialog.getByLabel("Reference (ID or name)",{exact:true});
  await search.fill("Other");
  await dialog.getByRole("list",{name:"Reference search results"}).getByRole("button",{name:/REF000002/}).click();
  await expect(dialog).toContainText("REF000002");
  await search.fill("REF000001");
  await expect(search).toHaveValue("");
  await expect(dialog).toContainText("Default Referral");
  await search.fill("REF000002"); await expect(search).toHaveValue("");
  await dialog.getByLabel("Doctor name",{exact:true}).selectOption(doctorId);
  await dialog.getByLabel("Phone number",{exact:true}).fill("01899999999");
  await dialog.getByLabel("Patient name",{exact:true}).fill("Referred Patient");
  await dialog.getByLabel("Age (years)",{exact:true}).fill("30");
  await dialog.getByLabel("Gender",{exact:true}).selectOption("female");
  for(const [label,name] of [["District","Comilla"],["Upazila","Debidwar"],["Union","Subil"]]){await dialog.getByRole("combobox",{name:new RegExp(`^${label}`)}).click();await dialog.getByRole("option",{name:new RegExp(name)}).click();}
  await dialog.getByRole("button",{name:"Book appointment",exact:true}).click(); await expect(dialog).toHaveCount(0);
  await page.getByRole("link",{name:"View appointments",exact:true}).click();
  const booked = page.getByRole("row").filter({hasText:"Referred Patient"});
  await expect(booked).toContainText("Other Referral"); await expect(booked).toContainText("REF000002");
  expect(writes.find(row=>row.path==="/appointments/reception").body.referenceId).toBe(refs[1].id);
  await booked.getByRole("button",{name:"View",exact:true}).click();
  await expect(page.getByRole("dialog")).toContainText("Other Referral");
  await page.getByRole("dialog").getByRole("button",{name:"Close",exact:true}).last().click();
  await page.getByRole("link",{name:"Reference",exact:true}).click();
  await page.getByRole("row").filter({hasText:"REF000002"}).getByRole("button",{name:"Delete",exact:true}).click();
  await page.getByRole("dialog",{name:"Delete reference?",exact:true}).getByRole("button",{name:"Delete reference",exact:true}).click();
  await expect(page.getByRole("row").filter({hasText:"REF000002"})).toHaveCount(0);
  expect(writes.filter(row=>row.path.startsWith("/users"))).toEqual([]);
  const accessibility = await new AxeBuilder({page}).analyze(); expect(accessibility.violations).toEqual([]);
  expect(errors).toEqual([]);
});

test("reference management is hidden and not fetched without user viewing permission", async ({page}) => {
  const paths=[];
  await page.route("**/api/v1/**",async route=>{
    const path=new URL(route.request().url()).pathname;paths.push(path);
    const data=path.includes("/auth/") ? {user:{id:"11111111-1111-4111-8111-111111111111",tenantId:"22222222-2222-4222-8222-222222222222",fullName:"Viewer"},accessToken:"fixture",permissions:["appointment.view"],roles:["staff"],isPlatformAdmin:false} : {};
    return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({success:true,data})});
  });
  await page.goto("/users/references");
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("You do not have permission to view references.");
  await expect(page.getByRole("link",{name:"Reference",exact:true})).toHaveCount(0);
  expect(paths.filter(path=>path.includes("/references"))).toEqual([]);
});
