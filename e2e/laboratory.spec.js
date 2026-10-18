const {test,expect}=require("@playwright/test");
const AxeBuilder=require("@axe-core/playwright").default;
const patientId="11111111-1111-4111-8111-111111111111",testId="22222222-2222-4222-8222-222222222222",orderId="33333333-3333-4333-8333-333333333333",sampleId="44444444-4444-4444-8444-444444444444",itemId="55555555-5555-4555-8555-555555555555",parameterId="66666666-6666-4666-8666-666666666666";
async function install(page,grants,{due=0}={}){
  const catalog=[{id:testId,amount:"450.25",code:"TEST",name:"Configured Test",specimenType:"blood",parameters:[{id:parameterId,label:"Configured parameter",type:"numeric",unit:"unit",referenceRange:"Configured range"}],active:true,revision:1}];
  const patient={id:patientId,mrn:"000001",name:"Lab Patient",firstName:"Lab",lastName:"Patient"};
  const writes=[];let order=null,allowPrintWithDue=false,revision=0;
  const access=()=>({patientId,due:due.toFixed(2),allowPrintWithDue,revision,canPrint:due===0 || allowPrintWithDue});
  await page.route("**/api/v1/**",async route=>{
    const req=route.request(),url=new URL(req.url()),path=url.pathname.replace(/^.*\/api\/v1/,"");
    const send=(data,status=200)=>route.fulfill({status,contentType:"application/json",body:JSON.stringify({success:status<400,data})});
    if(path===`/billing/patients/${patientId}/print-permission`){const body=req.postDataJSON();allowPrintWithDue=body.allowPrintWithDue;revision++;writes.push(path);return send(access());}
    if(path==="/billing/due")return send({patient:{id:patientId,mrn:patient.mrn,name:patient.name},summary:{amount:"450.25",paid:(450.25-due).toFixed(2),due:due.toFixed(2)},items:[],total:0,page:1,pageSize:20,printAccess:access()});
    if(path.startsWith("/auth/"))return send({user:{id:patientId,tenantId:testId,fullName:"Lab Staff"},accessToken:"fixture",permissions:grants,roles:["staff"],isPlatformAdmin:false});
    if(path==="/branding/appearance")return send({displayName:"Test Hospital"});
    if(path==="/patients")return send({items:[patient],total:1,page:1,pageSize:10});
    if(path==="/laboratory/tests"){
      if(req.method()==="POST"){const row={id:crypto.randomUUID(),...req.postDataJSON(),revision:1};catalog.push(row);writes.push(path);return send(row,201);}
      return send(catalog);
    }
    if(path==="/laboratory/orders"){
      if(req.method()==="POST"){
        const body=req.postDataJSON();writes.push(path);expect(body.patientId).toBe(patientId);expect(body.testIds).toEqual([testId]);
        order={id:orderId,orderNumber:"LAB00000001",orderedOn:"2026-10-17",patient,status:"ordered",priority:body.priority,revision:1,notes:body.notes,createdAt:"2026-10-17T06:00:00Z",samples:[{id:sampleId,specimenType:"blood",collectedAt:null,barcode:null}],items:[{id:itemId,testId,sampleId,testSnapshot:catalog[0],results:[],resultNotes:""}],events:[]};return send(order,201);
      }
      return send({items:order?[{...order,patientName:patient.name,mrn:patient.mrn}]:[],total:order?1:0,page:1,pageSize:20,counts:order?{[order.status]:1}:{}});
    }
    if(path===`/laboratory/orders/${orderId}`)return send({...order,printAccess:access()});
    if(path===`/laboratory/orders/${orderId}/samples/${sampleId}/label`)return send({kind:"label",orderNumber:order.orderNumber,patient,sample:order.samples[0],svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80"><path stroke="black" stroke-width="5" d="M10 0v80 M30 0v80 M45 0v80 M60 0v80 M85 0v80 M100 0v80 M120 0v80 M150 0v80 M175 0v80"/></svg>'});
    if(path===`/laboratory/orders/${orderId}/order-slip`)return send({kind:"order",report:{...order,hospital:{displayName:"Test Hospital",address:"Test address"},totalAmount:"450.25",items:order.items,patient}});
    if(path===`/laboratory/orders/${orderId}/report`){
      if(!access().canPrint)return route.fulfill({status:403,contentType:"application/json",body:JSON.stringify({success:false,error:{message:"Report printing is blocked: patient lab due remains."}})});
      return send({kind:"report",report:{...order.finalReport,billing:{due:due.toFixed(2),allowPrintWithDue}}});
    }
    if(order&&path.startsWith(`/laboratory/orders/${orderId}/`)&&req.method()!=="GET"){
      const body=req.postDataJSON();expect(body.expectedRevision).toBe(order.revision);writes.push(path);
      const operation=path.split("/").at(-1);order.revision++;
      if(operation==="collect"){order.samples[0].collectedAt="2026-10-17T06:05:00Z";order.samples[0].collectionNotes=body.notes;order.samples[0].barcode="LABSAMPLE00000001";order.status="sample_collected";}
      else if(operation==="process")order.status="processing";
      else if(operation==="results"){order.items[0].results=body.items[0].results;order.items[0].resultNotes=body.items[0].notes;}
      else if(operation==="submit-results")order.status="result_entered";
      else if(operation==="finalize"){
        order.status="finalized";order.finalizedAt="2026-10-17T06:25:00Z";order.finalizedByName="Lab Finalizer";
        order.finalReport={...order,hospital:{displayName:"Test Hospital",address:"Test address"},items:order.items,patient};
      }
      return send(order);
    }
    return send(null);
  });
  return {writes,setFinalized:()=>{
    order={id:orderId,orderNumber:"LAB00000001",orderedOn:"2026-10-17",createdAt:"2026-10-17T06:00:00Z",patient,status:"finalized",priority:"routine",revision:1,notes:"",samples:[],items:[{id:itemId,testSnapshot:catalog[0],results:[{parameterId,value:"123.45"}]}],events:[],finalizedAt:"2026-10-17T06:25:00Z",finalizedByName:"Lab Finalizer"};
    order.finalReport={...order,hospital:{displayName:"Test Hospital",address:"Test address"},patient};
  }};
}
test("laboratory separates ordering and workflow and prints only finalized results there",async({page},testInfo)=>{
  const {writes}=await install(page,["lab.view","lab.create","lab.update","lab.approve","lab.export","patient.view"]);
  await page.goto("/laboratory");
  await expect(page.getByRole("link",{name:"Lab Orders",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"New lab order",exact:true}).click();
  let dialog=page.getByRole("dialog");await dialog.getByLabel("Find patient",{exact:true}).fill("Lab");
  await dialog.getByRole("button",{name:/Lab Patient.*000001/}).click();
  await dialog.getByRole("checkbox",{name:/Configured Test/}).check();
  await dialog.getByRole("button",{name:"Create order",exact:true}).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Open order",exact:true})).toHaveCount(0);
  await expect(page.getByRole("list",{name:"Laboratory workflow"})).toHaveCount(0);
  await page.getByRole("button",{name:"Print",exact:true}).click();
  const slipFrame=page.frameLocator('iframe[title="Laboratory print document"]');
  await expect(slipFrame.getByRole("cell",{name:"450.25",exact:true})).toBeVisible();
  await expect(slipFrame.getByText("BDT 450.25",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Close",exact:true}).last().click();
  await page.getByRole("link",{name:"Lab Workflow",exact:true}).click();
  await expect(page).toHaveURL(/\/laboratory\/workflow$/);
  await expect(page.getByRole("button",{name:"New lab order",exact:true})).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Print",exact:true})).toHaveCount(0);
  await expect(page.getByLabel("Lab order amount summary",{exact:true})).toHaveCount(0);
  await page.getByRole("button",{name:"Open order",exact:true}).click();
  dialog=page.getByRole("dialog",{name:"Laboratory order LAB00000001",exact:true});
  await expect(dialog.getByRole("button",{name:/print/i})).toHaveCount(0);
  await dialog.getByRole("button",{name:"Collect sample",exact:true}).click();
  await expect(dialog.getByRole("button",{name:/print/i})).toHaveCount(0);
  const frame=page.frameLocator('iframe[title="Laboratory print document"]');
  await dialog.getByRole("button",{name:"Start processing",exact:true}).click();
  await dialog.getByLabel("Configured Test: Configured parameter (unit)",{exact:true}).fill("123.45");
  await dialog.getByRole("button",{name:"Complete result entry",exact:true}).click();
  await dialog.getByRole("button",{name:"Finalize report",exact:true}).click();
  await dialog.getByRole("button",{name:"Confirm finalization",exact:true}).click();
  await expect(dialog.getByRole("button",{name:"Complete result entry",exact:true})).toHaveCount(0);
  await dialog.getByRole("button",{name:"View / print final report",exact:true}).click();
  await expect(frame.getByRole("heading",{name:"Final Laboratory Report",exact:true})).toBeVisible();
  await expect(frame.getByRole("cell",{name:"123.45",exact:true})).toBeVisible();
  await expect(frame.getByText("Test address",{exact:true})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath("laboratory-final-report.png"),fullPage:true});
  expect(writes.filter(path=>path.endsWith("/finalize"))).toHaveLength(1);
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
});
test("laboratory catalog saves staff-defined parameters",async({page})=>{
  await install(page,["lab.view","lab.update"]);await page.goto("/laboratory/tests");
  await page.getByRole("button",{name:"Add test",exact:true}).click();const dialog=page.getByRole("dialog");
  await dialog.getByLabel("Test code",{exact:true}).fill("NEW");await dialog.getByLabel("Test name",{exact:true}).fill("New configured test");
  await dialog.getByLabel("Specimen type",{exact:true}).fill("Urine");await dialog.getByLabel("Parameter 1 name",{exact:true}).fill("Manual parameter");
  await dialog.getByLabel("Test amount (BDT)",{exact:true}).fill("250.50");
  await dialog.getByRole("button",{name:"Save test",exact:true}).click();await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("row").filter({hasText:"New configured test"})).toBeVisible();
});
test("laboratory access denial makes no laboratory requests",async({page})=>{
  const requests=[];await install(page,[]);page.on("request",request=>{if(request.url().includes("/api/v1/laboratory"))requests.push(request.url());});
  await page.goto("/laboratory");await expect(page.getByRole("main").getByRole("alert")).toHaveText("You do not have permission to view Laboratory.");
  expect(requests).toEqual([]);await expect(page.getByRole("link",{name:"Lab Orders",exact:true})).toHaveCount(0);
});

test("patient due blocks report printing until billing checkbox grants permission and revocation blocks an open preview",async({page})=>{
  await page.addInitScript(()=>{window.print=()=>window.parent.postMessage({type:"test-lab-printed"},"*");});
  const fixture=await install(page,["lab.view","lab.export","billing.view","billing.create"],{due:450.25});fixture.setFinalized();
  await page.goto("/laboratory/workflow");await page.getByRole("button",{name:"Open order",exact:true}).click();
  await expect(page.getByRole("button",{name:"View / print final report",exact:true})).toBeDisabled();
  await expect(page.getByText(/Report printing is blocked. Patient lab due:/)).toBeVisible();
  await page.goto("/billing/due");await page.getByLabel("Search patient").fill("000001");await page.getByRole("button",{name:"Search due"}).click();
  const checkbox=page.getByRole("checkbox",{name:/Allow lab report printing with due/});await checkbox.check();await expect(checkbox).toBeChecked();
  await expect(page.getByRole("status").filter({hasText:"Report print permission enabled despite due."})).toBeVisible();
  await checkbox.uncheck();await expect(checkbox).not.toBeChecked();
  await expect(page.getByRole("status").filter({hasText:"Report print permission cancelled."})).toBeVisible();
  await checkbox.check();await expect(page.getByRole("status").filter({hasText:"Report print permission enabled despite due."})).toBeVisible();
  await page.goto("/laboratory/workflow");await page.getByRole("button",{name:"Open order",exact:true}).click();await page.getByRole("button",{name:"View / print final report",exact:true}).click();
  const frame=page.frameLocator('iframe[title="Laboratory print document"]');await expect(frame.getByText("Outstanding patient lab due: 450.25",{exact:true})).toBeVisible();
  await page.evaluate(()=>{window.addEventListener("message",event=>{if(event.data?.type==="test-lab-printed")window.labPrinted=true;});});
  await page.getByRole("button",{name:"Print / Save PDF",exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.labPrinted)).toBe(true);
  // A separate cashier revokes permission while this report preview is open.
  await page.evaluate(async({patientId})=>{await fetch(`/api/v1/billing/patients/${patientId}/print-permission`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({allowPrintWithDue:false,expectedRevision:3})});},{patientId});
  await page.getByRole("button",{name:"Print / Save PDF",exact:true}).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Report printing is blocked");
  await expect(page.locator('iframe[title="Laboratory print document"]')).toHaveCount(0);
  await page.goto("/billing/due");await page.getByLabel("Search patient").fill("000001");await page.getByRole("button",{name:"Search due"}).click();await expect(checkbox).not.toBeChecked();
});
