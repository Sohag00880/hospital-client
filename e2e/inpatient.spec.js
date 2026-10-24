const {test,expect}=require("@playwright/test");
const ids={user:"11111111-1111-4111-8111-111111111111",patient:"22222222-2222-4222-8222-222222222222",doctor:"33333333-3333-4333-8333-333333333333",ward:"44444444-4444-4444-8444-444444444444",room:"55555555-5555-4555-8555-555555555555",bed:"66666666-6666-4666-8666-666666666666",admission:"77777777-7777-4777-8777-777777777777",medication:"88888888-8888-4888-8888-888888888888"};
const fullAccess=["inpatient.view","inpatient.admit","inpatient.manage","inpatient.discharge","patient.view","patient.create","billing.view","billing.create","billing.approve"];
async function install(page,{grants=fullAccess,empty=false,discharged=false,duplicate=false}={}){
 const writes=[],setup={wards:empty?[]:[{id:ids.ward,name:"General Medicine",type:"General"}],rooms:empty?[]:[{id:ids.room,wardId:ids.ward,name:"Room 101"}],beds:empty?[]:[{id:ids.bed,name:"Bed A",roomId:ids.room,roomName:"Room 101",wardId:ids.ward,wardName:"General Medicine",wardType:"General",status:"available",revision:1,admissionId:discharged?null:ids.admission,patientName:discharged?null:"Ayesha Rahman",mrn:"000123"}],staff:[{id:ids.user,name:"Nurse Sara",isDoctor:false,canReceiveHandover:true},{id:ids.doctor,name:"Dr Farhan Ahmed",isDoctor:true,canReceiveHandover:false}]};
 const a={id:ids.admission,patientId:ids.patient,doctorId:ids.doctor,doctorName:"Dr Farhan Ahmed",patientName:"Ayesha Rahman",mrn:"000123",phone:"01700000000",bedId:discharged?null:ids.bed,bedName:"Bed A",wardName:"General Medicine",roomName:"Room 101",status:discharged?"discharged":"admitted",reason:"Inpatient observation and ongoing assessment",allergies:"No known drug allergies â€” verified with patient",emergencyContact:"Md Rahman Â· Husband Â· 01700000000",revision:1,admittedAt:new Date(Date.now()-86400000).toISOString(),dischargedAt:discharged?new Date().toISOString():null};
 let admitted=!empty;
 await page.route("**/api/v1/**",async route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname.replace(/^.*\/api\/v1/,"");
  const send=(data,status=200)=>route.fulfill({status,contentType:"application/json",body:JSON.stringify({success:true,data})});
  if(path.startsWith("/auth/"))return send({user:{id:ids.user,tenantId:ids.ward,fullName:"Nurse Sara"},accessToken:"fixture",permissions:grants,roles:["staff"],isPlatformAdmin:false});
  if(path==="/branding/appearance")return send({displayName:"Northfield Hospital",shortName:"Northfield"});
  if(req.method()!=="GET"){
   const body=req.postDataJSON();writes.push({path,body});

   if(path==="/inpatient/wards"){const w={...body,id:ids.ward};setup.wards.push(w);return send(w,201);}
   if(path==="/inpatient/rooms"){const r={...body,id:ids.room};setup.rooms.push(r);return send(r,201);}
   if(path==="/inpatient/beds"){const b={...body,id:ids.bed,wardId:ids.ward,wardName:setup.wards[0].name,roomName:setup.rooms[0].name,wardType:"General",status:"available",revision:1};setup.beds.push(b);return send(b,201);}
   if(path==="/inpatient/admissions"){
    if(duplicate&&body.newPatient)return route.fulfill({status:409,contentType:"application/json",body:JSON.stringify({success:false,error:{code:"POSSIBLE_DUPLICATE",message:"Possible matching patients found",details:{candidates:[{id:ids.patient,mrn:"000123",firstName:"Ayesha",lastName:"Rahman",phone:"01700000000"}]}}})});
    Object.assign(a,body,{status:"admitted",admissionNumber:"ADM-2026-000001"});admitted=true;
    a.patient={id:ids.patient,mrn:body.newPatient?"000124":"000123",firstName:body.newPatient?.firstName||"Ayesha",lastName:body.newPatient?.lastName||"Rahman"};return send(a,201);
   }
   return send(body,201);
  }
  if(path==="/patients")return send({items:[{id:ids.patient,firstName:"Ayesha",lastName:"Rahman",mrn:"000123",phone:"01700000000",status:"active"}],total:1});
  if(path==="/inpatient/setup")return send(setup);
  if(path==="/inpatient/admissions")return send({items:admitted?[a]:[],total:admitted?1:0,page:1,pageSize:20,summary:{active:admitted?1:0,unallocated:0,discharged:0}});
  return send(null);
 });
 return {writes,setup};
}
test("staff can set up a ward, room and bed, then admit a registered patient",async({page})=>{
 const {writes}=await install(page,{empty:true});await page.goto("/inpatient/setup");
 await page.getByRole("button",{name:"Add ward",exact:true}).click();let dialog=page.getByRole("dialog");
 await dialog.getByLabel("Ward name").fill("General Medicine");await dialog.getByLabel("Ward type").selectOption("General");await dialog.getByRole("button",{name:"Save",exact:true}).click();await expect(dialog).toHaveCount(0);
 await page.getByRole("button",{name:"Add room",exact:true}).click();dialog=page.getByRole("dialog");await dialog.getByLabel("Ward",{exact:true}).selectOption(ids.ward);await dialog.getByLabel("Room name / number").fill("Room 101");await dialog.getByRole("button",{name:"Save",exact:true}).click();await expect(dialog).toHaveCount(0);
 await page.getByRole("button",{name:"Add bed",exact:true}).click();dialog=page.getByRole("dialog");await dialog.getByLabel("Room",{exact:true}).selectOption(ids.room);await dialog.getByLabel("Bed name / number").fill("Bed A");await dialog.getByRole("button",{name:"Save",exact:true}).click();await expect(dialog).toHaveCount(0);
 await page.getByRole("main").getByRole("link",{name:"New Admission",exact:true}).first().click();
 await expect(page).toHaveURL(/\/inpatient\/new$/);await expect(page.getByRole("dialog")).toHaveCount(0);
 await page.getByLabel("Find registered patient",{exact:true}).fill("Ayesha");await page.getByRole("button",{name:/Ayesha Rahman/}).click();
 await page.getByLabel("Admitting doctor",{exact:true}).selectOption(ids.doctor);await page.getByLabel("Bed allocation",{exact:false}).selectOption(ids.bed);await page.getByLabel("Reason for admission",{exact:false}).fill("Observation");
 await page.getByRole("button",{name:"Admit patient",exact:true}).click();await expect(page.getByRole("heading",{name:"Patient admitted successfully"})).toBeVisible();await expect(page.getByText("ADM-2026-000001",{exact:true})).toBeVisible();

 const admissionWrite=writes.find(w=>w.path==="/inpatient/admissions");expect(admissionWrite.body).not.toHaveProperty("allergies");expect(admissionWrite.body).not.toHaveProperty("emergencyContact");expect(admissionWrite.body.bedId).toBe(ids.bed);expect(admissionWrite.body.requestKey).toMatch(/^[a-f0-9-]{36}$/);
});
test("Admissions and bed board have no amount actions or chart links",async({page})=>{
 await install(page);await page.goto("/inpatient");
 await expect(page.getByRole("row").filter({hasText:"Ayesha Rahman"})).toBeVisible();
 await expect(page.getByRole("button",{name:/^(Add|Edit) amount$/})).toHaveCount(0);
 await expect(page.getByRole("link",{name:/Open chart/i})).toHaveCount(0);
 await expect(page.locator('a[href="/inpatient/'+ids.admission+'"]')).toHaveCount(0);
 await page.goto("/inpatient/beds");await expect(page.getByText("Ayesha Rahman",{exact:false})).toBeVisible();
 await expect(page.locator('a[href="/inpatient/'+ids.admission+'"]')).toHaveCount(0);
 const response=await page.goto('/inpatient/'+ids.admission);expect(response.status()).toBe(404);
});
test("read-only staff cannot create admissions or change bed status",async({page})=>{
 await install(page,{grants:["inpatient.view"]});await page.goto("/inpatient/beds");
 await expect(page.getByText("Ayesha Rahman",{exact:false})).toBeVisible();
 await expect(page.getByRole("link",{name:"New Admission",exact:true})).toHaveCount(0);
 await expect(page.getByRole("button",{name:"Update status"})).toHaveCount(0);
});



test("Settings Configure PC Bill saves a percentage and reloads it",async({page})=>{
 await install(page,{grants:[...fullAccess,"tenant.view","tenant.update"]});let config={percentage:0,revision:0},saves=0;
 await page.route("**/api/v1/tenant/configure/pc-bill",async route=>{if(route.request().method()==="PATCH"){const body=route.request().postDataJSON();config={percentage:body.percentage,revision:config.revision+1};saves++;}return route.fulfill({contentType:"application/json",body:JSON.stringify({success:true,data:config})});});
 await page.goto("/settings/configure/pc-bill");await expect(page.getByRole("button",{name:"Configure",exact:true})).toBeVisible();await expect(page.getByRole("link",{name:"PC Bill",exact:true})).toBeVisible();
 await page.getByLabel("Reference percentage (%)",{exact:true}).fill("12.5");await page.getByRole("button",{name:"Save",exact:true}).click();await expect(page.getByRole("status")).toContainText("PC Bill percentage saved.");expect(saves).toBe(1);
 await page.reload();await expect(page.getByLabel("Reference percentage (%)",{exact:true})).toHaveValue("12.5");await page.getByLabel("Reference percentage (%)",{exact:true}).fill("101");await page.getByRole("button",{name:"Save",exact:true}).click();expect(saves).toBe(1);
});

test("a walk-in patient can register and admit directly from the new page",async({page})=>{
 const {writes}=await install(page,{discharged:true});await page.goto("/inpatient/new");
 await expect(page.getByRole("dialog")).toHaveCount(0);await page.getByRole("button",{name:"New patient",exact:true}).click();
 await page.getByLabel("First name",{exact:true}).fill("Direct");await page.getByLabel("Last name",{exact:false}).fill("Admission");await page.getByLabel("Phone",{exact:false}).fill("01712345678");await page.getByLabel("Age (years)",{exact:false}).fill("40");await page.getByLabel("Sex",{exact:true}).selectOption("female");await page.getByLabel("Address",{exact:false}).fill("Dhaka");await page.getByLabel("Admitting doctor",{exact:true}).selectOption(ids.doctor);
 await page.getByRole("button",{name:"Register & admit patient",exact:true}).click();await expect(page.getByRole("heading",{name:"Patient admitted successfully"})).toBeVisible();
 await expect(page.getByText("000124",{exact:true})).toBeVisible();await expect(page.getByRole("link",{name:"Add charges",exact:true})).toHaveAttribute("href",`/billing/ipd/services?admission=${ids.admission}&add=1`);
 const saved=writes.find(row=>row.path==="/inpatient/admissions");expect(saved.body.newPatient).toMatchObject({firstName:"Direct",lastName:"Admission",phone:"01712345678",ageYears:40,sex:"female"});expect(saved.body).not.toHaveProperty("patientId");expect(writes.every(row=>row.path==="/inpatient/admissions")).toBe(true);
});
test("duplicate review can reuse the existing patient instead of creating another",async({page})=>{
 const {writes}=await install(page,{duplicate:true,discharged:true});await page.goto("/inpatient/new");await page.getByRole("button",{name:"New patient",exact:true}).click();await page.getByLabel("First name",{exact:true}).fill("Ayesha");await page.getByLabel("Phone",{exact:false}).fill("01700000000");await page.getByLabel("Admitting doctor",{exact:true}).selectOption(ids.doctor);await page.getByRole("button",{name:"Register & admit patient",exact:true}).click();
 await expect(page.getByRole("heading",{name:"Review matching patients"})).toBeVisible();await page.getByRole("button",{name:"Use existing patient",exact:true}).click();await page.getByRole("button",{name:"Admit patient",exact:true}).click();await expect(page.getByRole("heading",{name:"Patient admitted successfully"})).toBeVisible();expect(writes.at(-1).body.patientId).toBe(ids.patient);expect(writes.at(-1).body).not.toHaveProperty("newPatient");
});
