const { test, expect } = require("@playwright/test");
const fs = require("node:fs/promises");
const AxeBuilder = require("@axe-core/playwright").default;

test("appointment Print renders both branded copies on one A4 page with the actual printer and Bangladesh time", async ({ page, context }, testInfo) => {
  const row = { id:"55555555-5555-4555-8555-555555555555", patientName:"Ayesha Rahman", mrn:"000123", phone:"01712345678", gender:"female", ageYears:32, ageRecordedOn:"2026-10-16", doctorName:"Dr. Farhan Ahmed", doctorQualification:"MBBS, FCPS (Medicine)\nConsultant Physician", doctorDepartment:"Medicine", doctorRoom:"201", date:"2026-10-20", serialNumber:7, visitType:"follow_up", amount:"350.00", status:"booked", referenceName:"Dr. S. Rahman", referenceCode:"REF000001", createdAt:"2026-10-16T12:15:00Z", createdByName:"Booking Staff", revision:1 };
  const data = { appointment:row, printedBy:{id:"11111111-1111-4111-8111-111111111111",name:"Print Operator"}, printedAt:"2026-10-16T18:35:00Z", hospital:{displayName:"Greenlife Medical Centre",logoUrl:"https://hospital.test/logo.svg",address:"24 Green Road, Dhaka, Bangladesh",phone:"01700-000000",email:"care@greenlife.test",website:"https://greenlife.test",primaryColor:"#0f766e",printFooter:"Please bring this slip and your previous medical documents."} };
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0f766e"/><path d="M27 14h10v13h13v10H37v13H27V37H14V27h13z" fill="white"/></svg>';
  let printRequests=0;
  const errors=[], writes=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.addInitScript(()=>{window.__printCalls=0;window.print=()=>{window.top.__printCalls=(window.top.__printCalls || 0)+1;};});
  await context.route("https://hospital.test/logo.svg",route=>route.fulfill({status:200,contentType:"image/svg+xml",body:svg}));
  await page.route("**/api/v1/**",async route=>{
    const request=route.request(), path=new URL(request.url()).pathname.replace(/^.*\/api\/v1/,"");
    const send=value=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({success:true,data:value})});
    if(path.startsWith("/auth/"))return send({user:{id:data.printedBy.id,tenantId:"22222222-2222-4222-8222-222222222222",fullName:"Print Operator"},accessToken:"fixture",permissions:["appointment.view"],roles:["staff"],isPlatformAdmin:false});
    if(request.method()!=="GET")writes.push(path);
    if(path==="/branding/appearance")return send({displayName:data.hospital.displayName});
    if(path===`/appointments/${row.id}/print`){printRequests++;return send({...data,printedAt:printRequests > 1 ? "2026-10-16T18:36:00Z" : data.printedAt});}
    if(path==="/appointments/doctors")return send([]);
    if(path==="/appointments/schedules")return send([]);
    if(path==="/appointments")return send({items:[row],total:1,page:1,pageSize:20,counts:{booked:1},amounts:{booked:{amount:"350.00"}}});
    return send(null);
  });
  await page.goto("/appointments");
  const button=page.getByRole("button",{name:"Print",exact:true});
  await expect(button).toHaveClass(/bg-teal-700/);
  await button.click();
  const dialog=page.getByRole("dialog",{name:"Appointment print preview",exact:true});
  const frame=page.frameLocator('iframe[title="Appointment print document"]');
  await expect(frame.getByRole("region",{name:"Hospital Copy",exact:true})).toBeVisible();
  await expect(frame.getByRole("region",{name:"Patient Copy",exact:true})).toBeVisible();
  await expect(frame.getByLabel("Dotted cut line",{exact:true})).toBeVisible();
  for(const copy of ["Hospital Copy","Patient Copy"]){
    const slip=frame.getByRole("region",{name:copy,exact:true});
    await expect(slip).toContainText(data.hospital.address);
    await expect(slip).toContainText(row.patientName);await expect(slip).toContainText(row.doctorName);await expect(slip).toContainText("Room 201");
    await expect(slip).toContainText("Printed by: Print Operator");await expect(slip).toContainText("Booked by");await expect(slip).toContainText("Booking Staff");
    await expect(slip).toContainText("17 Oct 2026, 00:35 (Bangladesh time)");
    await expect(slip.getByRole("img",{name:"Hospital logo",exact:true})).toBeVisible();
  }
  await expect.poll(()=>page.evaluate(()=>window.__printCalls)).toBe(1);
  await expect(dialog.getByRole("button",{name:"Print / Save PDF",exact:true})).toBeEnabled();
  await dialog.getByRole("button",{name:"Print / Save PDF",exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.__printCalls)).toBe(2);
  await expect(frame.getByRole("region",{name:"Hospital Copy",exact:true})).toContainText("17 Oct 2026, 00:36 (Bangladesh time)");
  const html=await frame.locator("html").evaluate(element=>`<!doctype html>${element.outerHTML}`);
  const pdfPage=await context.newPage();
  await pdfPage.setViewportSize({width:850,height:1150});
  await pdfPage.setContent(html,{waitUntil:"networkidle"});await pdfPage.emulateMedia({media:"print"});
  const pdf=await pdfPage.pdf({preferCSSPageSize:true,printBackground:true});
  expect(pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length).toBe(1);
  const pdfPath=testInfo.outputPath("appointment-slip.pdf");await fs.writeFile(pdfPath,pdf);await testInfo.attach("A4 hospital and patient copies",{path:pdfPath,contentType:"application/pdf"});
  await pdfPage.screenshot({path:testInfo.outputPath("appointment-slip.png"),fullPage:true});
  await pdfPage.close();
  const accessibility=await new AxeBuilder({page}).analyze();expect(accessibility.violations).toEqual([]);
  expect(writes).toEqual([]);expect(errors).toEqual([]);
});
