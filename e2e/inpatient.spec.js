const {test,expect}=require("@playwright/test");
const ids={user:"11111111-1111-4111-8111-111111111111",patient:"22222222-2222-4222-8222-222222222222",doctor:"33333333-3333-4333-8333-333333333333",ward:"44444444-4444-4444-8444-444444444444",room:"55555555-5555-4555-8555-555555555555",bed:"66666666-6666-4666-8666-666666666666",admission:"77777777-7777-4777-8777-777777777777",medication:"88888888-8888-4888-8888-888888888888"};
const fullAccess=["inpatient.view","inpatient.admit","inpatient.manage","inpatient.discharge","patient.view","billing.view","billing.create","billing.approve"];
async function install(page,{grants=fullAccess,empty=false,discharged=false}={}){
 const savedCharges=[];
 const writes=[],setup={wards:empty?[]:[{id:ids.ward,name:"General Medicine",type:"General"}],rooms:empty?[]:[{id:ids.room,wardId:ids.ward,name:"Room 101"}],beds:empty?[]:[{id:ids.bed,name:"Bed A",roomId:ids.room,roomName:"Room 101",wardId:ids.ward,wardName:"General Medicine",wardType:"General",status:"available",revision:1,admissionId:discharged?null:ids.admission,patientName:discharged?null:"Ayesha Rahman",mrn:"000123"}],staff:[{id:ids.user,name:"Nurse Sara",isDoctor:false,canReceiveHandover:true},{id:ids.doctor,name:"Dr Farhan Ahmed",isDoctor:true,canReceiveHandover:false}]};
 const a={id:ids.admission,patientId:ids.patient,doctorId:ids.doctor,doctorName:"Dr Farhan Ahmed",patientName:"Ayesha Rahman",mrn:"000123",phone:"01700000000",bedId:discharged?null:ids.bed,bedName:"Bed A",wardName:"General Medicine",roomName:"Room 101",status:discharged?"discharged":"admitted",reason:"Inpatient observation and ongoing assessment",allergies:"No known drug allergies — verified with patient",emergencyContact:"Md Rahman · Husband · 01700000000",revision:1,admittedAt:new Date(Date.now()-86400000).toISOString(),dischargedAt:discharged?new Date().toISOString():null};
 const billEntries=[],expenses=[];
 const billSummary=()=>{const sum=kind=>billEntries.filter(e=>e.kind===kind).reduce((n,e)=>n+Math.round(Number(e.amount)*100),0);const gross=sum("charge")+sum("total_add")-sum("total_reduce")-sum("void"),discount=sum("discount"),paid=sum("payment")-sum("payment_void")-sum("refund"),net=gross-discount;return {gross:(gross/100).toFixed(2),discount:(discount/100).toFixed(2),net:(net/100).toFixed(2),paid:(paid/100).toFixed(2),due:(Math.max(0,net-paid)/100).toFixed(2),expenseTotal:expenses.filter(e=>!e.replaced).reduce((n,e)=>n+Number(e.amount),0).toFixed(2),income:(paid/100-expenses.filter(e=>!e.replaced).reduce((n,e)=>n+Number(e.amount),0)).toFixed(2),credit:(Math.max(0,paid-net)/100).toFixed(2)};};
 const chart={admission:a,timeline:[]};
 let admitted=!empty;
 await page.route("**/api/v1/**",async route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname.replace(/^.*\/api\/v1/,"");
  const send=(data,status=200)=>route.fulfill({status,contentType:"application/json",body:JSON.stringify({success:true,data})});
  if(path.startsWith("/auth/"))return send({user:{id:ids.user,tenantId:ids.ward,fullName:"Nurse Sara"},accessToken:"fixture",permissions:grants,roles:["staff"],isPlatformAdmin:false});
  if(path==="/branding/appearance")return send({displayName:"Northfield Hospital",shortName:"Northfield"});
  if(req.method()!=="GET"){
   const body=req.postDataJSON();writes.push({path,body});

   if(path.endsWith("/bill/payment-edit")){const previous=billEntries.find(e=>e.id===body.paymentId);billEntries.push({...previous,id:crypto.randomUUID(),kind:"payment_void",chargeId:previous.id,description:"Payment replaced",createdAt:new Date().toISOString()});const entry={...body,id:crypto.randomUUID(),kind:"payment",author:"Nurse Sara",createdAt:new Date().toISOString()};billEntries.push(entry);return send(entry,201);}
   if(path.endsWith("/bill/total")){const delta=Number(body.amount)-Number(billSummary().net);const entry={id:crypto.randomUUID(),kind:delta>0?"total_add":"total_reduce",amount:Math.abs(delta).toFixed(2),description:"Total amount changed",author:"Nurse Sara",createdAt:new Date().toISOString()};billEntries.push(entry);return send(entry,201);}
   if(path.endsWith("/bill/expense-edit")){const original=expenses.find(e=>e.id===body.expenseId);original.replaced=true;const saved={...body,id:crypto.randomUUID(),replacesId:original.id,replaced:false,author:"Nurse Sara",createdAt:new Date().toISOString()};expenses.push(saved);return send(saved,201);}
   if(path.endsWith("/bill/expense")){const saved={...body,id:crypto.randomUUID(),author:"Nurse Sara",createdAt:new Date().toISOString()};expenses.push(saved);return send(saved,201);}
   if(path.includes("/bill/")){
    const kind=path.endsWith("/charge")?"charge":path.endsWith("/void")?"void":body.kind;
    const amount=kind==="charge"?(body.category==="bed"?(Number(body.unitPrice)*body.quantity).toFixed(2):body.amount):kind==="void"?billEntries.find(e=>e.id===body.chargeId).amount:body.amount;
    const selectedTemplate=savedCharges.find(e=>e.id===body.catalogId);
    const entry={...body,chargeName:selectedTemplate?.name||"",...(kind==="charge"&&body.category!=="bed"?{quantity:1,unitPrice:body.amount}:{}),id:crypto.randomUUID(),kind,amount,author:"Nurse Sara",createdAt:new Date().toISOString()};billEntries.push(entry);return send(entry,201);
   }
   if(path==="/inpatient/charge-catalog"){const row={...body,id:crypto.randomUUID(),description:body.description||"",active:true,revision:1};savedCharges.push(row);return send(row,201);}
   if(path.startsWith("/inpatient/charge-catalog/")&&req.method()==="DELETE"){const index=savedCharges.findIndex(e=>e.id===path.split("/").at(-1));const [row]=savedCharges.splice(index,1);return send({id:row.id,deleted:true});}
   if(path.startsWith("/inpatient/charge-catalog/")){const row=savedCharges.find(e=>e.id===path.split("/").at(-1));Object.assign(row,body,{revision:row.revision+1});return send(row);}
   if(path.endsWith("/reopen")){Object.assign(a,{status:"admitted",bedId:body.bedId,dischargedAt:null,revision:a.revision+1});chart.timeline.unshift({id:crypto.randomUUID(),kind:"reopen",data:{reason:body.reason,bedId:body.bedId},createdAt:new Date().toISOString(),author:"Nurse Sara"});return send(a,201);}
   if(path.endsWith("/discharge")){const {requestKey,expectedRevision,...data}=body;Object.assign(a,{status:"discharged",bedId:null,dischargedAt:new Date().toISOString()});chart.timeline.push({id:crypto.randomUUID(),kind:"discharge",data,createdAt:new Date().toISOString(),author:"Nurse Sara"});return send(a,201);}
   if(path==="/inpatient/wards"){const w={...body,id:ids.ward};setup.wards.push(w);return send(w,201);}
   if(path==="/inpatient/rooms"){const r={...body,id:ids.room};setup.rooms.push(r);return send(r,201);}
   if(path==="/inpatient/beds"){const b={...body,id:ids.bed,wardId:ids.ward,wardName:setup.wards[0].name,roomName:setup.rooms[0].name,wardType:"General",status:"available",revision:1};setup.beds.push(b);return send(b,201);}
   if(path==="/inpatient/admissions"){Object.assign(a,body);admitted=true;for(const item of body.initialCharges||[]){const saved=savedCharges.find(e=>e.id===item.catalogId),quantity=saved.category==="bed"?item.days:1;billEntries.push({id:crypto.randomUUID(),kind:"charge",category:saved.category,catalogId:saved.id,chargeName:saved.name,description:saved.description,quantity,unitPrice:item.price,amount:(Number(item.price)*quantity).toFixed(2),author:"Nurse Sara",createdAt:new Date().toISOString()});}return send(a,201);}
   return send(body,201);
  }
  if(path===`/inpatient/admissions/${ids.admission}/bill`)return send({items:billEntries,expenses,summary:billSummary(),status:a.status});
  if(path==="/inpatient/due")return send({items:admitted&&url.searchParams.get("patientId")===a.mrn?[{...a,billing:billSummary()}]:[]});
  if(path==="/inpatient/charge-catalog")return send(savedCharges);
  if(path==="/patients")return send({items:[{id:ids.patient,firstName:"Ayesha",lastName:"Rahman",mrn:"000123",phone:"01700000000",status:"active"}],total:1});
  if(path==="/inpatient/setup")return send(setup);
  if(path==="/inpatient/admissions")return send({items:admitted?[{...a,billing:billSummary()}]:[],total:admitted?1:0,page:1,pageSize:20,summary:{active:admitted?1:0,unallocated:0,discharged:0}});
  if(path===`/inpatient/admissions/${ids.admission}`)return send(chart);
  return send(null);
 });
 return {writes,chart,setup,savedCharges};
}
test("staff can set up a ward, room and bed, then admit a registered patient",async({page})=>{
 const {writes}=await install(page,{empty:true});await page.goto("/inpatient/setup");
 await page.getByRole("button",{name:"Add ward",exact:true}).click();let dialog=page.getByRole("dialog");
 await dialog.getByLabel("Ward name").fill("General Medicine");await dialog.getByLabel("Ward type").selectOption("General");await dialog.getByRole("button",{name:"Save",exact:true}).click();await expect(dialog).toHaveCount(0);
 await page.getByRole("button",{name:"Add room",exact:true}).click();dialog=page.getByRole("dialog");await dialog.getByLabel("Ward",{exact:true}).selectOption(ids.ward);await dialog.getByLabel("Room name / number").fill("Room 101");await dialog.getByRole("button",{name:"Save",exact:true}).click();await expect(dialog).toHaveCount(0);
 await page.getByRole("button",{name:"Add bed",exact:true}).click();dialog=page.getByRole("dialog");await dialog.getByLabel("Room",{exact:true}).selectOption(ids.room);await dialog.getByLabel("Bed name / number").fill("Bed A");await dialog.getByRole("button",{name:"Save",exact:true}).click();await expect(dialog).toHaveCount(0);
 await page.getByRole("button",{name:"New admission",exact:true}).click();dialog=page.getByRole("dialog");
 await dialog.getByLabel("Find registered patient").fill("Ayesha");await dialog.getByLabel("Patient",{exact:true}).selectOption(ids.patient);
 await dialog.getByLabel("Admitting doctor").selectOption(ids.doctor);await dialog.getByLabel("Bed allocation").selectOption(ids.bed);await dialog.getByLabel("Reason for admission").fill("Observation");await expect(dialog.getByLabel("Allergies / allergy status",{exact:true})).toHaveCount(0);await expect(dialog.getByLabel("Emergency contact",{exact:false})).toHaveCount(0);
 await dialog.getByRole("button",{name:"Admit patient"}).click();await expect(page).toHaveURL(new RegExp(`/inpatient/${ids.admission}$`));await expect(page.getByRole("heading",{name:"Ayesha Rahman"})).toBeVisible();
 const admissionWrite=writes.find(w=>w.path==="/inpatient/admissions");expect(admissionWrite.body).not.toHaveProperty("allergies");expect(admissionWrite.body).not.toHaveProperty("emergencyContact");expect(admissionWrite.body.bedId).toBe(ids.bed);expect(admissionWrite.body.requestKey).toMatch(/^[a-f0-9-]{36}$/);
});
test("read-only staff cannot change bed status or create clinical entries",async({page})=>{
 await install(page,{grants:["inpatient.view"]});await page.goto("/inpatient/beds");await expect(page.getByRole("link",{name:"Ayesha Rahman 000123"})).toBeVisible();await expect(page.getByRole("button",{name:"New admission"})).toHaveCount(0);await expect(page.getByRole("button",{name:"Update status"})).toHaveCount(0);
 await page.goto(`/inpatient/${ids.admission}`);const nav=page.getByRole("navigation",{name:"Patient chart sections"});for(const name of ["Doctor rounds","Nursing","Care plan","MAR","Handover"])await expect(nav.getByRole("button",{name,exact:true})).toHaveCount(0);

});

test("inpatient bill tracks itemized charges, partial payments, discounts, voids and credit refunds",async({page},testInfo)=>{
 const {writes}=await install(page);await page.goto(`/inpatient/${ids.admission}`);
 await page.getByRole("navigation",{name:"Patient chart sections"}).getByRole("button",{name:"Billing",exact:true}).click();
 const amountCard=title=>page.getByText(title,{exact:true}).locator("..");
 const charge=async(description,rate,qty)=>{await page.getByRole("button",{name:"Add charge",exact:true}).click();const d=page.getByRole("dialog");await d.getByLabel("Description",{exact:false}).fill(description);await d.getByLabel("Unit price",{exact:true}).fill(rate);await d.getByLabel("Days",{exact:true}).fill(qty);await d.getByRole("button",{name:"Save",exact:true}).click();await expect(d).toHaveCount(0);};
 const transaction=async(button,amount,note)=>{await page.getByRole("button",{name:button,exact:true}).click();const d=page.getByRole("dialog");await d.getByLabel("Amount (BDT)").fill(amount);await d.locator("textarea").fill(note);await d.getByRole("button",{name:"Save",exact:true}).click();await expect(d).toHaveCount(0);};
 await charge("General bed ? 2 days","500.00","2");
 await expect(amountCard("Net bill")).toContainText("BDT 1,000.00");
 await transaction("Collect payment","600.00","Cash received");
 await expect(amountCard("Remaining due")).toContainText("BDT 400.00");
 await transaction("Add discount","100.00","Management concession");
 await transaction("Collect payment","300.00","Final payment");
 await expect(amountCard("Remaining due")).toContainText("BDT 0.00");
 await charge("Incorrect duplicate charge","100.00","1");
 await page.getByRole("row").filter({hasText:"Incorrect duplicate charge"}).getByRole("button",{name:"Void charge"}).click();
 let dialog=page.getByRole("dialog");await dialog.getByLabel("Reason for voiding").fill("Duplicate entry");await dialog.getByRole("button",{name:"Confirm void"}).click();await expect(dialog).toHaveCount(0);
 await transaction("Receive advance","100.00","Additional deposit");await expect(amountCard("Refundable credit")).toContainText("BDT 100.00");
 await transaction("Refund credit","100.00","Excess deposit returned");await expect(amountCard("Refundable credit")).toContainText("BDT 0.00");
 expect(writes.filter(w=>w.path.includes("/bill/")).every(w=>/^[a-f0-9-]{36}$/.test(w.body.requestKey))).toBe(true);
 await page.screenshot({path:testInfo.outputPath("inpatient-billing.png"),fullPage:true});
 const popupPromise=page.waitForEvent("popup");await page.getByRole("button",{name:"Print statement",exact:true}).click();const popup=await popupPromise;
 await expect(popup.getByRole("heading",{name:"Inpatient statement"})).toBeVisible();await expect(popup.getByText("Ayesha Rahman",{exact:true})).toBeVisible();await popup.close();
});

test("discharge is available without retired clinical workflows",async({page})=>{
 const {writes}=await install(page);await page.goto(`/inpatient/${ids.admission}`);
 const nav=page.getByRole("navigation",{name:"Patient chart sections"});
 await expect(nav.getByRole("button")).toHaveCount(3);
 await nav.getByRole("button",{name:"Discharge",exact:true}).click();await page.getByRole("button",{name:"Complete discharge",exact:true}).click();
 const dialog=page.getByRole("dialog");
 await dialog.getByLabel("Discharge type").selectOption("Routine");
 for(const name of ["Final diagnosis","Hospital course / treatment summary","Condition at discharge","Discharge medications / reconciliation","Patient instructions","Follow-up plan"])await dialog.getByLabel(name,{exact:true}).fill("Discharge summary reviewed");
 await dialog.getByRole("checkbox").check();await dialog.getByRole("button",{name:"Confirm discharge"}).click();await expect(dialog).toHaveCount(0);
 await expect(page.getByRole("heading",{name:"Discharge summary",exact:true})).toBeVisible();
 expect(writes.filter(w=>w.path.endsWith("/discharge"))).toHaveLength(1);
});

test("a mistaken discharge can be restored and discharged again",async({page})=>{
 const {writes}=await install(page,{discharged:true});await page.goto(`/inpatient/${ids.admission}`);
 await page.getByRole("button",{name:"Restore to admitted",exact:true}).click();
 const dialog=page.getByRole("dialog");await dialog.getByLabel("Reason for correcting discharge").fill("Selected the wrong admission");
 await dialog.getByRole("button",{name:"Restore to admitted",exact:true}).click();await expect(dialog).toHaveCount(0);
 await expect(page.getByRole("button",{name:"Restore to admitted",exact:true})).toHaveCount(0);
 await expect(page.getByText("Awaiting bed allocation",{exact:true})).toBeVisible();
 await page.getByRole("navigation",{name:"Patient chart sections"}).getByRole("button",{name:"Discharge",exact:true}).click();
 await expect(page.getByRole("button",{name:"Complete discharge",exact:true})).toBeEnabled();
 expect(writes.find(w=>w.path.endsWith("/reopen")).body.bedId).toBe(null);
});

test("charge category controls bed days/rate and optional description",async({page})=>{
 const {writes}=await install(page);await page.goto(`/inpatient/${ids.admission}`);
 await page.getByRole("navigation",{name:"Patient chart sections"}).getByRole("button",{name:"Billing",exact:true}).click();
 await page.getByRole("button",{name:"Add charge",exact:true}).click();let d=page.getByRole("dialog");
 await expect(d.getByLabel("Charge category").locator("option[value=nursing]")).toHaveCount(0);
 await expect(d.getByLabel("Days",{exact:true})).toBeVisible();await expect(d.getByLabel("Unit price",{exact:true})).toBeVisible();
 await expect(d.getByLabel("Description",{exact:false})).not.toHaveAttribute("placeholder",/.+/);
 await d.getByLabel("Charge category").selectOption("doctor");
 await expect(d.getByLabel("Days",{exact:true})).toHaveCount(0);await expect(d.getByLabel("Unit price",{exact:true})).toHaveCount(0);
 await d.getByLabel("Amount",{exact:true}).fill("250.50");await d.getByRole("button",{name:"Save",exact:true}).click();await expect(d).toHaveCount(0);
 await expect(page.locator("thead th").filter({hasText:/^Description$/})).toHaveCount(0);
 const first=writes.find(w=>w.path.endsWith("/bill/charge"));expect(first.body.description).toBe("");expect(first.body.amount).toBe("250.50");expect(first.body).not.toHaveProperty("quantity");expect(first.body).not.toHaveProperty("unitPrice");
 await page.getByRole("button",{name:"Add charge",exact:true}).click();d=page.getByRole("dialog");
 await d.getByLabel("Days",{exact:true}).fill("2");await d.getByLabel("Unit price",{exact:true}).fill("100");await d.getByLabel("Description",{exact:false}).fill("Bed for two days");
 await d.getByRole("button",{name:"Save",exact:true}).click();await expect(d).toHaveCount(0);
 await expect(page.locator("thead th").filter({hasText:/^Description$/})).toBeVisible();await expect(page.getByText("Bed for two days",{exact:true})).toBeVisible();
});

test("saved charges can be selected and overridden when admitting a patient",async({page},testInfo)=>{
 const {writes,savedCharges}=await install(page);await page.goto("/inpatient/charges");
 const create=async(category,name,price)=>{await page.getByRole("button",{name:"Create charge",exact:true}).click();const dialog=page.getByRole("dialog");await dialog.getByLabel("Charge category").selectOption(category);await dialog.getByLabel("Charge name").fill(name);await dialog.getByLabel("Standard price").fill(price);await dialog.getByRole("button",{name:"Save",exact:true}).click();await expect(dialog).toHaveCount(0);};
 await create("bed","General bed","500.00");await create("doctor","Consultation fee","250.00");
 await page.goto("/inpatient");await page.getByRole("button",{name:"New admission",exact:true}).click();let dialog=page.getByRole("dialog");
 await dialog.getByLabel("Find registered patient").fill("Ayesha");await dialog.getByLabel("Patient",{exact:true}).selectOption(ids.patient);await dialog.getByLabel("Admitting doctor").selectOption(ids.doctor);
 await dialog.getByRole("checkbox",{name:/General bed/}).check();await dialog.getByLabel("General bed days").fill("2");await dialog.getByLabel("General bed amount").fill("450.00");
 await dialog.getByRole("checkbox",{name:/Consultation fee/}).check();await dialog.getByLabel("Consultation fee amount").fill("200.00");
 await page.screenshot({path:testInfo.outputPath("admission-saved-charges.png"),fullPage:true});
 await dialog.getByRole("button",{name:"Admit patient",exact:true}).click();await expect(page).toHaveURL(new RegExp(`/inpatient/${ids.admission}$`));
 await page.getByRole("navigation",{name:"Patient chart sections"}).getByRole("button",{name:"Billing",exact:true}).click();
 await expect(page.getByText("Net bill",{exact:true}).locator("..")).toContainText("BDT 1,100.00");
 expect(savedCharges[0].price).toBe("500.00");expect(savedCharges[1].price).toBe("250.00");
 const admissionWrite=writes.find(w=>w.path==="/inpatient/admissions");expect(admissionWrite.body.initialCharges).toHaveLength(2);expect(admissionWrite.body.initialCharges[0].price).toBe("450.00");
 await page.getByRole("button",{name:"Add charge",exact:true}).click();dialog=page.getByRole("dialog");
 await dialog.getByLabel("Saved charge",{exact:false}).selectOption(savedCharges[1].id);await expect(dialog.getByLabel("Amount",{exact:true})).toHaveValue("250.00");await dialog.getByLabel("Amount",{exact:true}).fill("225.00");
 const controls=await dialog.locator("input,select,textarea").evaluateAll(nodes=>nodes.map(n=>n.name));expect(controls.at(-1)).toBe("description");
 await dialog.getByRole("button",{name:"Save",exact:true}).click();await expect(dialog).toHaveCount(0);await expect(page.getByText("Net bill",{exact:true}).locator("..")).toContainText("BDT 1,325.00");expect(savedCharges[1].price).toBe("250.00");
 await page.goto("/inpatient/charges");const card=page.locator("article").filter({has:page.getByRole("heading",{name:"Consultation fee",exact:true})});
 await card.getByRole("button",{name:"Delete",exact:true}).click();dialog=page.getByRole("dialog");await expect(dialog).toContainText("Existing patient charges and bills will remain unchanged.");
 await dialog.getByRole("button",{name:"Cancel",exact:true}).click();await expect(card).toHaveCount(1);
 await card.getByRole("button",{name:"Delete",exact:true}).click();await page.getByRole("dialog").getByRole("button",{name:"Delete charge",exact:true}).click();
 await expect(card).toHaveCount(0);expect(savedCharges).toHaveLength(1);
 await page.goto(`/inpatient/${ids.admission}`);await page.getByRole("navigation",{name:"Patient chart sections"}).getByRole("button",{name:"Billing",exact:true}).click();
 await expect(page.getByText("Net bill",{exact:true}).locator("..")).toContainText("BDT 1,325.00");

});

test("admissions can set and edit a full bill total while billing charges remain available",async({page})=>{
 await install(page);await page.goto("/inpatient");
 await page.getByRole("button",{name:"Add amount",exact:true}).click();let dialog=page.getByRole("dialog");await dialog.getByLabel("Total amount",{exact:true}).fill("3000.00");await dialog.getByRole("button",{name:"Save total amount",exact:true}).click();await expect(dialog).toHaveCount(0);
 await expect(page.getByRole("row").filter({hasText:"Ayesha Rahman"})).toContainText("3,000.00");
 await page.getByRole("button",{name:"Edit amount",exact:true}).click();dialog=page.getByRole("dialog");await expect(dialog.getByLabel("Total amount",{exact:true})).toHaveValue("3000.00");await dialog.getByLabel("Total amount",{exact:true}).fill("2500.00");await dialog.getByRole("button",{name:"Save total amount",exact:true}).click();await expect(dialog).toHaveCount(0);
 await page.getByRole("link",{name:"Open chart",exact:false}).click();await page.getByRole("navigation",{name:"Patient chart sections"}).getByRole("button",{name:"Billing",exact:true}).click();await expect(page.getByText("Net bill",{exact:true}).locator("..")).toContainText("BDT 2,500.00");
 await page.getByRole("button",{name:"Add charge",exact:true}).click();dialog=page.getByRole("dialog");await dialog.getByLabel("Charge category").selectOption("other");await dialog.getByLabel("Amount",{exact:true}).fill("200.00");await dialog.getByRole("button",{name:"Save",exact:true}).click();await expect(dialog).toHaveCount(0);await expect(page.getByText("Net bill",{exact:true}).locator("..")).toContainText("BDT 2,700.00");
});

test("Due searches admission IDs and supports payment corrections with history",async({page})=>{
 await install(page);await page.goto("/inpatient");await page.getByRole("button",{name:"Add amount",exact:true}).click();let dialog=page.getByRole("dialog");await dialog.getByLabel("Total amount",{exact:true}).fill("1000.00");await dialog.getByRole("button",{name:"Save total amount",exact:true}).click();await expect(dialog).toHaveCount(0);
 await page.getByRole("link",{name:"IPD",exact:true}).click();await expect(page.getByText("Find an inpatient bill",{exact:true})).toBeVisible();
 await page.getByLabel("Patient ID",{exact:true}).fill("999999");await page.getByRole("button",{name:"Search",exact:true}).click();await expect(page.getByText("No admissions found",{exact:true})).toBeVisible();
 await page.getByLabel("Patient ID",{exact:true}).fill("000123");await page.getByRole("button",{name:"Search",exact:true}).click();await expect(page.getByRole("heading",{name:"Ayesha Rahman",exact:true})).toBeVisible();await expect(page.getByRole("button",{name:/Edit amount/})).toHaveCount(0);await expect(page.getByRole("link",{name:/Open chart/i})).toHaveCount(0);
 await page.getByRole("button",{name:"Pay bill",exact:true}).click();dialog=page.getByRole("dialog");await dialog.getByLabel("Payment amount",{exact:true}).fill("400.00");await dialog.getByLabel("Payment note / reference").fill("Cash receipt");await dialog.getByRole("button",{name:"Receive payment",exact:true}).click();await expect(dialog).toHaveCount(0);await expect(page.getByText("Due",{exact:true}).locator("..").filter({hasText:"BDT 600.00"})).toHaveCount(1);
 await page.getByRole("button",{name:"Payment history",exact:true}).click();await expect(page.getByRole("dialog",{name:"Payment history",exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Edit payment",exact:true}).click();dialog=page.getByRole("dialog");await dialog.getByLabel("Payment amount",{exact:true}).fill("250.00");await dialog.getByLabel("Reason for correction").fill("Correct receipt amount");await dialog.getByRole("button",{name:"Save payment",exact:true}).click();await expect(dialog).toHaveCount(0);
 await page.getByRole("button",{name:"Payment history",exact:true}).click();
 await expect(page.getByText("Payment (replaced)",{exact:false})).toBeVisible();await expect(page.getByText("Payment correction",{exact:false})).toBeVisible();await expect(page.getByText("Due",{exact:true}).locator("..").filter({hasText:"BDT 750.00"})).toHaveCount(1);await expect(page.getByRole("button",{name:"Edit payment",exact:true})).toHaveCount(1);
 await page.getByRole("dialog",{name:"Payment history",exact:true}).getByRole("button",{name:"Close",exact:true}).click();
 await page.getByRole("button",{name:"Add Discount",exact:true}).click();dialog=page.getByRole("dialog");await expect(dialog.getByLabel("Discount amount",{exact:true})).toHaveValue("750.00");await dialog.getByLabel("Reason for discount").fill("Remaining balance waived");await dialog.getByRole("button",{name:"Apply discount",exact:true}).click();await expect(dialog).toHaveCount(0);
 await expect(page.getByText("Due",{exact:true}).locator("..").filter({hasText:"BDT 0.00"})).toHaveCount(1);await expect(page.getByRole("button",{name:"Pay bill",exact:true})).toHaveCount(0);await expect(page.getByRole("button",{name:"Add Discount",exact:true})).toHaveCount(0);
 await page.getByRole("button",{name:"Payment history",exact:true}).click();await expect(page.getByRole("dialog").getByText("Discount",{exact:false})).toBeVisible();
 await page.getByRole("dialog").getByRole("button",{name:"Close",exact:true}).click();
 for(const [category,amount] of [["doctor","100.00"],["ot_assistant","50.00"],["other","25.00"]]){
  await page.getByRole("button",{name:"Add expense",exact:true}).click();dialog=page.getByRole("dialog");await dialog.getByLabel("Expense category",{exact:true}).selectOption(category);await dialog.getByLabel("Expense amount",{exact:true}).fill(amount);await dialog.getByRole("button",{name:"Add expense",exact:true}).click();await expect(dialog).toHaveCount(0);
 }
 await expect(page.getByText("Total expense",{exact:true}).locator("..")).toContainText("175.00");await expect(page.getByText("Income",{exact:true}).locator("..")).toContainText("75.00");await expect(page.getByText("Due",{exact:true}).locator("..").filter({hasText:"BDT 0.00"})).toHaveCount(1);
 await page.getByRole("button",{name:"Expense history",exact:true}).click();await expect(page.getByRole("dialog").getByText("Doctor bill",{exact:false})).toBeVisible();await expect(page.getByRole("dialog").getByText("OT assistant bill",{exact:false})).toBeVisible();await expect(page.getByRole("dialog").getByText("Others bill",{exact:false})).toBeVisible();
 const doctorExpense=page.getByRole("dialog").locator("div.rounded-xl").filter({hasText:"Doctor bill"});await doctorExpense.getByRole("button",{name:"Edit expense",exact:true}).click();dialog=page.getByRole("dialog");await expect(dialog.getByLabel("Expense amount",{exact:true})).toHaveValue("100.00");await dialog.getByLabel("Expense amount",{exact:true}).fill("80.00");await dialog.getByRole("button",{name:"Save expense",exact:true}).click();await expect(dialog).toHaveCount(0);
 await expect(page.getByText("Total expense",{exact:true}).locator("..")).toContainText("155.00");await expect(page.getByText("Income",{exact:true}).locator("..")).toContainText("95.00");await page.getByRole("button",{name:"Expense history",exact:true}).click();await expect(page.getByRole("dialog").getByText("Replaced by an edited expense",{exact:true})).toBeVisible();await expect(page.getByRole("dialog").getByRole("button",{name:"Edit expense",exact:true})).toHaveCount(3);



});

test("Settings Configure PC Bill saves a percentage and reloads it",async({page})=>{
 await install(page,{grants:[...fullAccess,"tenant.view","tenant.update"]});let config={percentage:0,revision:0},saves=0;
 await page.route("**/api/v1/tenant/configure/pc-bill",async route=>{if(route.request().method()==="PATCH"){const body=route.request().postDataJSON();config={percentage:body.percentage,revision:config.revision+1};saves++;}return route.fulfill({contentType:"application/json",body:JSON.stringify({success:true,data:config})});});
 await page.goto("/settings/configure/pc-bill");await expect(page.getByRole("button",{name:"Configure",exact:true})).toBeVisible();await expect(page.getByRole("link",{name:"PC Bill",exact:true})).toBeVisible();
 await page.getByLabel("Reference percentage (%)",{exact:true}).fill("12.5");await page.getByRole("button",{name:"Save",exact:true}).click();await expect(page.getByRole("status")).toContainText("PC Bill percentage saved.");expect(saves).toBe(1);
 await page.reload();await expect(page.getByLabel("Reference percentage (%)",{exact:true})).toHaveValue("12.5");await page.getByLabel("Reference percentage (%)",{exact:true}).fill("101");await page.getByRole("button",{name:"Save",exact:true}).click();expect(saves).toBe(1);
});
