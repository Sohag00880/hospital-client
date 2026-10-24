const {z}=require("zod");
const {test,expect}=require("@playwright/test");
const id="11111111-1111-4111-8111-111111111111";
const template=(name,category,unitPrice)=>({id:crypto.randomUUID(),name,category,unitPrice,units:1,days:1,times:1,unitLabel:category==="doctor"?"doctor":"bed",mode:"manual",active:true,revision:1});
async function install(page){
 const started=new Date(Date.now()-36*3600000).toISOString(),templates=[template("General bed","bed","100.00"),template("Doctor round","doctor","50.00")];
 const writes=[],data={admission:{id,admissionNumber:"ADM-2026-000001",patientName:"Ayesha Rahman",mrn:"000123",doctorName:"Dr Ahmed",hospitalName:"Test Hospital",status:"admitted",bedId:null,bedName:"",admittedAt:started.replace("T"," ").replace("Z","+00")},account:{revision:0,finalizedAt:null,closedAt:null},entries:[],charges:[]};
 const calc=row=>{const days=row.mode==="automatic"?Math.ceil(Math.max(0,new Date(data.account.finalizedAt||Date.now())-new Date(row.startAt))/86400000):Number(row.days),quantity=row.category==="bed"?days*row.units:row.category==="doctor"?row.units*row.times*(row.mode==="automatic"?days:1):row.units;return {...row,calculatedDays:days,quantity,amount:(quantity*Number(row.unitPrice)).toFixed(2)};};
 const summary=()=>{
  const sum=kind=>data.entries.filter(e=>e.kind===kind).reduce((n,e)=>n+Math.round(Number(e.amount)*100),0),gross=data.charges.reduce((n,e)=>n+Math.round(Number(calc(e).amount)*100),0),discount=sum("discount"),paid=sum("payment")+sum("apply")-sum("payment_refund"),net=gross-discount;
  return Object.fromEntries(Object.entries({gross,discount,net,paid,due:Math.max(net-paid,0),credit:Math.max(paid-net,0),advance:sum("deposit")-sum("apply")-sum("deposit_refund")}).map(([k,v])=>[k,(v/100).toFixed(2)]));
 };
 await page.route("**/api/v1/**",async route=>{
  const req=route.request(),path=new URL(req.url()).pathname.replace(/^.*\/api\/v1/,""),send=value=>route.fulfill({contentType:"application/json",body:JSON.stringify({success:true,data:value})});
  if(path.startsWith("/auth/"))return send({user:{id,tenantId:id,fullName:"Cashier"},accessToken:"fixture",permissions:["billing.view","billing.create","billing.approve","inpatient.view","inpatient.manage","inpatient.discharge"],roles:["staff"],isPlatformAdmin:false});
  if(path==="/branding/appearance")return send({displayName:"Test Hospital"});
  if(path==="/billing/ipd/charges"){
   if(req.method()==="POST"){const body=req.postDataJSON(),index=templates.findIndex(t=>t.id===body.id),row={...body,revision:body.expectedRevision+1};if(index>=0)templates[index]=row;else templates.push(row);return send(row);}
   return send(templates);
  }
  if(path===`/billing/ipd/${id}`){
   if(req.method()==="POST"){
    const body=req.postDataJSON();writes.push(body);if(body.action==="services"){
     const invalid=body.items.flatMap((row,index)=>["startAt","endAt"].filter(key=>row[key]!==null&&!z.string().datetime().safeParse(row[key]).success).map(key=>({path:["items",index,key],message:"Invalid datetime"})));
     if(invalid.length)return route.fulfill({status:400,contentType:"application/json",body:JSON.stringify({success:false,error:{message:"Check the billing form values",details:{issues:invalid}}})});
    }if(body.expectedRevision!==data.account.revision)return route.fulfill({status:409,contentType:"application/json",body:JSON.stringify({success:false,error:{message:"Bill changed. Refresh before saving"}})});data.account.revision++;
    if(body.action==="services"){data.charges=body.items;data.account.finalizedAt=null;}
    else if(body.action==="finalize")data.account.finalizedAt=new Date().toISOString();
    else if(body.action==="close"){data.account.closedAt=new Date().toISOString();data.admission.status="discharged";}
    else data.entries.push({...body,id:crypto.randomUUID(),kind:body.action,amount:Number(body.amount).toFixed(2),createdAt:new Date().toISOString(),author:"Cashier"});
    return send({revision:data.account.revision});
   }
   return send({...data,charges:data.charges.map(calc),summary:summary()});
  }
  if(path==="/billing/ipd")return send({items:[{...data.admission,...summary(),...data.account}],total:1,page:1,pageSize:20});
  if(path==="/billing/ipd/reports")return send({items:[{...data.admission,...summary()}],daily:[{date:"2026-10-24",payments:"300.00",deposits:"150.00",refunds:"0.00",collection:"450.00"}],summary:{net:"450.00",due:"0.00",advance:"0.00"},total:1,page:1,pageSize:20});
  return send(null);
 });return {writes,data,templates};
}
test("saved charges and patient overrides combine bed, round and other charges with automatic/manual modes",async({page})=>{
 test.setTimeout(120000);
 const fixture=await install(page);await page.goto("/billing/ipd/services");
 await expect(page.getByRole("navigation",{name:"IPD billing navigation"})).toHaveCount(0);
 await page.getByRole("button",{name:"Create charge",exact:true}).click();let dialog=page.getByRole("dialog");
 await dialog.getByLabel("Charge name",{exact:true}).fill("Nursing");await dialog.getByLabel("Charge type",{exact:true}).selectOption("nursing");await dialog.getByLabel("Rate per unit (BDT)",{exact:true}).fill("50");await dialog.getByRole("button",{name:"Save hospital charge",exact:true}).click();await expect(dialog).toHaveCount(0);expect(fixture.templates).toHaveLength(3);
 await page.getByRole("button",{name:"Open bill",exact:true}).click();await page.getByRole("button",{name:"Add charges",exact:true}).click();await expect(page).toHaveURL(/services\/edit\?admission=/);dialog=page.locator("form");
 await expect(dialog.getByRole("region")).toHaveCount(3);
 const bed=dialog.getByRole("region",{name:"Charge 1",exact:true}),doctor=dialog.getByRole("region",{name:"Charge 2",exact:true});
 await bed.getByLabel("Total bed days",{exact:true}).fill("3");await doctor.getByLabel("Calculation",{exact:true}).selectOption("automatic");await doctor.getByLabel("Rounds per day",{exact:true}).fill("2");
 await dialog.getByRole("button",{name:"Save patient charges",exact:true}).click();await expect(page).toHaveURL(/services\?admission=/);await page.getByText("Patient service charges",{exact:true}).click();await expect(page.getByText("BDT 300.00",{exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Add / edit charges",exact:true}).click();dialog=page.locator("form");await dialog.getByRole("region",{name:"Charge 1",exact:true}).getByLabel("Calculation",{exact:true}).selectOption("automatic");await dialog.getByRole("region",{name:"Charge 2",exact:true}).getByLabel("Calculation",{exact:true}).selectOption("manual");await dialog.getByRole("region",{name:"Charge 2",exact:true}).getByLabel("Total rounds",{exact:true}).fill("3");
 await dialog.getByRole("button",{name:"New patient charge",exact:true}).click();const oxygen=dialog.getByRole("region",{name:"Charge 4",exact:true});await oxygen.getByLabel("Charge name",{exact:true}).fill("Oxygen");await oxygen.getByLabel("Charge type",{exact:true}).selectOption("oxygen");await oxygen.getByLabel("Rate per unit (BDT)",{exact:true}).fill("25");await oxygen.getByLabel("Quantity / units",{exact:true}).fill("2");
 await dialog.screenshot({path:"test-results/ipd-patient-charge-editor.png"});
 await dialog.getByRole("button",{name:"Save patient charges",exact:true}).click();await expect(page).toHaveURL(/services\?admission=/);await page.getByText("Patient service charges",{exact:true}).click();expect(fixture.writes[1].items).toHaveLength(4);for(const write of fixture.writes.filter(w=>w.action==="services"))for(const row of write.items)expect(row.startAt).toBe(new Date(row.startAt).toISOString());await expect(page.getByText("BDT 150.00",{exact:true})).toBeVisible();
 await page.goto(`/billing/ipd/deposits?admission=${id}`);await page.getByRole("button",{name:"Receive advance",exact:true}).click();dialog=page.getByRole("dialog");await dialog.getByLabel("Amount (BDT)").fill("150");await dialog.getByLabel("Note / reason").fill("Advance receipt");await dialog.getByRole("button",{name:"Receive advance",exact:true}).click();await expect(dialog).toHaveCount(0);
 await page.getByRole("button",{name:"Apply advance to bill",exact:true}).click();dialog=page.getByRole("dialog");await dialog.getByLabel("Amount (BDT)").fill("150");await dialog.getByLabel("Note / reason").fill("Apply");await dialog.getByRole("button",{name:"Apply advance to bill",exact:true}).click();await expect(dialog).toHaveCount(0);
 await page.goto(`/billing/ipd/payments?admission=${id}`);await page.getByRole("button",{name:"Receive payment",exact:true}).click();dialog=page.getByRole("dialog");await dialog.getByLabel("Amount (BDT)").fill("300");await dialog.getByLabel("Note / reason").fill("Remaining payment");await dialog.getByRole("button",{name:"Receive payment",exact:true}).click();await expect(dialog).toHaveCount(0);
 await page.getByRole("button",{name:"Receipt",exact:true}).click();await expect(page.getByRole("dialog").getByText(/Receipt: IPD-/)).toBeVisible();await page.getByRole("dialog").getByRole("button",{name:"Close",exact:true}).last().click();
 await page.goto(`/billing/ipd/final?admission=${id}`);await page.getByRole("button",{name:"Finalize bill",exact:true}).click();dialog=page.getByRole("dialog");await dialog.getByLabel("Note / reason").fill("Reviewed");await dialog.getByRole("button",{name:"Finalize bill",exact:true}).click();await expect(dialog).toHaveCount(0);
 await page.getByRole("button",{name:"Close bill & discharge",exact:true}).click();dialog=page.getByRole("dialog");await dialog.getByLabel("Note / reason").fill("Settled");await dialog.getByRole("button",{name:"Close bill & discharge",exact:true}).click();await expect(dialog).toHaveCount(0);await expect(page.getByText(/Closed \/ discharged/)).toBeVisible();
 expect(fixture.writes.map(w=>w.action)).toEqual(["services","services","deposit","apply","payment","finalize","close"]);
 const response=await page.goto("/billing/ipd/beds");expect(response.status()).toBe(404);
});
test("reports show daily cash separately from patient balances",async({page})=>{
 await install(page);await page.goto("/billing/ipd/reports");await expect(page.getByRole("heading",{name:"Daily collection",exact:true})).toBeVisible();await expect(page.getByRole("cell",{name:"450.00",exact:true}).first()).toBeVisible();await expect(page.getByRole("heading",{name:"Patient balances",exact:true})).toBeVisible();
});

test("an open charge editor keeps its revision when another user changes the bill",async({page})=>{
 const fixture=await install(page);await page.goto(`/billing/ipd?admission=${id}`);
 await page.getByRole("button",{name:"Add charges",exact:true}).click();
 await expect(page.locator("form").getByRole("region")).toHaveCount(2);
 fixture.data.account.revision++;
 await page.getByRole("button",{name:"Save patient charges",exact:true}).click();
 await expect(page.locator("form").getByRole("alert")).toContainText("Bill changed");
 expect(fixture.writes[0].expectedRevision).toBe(0);expect(fixture.data.charges).toHaveLength(0);
});

test("admission charge shortcut opens the patient editor directly",async({page})=>{
 await install(page);await page.goto(`/billing/ipd/services?admission=${id}&add=1`);
 await expect(page.getByRole("heading",{name:"Add / edit charges",exact:true})).toBeVisible();
 await expect(page.locator("form").getByRole("region")).toHaveCount(2);
 await expect(page).not.toHaveURL(/add=1/);
});
