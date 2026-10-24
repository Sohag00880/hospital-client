const {test,expect}=require("@playwright/test");
const AxeBuilder=require("@axe-core/playwright").default;
const patientId="11111111-1111-4111-8111-111111111111",testId="22222222-2222-4222-8222-222222222222",orderId="33333333-3333-4333-8333-333333333333",sampleId="44444444-4444-4444-8444-444444444444",itemId="55555555-5555-4555-8555-555555555555",parameterId="66666666-6666-4666-8666-666666666666";
async function install(page,grants,{due=0,parameters,multiple=false,newBooking=false,diagnostic=false,multipleDue=false}={}){
  const catalog=[{id:testId,amount:"450.25",code:"TEST",name:"Configured Test",specimenType:"blood",parameters:parameters||[{id:parameterId,label:"Configured parameter",type:"numeric",unit:"unit",referenceRange:"Configured range"}],active:true,revision:1}];
  if(diagnostic)catalog.push({id:"77777777-7777-4777-8777-777777777777",category:"radiology",amount:"500.00",code:"USG",name:"USG Abdomen",specimenType:"usg",active:true,revision:1,parameters:[{id:"77777777-7777-4777-8777-777777777778",label:"Findings",type:"text",unit:"",referenceRange:""},{id:"77777777-7777-4777-8777-777777777779",label:"Impression",type:"text",unit:"",referenceRange:""}]});
  const patient={id:patientId,mrn:"000001",name:"Lab Patient",firstName:"Lab",lastName:"Patient"};
  const writes=[],patches=[];let order=null,allowPrintWithDue=false,revision=0,otherAllowed=false,otherRevision=0;
  const access=()=>({patientId,due:due.toFixed(2),allowPrintWithDue,revision,canPrint:due===0 || allowPrintWithDue});
  await page.route("**/api/v1/**",async route=>{
    const req=route.request(),url=new URL(req.url()),path=url.pathname.replace(/^.*\/api\/v1/,"");
    const send=(data,status=200)=>route.fulfill({status,contentType:"application/json",body:JSON.stringify({success:status<400,data})});
    if(path===`/billing/laboratory/${orderId}/print-permission`){const body=req.postDataJSON();allowPrintWithDue=body.allowPrintWithDue;revision++;writes.push(path);return send(access());}
    if(path===`/billing/laboratory/99999999-9999-4999-8999-999999999999/print-permission`){const body=req.postDataJSON();otherAllowed=body.allowPrintWithDue;otherRevision++;writes.push(path);return send({allowPrintWithDue:otherAllowed,revision:otherRevision});}
    if(path==="/billing/due"){
      const row={id:orderId,orderNumber:'LAB00000001',createdAt:'2026-10-17T06:00:00Z',orderedOn:'2026-10-17',status:order?.status||'ordered',patientId,mrn:patient.mrn,patientName:patient.name,amount:'450.25',paid:(450.25-due).toFixed(2),due:due.toFixed(2),discount:'0.00',refunded:'0.00',tests:[{name:'Configured Test',amount:'450.25'}],allowPrintWithDue,printPermissionRevision:revision};
      const items=multipleDue?[row,{...row,id:'99999999-9999-4999-8999-999999999999',orderNumber:'LAB00000002',allowPrintWithDue:otherAllowed,printPermissionRevision:otherRevision}]:[row];
      return send({patient:{id:patientId,mrn:patient.mrn,name:patient.name},summary:{amount:'450.25',paid:(450.25-due).toFixed(2),due:due.toFixed(2)},items,total:items.length,page:1,pageSize:20});
    }
    if(path.startsWith("/auth/"))return send({user:{id:patientId,tenantId:testId,fullName:"Lab Staff"},accessToken:"fixture",permissions:grants,roles:["staff"],isPlatformAdmin:false});
    if(path==="/branding/appearance")return send({displayName:"Test Hospital"});
    if(path==="/patients")return send({items:[patient],total:1,page:1,pageSize:10});
    if(path==="/laboratory/tests"){
      if(req.method()==="POST"){const row={id:crypto.randomUUID(),...req.postDataJSON(),revision:1};catalog.push(row);writes.push(path);return send(row,201);}
      return send(catalog);
    }
    if(path==="/laboratory/orders"){
      if(req.method()==="POST"){
        const body=req.postDataJSON();writes.push(path);expect(body.patientId).toBe(patientId);expect(body.testIds).toEqual(diagnostic?[testId,catalog[1].id]:[testId]);
        order={id:orderId,orderNumber:"LAB00000001",orderedOn:"2026-10-17",patient,status:"ordered",priority:body.priority,revision:1,notes:body.notes,createdAt:"2026-10-17T06:00:00Z",samples:[{id:sampleId,specimenType:"blood",collectedAt:null,barcode:null}],items:[{id:itemId,testId,sampleId,testSnapshot:catalog[0],results:[],resultNotes:""}],events:[]};if(diagnostic)order.items.push({id:"88888888-8888-4888-8888-888888888888",testId:catalog[1].id,sampleId:null,testSnapshot:catalog[1],results:[],resultNotes:""});return send(order,201);
      }
      const pending=order?.items.filter(item=>!item.resultCompletedAt).length||0,mode=url.searchParams.get('worklist');
      const visible=order&&(!mode||mode==='collection'&&order.status==='ordered'||mode==='results'&&order.status!=='ordered'&&pending>0||mode==='reports'&&pending===0||mode==='radiology'&&order.items.some(item=>item.testSnapshot.category==='radiology'));
      return send({items:visible?[{...order,patientName:patient.name,mrn:patient.mrn,collectedBy:'Lab Collector',totalItems:order.items.length,pendingResults:pending}]:[],total:visible?1:0,page:1,pageSize:20,counts:visible?{[order.status]:1}:{}});
    }
    if(path===`/laboratory/orders/${orderId}`&&req.method()==='GET')return send({...order,canEdit:order.status==='ordered'&&!order.samples.some(sample=>sample.collectedAt),patientCreatedForOrder:newBooking,printAccess:access()});
    if(path===`/laboratory/orders/${orderId}`&&req.method()==='PATCH'){const body=req.postDataJSON();patches.push(body);expect(body.expectedRevision).toBe(order.revision);order.revision++;order.items=body.testIds.map(id=>({id:crypto.randomUUID(),testId:id,sampleId,testSnapshot:catalog.find(test=>test.id===id),results:[],resultNotes:''}));if(body.patient)order.patient={...order.patient,...body.patient,name:[body.patient.firstName,body.patient.lastName].join(' ')};if(body.priority)order.priority=body.priority;return send(order);}
    if(path==='/locations/districts')return send([{id:'13',name:'Pabna',bnName:'Pabna'}]);
    if(path==='/locations/upazilas')return send([{id:'85',parentId:'13',name:'Pabna Sadar',bnName:'Pabna Sadar'}]);
    if(path==='/locations/unions')return send([{id:'756',parentId:'85',name:'Dogachi',bnName:'Dogachi'}]);
    if(path===`/laboratory/orders/${orderId}/samples/${sampleId}/label`)return send({kind:"label",orderNumber:order.orderNumber,patient,sample:order.samples[0],svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80"><path stroke="black" stroke-width="5" d="M10 0v80 M30 0v80 M45 0v80 M60 0v80 M85 0v80 M100 0v80 M120 0v80 M150 0v80 M175 0v80"/></svg>'});
    if(path===`/laboratory/orders/${orderId}/order-slip`)return send({kind:"order",report:{...order,hospital:{displayName:"Test Hospital",address:"Test address"},totalAmount:"450.25",items:order.items,patient}});
    if(path===`/laboratory/orders/${orderId}/report`){
      if(!access().canPrint)return route.fulfill({status:403,contentType:"application/json",body:JSON.stringify({success:false,error:{message:"Report printing is blocked: patient lab due remains."}})});
      return send({kind:"report",report:{...order.finalReport,billing:{due:due.toFixed(2),allowPrintWithDue}}});
    }

    if(path===`/laboratory/orders/${orderId}/item-report`){
      if(!access().canPrint)return route.fulfill({status:403,contentType:"application/json",body:JSON.stringify({success:false,error:{message:"Report printing is blocked: patient lab due remains."}})});
      const ids=url.searchParams.get('itemIds').split(',');
      return send({kind:'report',report:{...order,reportTitle:diagnostic?'Radiology Report':'Laboratory Test Report',hospital:{displayName:'Test Hospital',address:'Test address'},items:ids.map(id=>order.items.find(item=>item.id===id)),recordedByName:'Lab Staff',recordedAt:'2026-10-17T06:25:00Z',billing:{due:due.toFixed(2),allowPrintWithDue}}});
    }
    if(path==='/laboratory/radiology-bookings'){
      let rows=(order?.items||[]).filter(item=>item.testSnapshot.category==='radiology').map(item=>({id:item.id,orderId:order.id,orderNumber:order.orderNumber,orderedOn:order.orderedOn,revision:order.revision,patientName:patient.name,mrn:patient.mrn,phone:'01712345678',testName:item.testSnapshot.name,code:item.testSnapshot.code,modality:item.testSnapshot.specimenType,amount:item.testSnapshot.amount,bookingStatus:item.radiologyBookingStatus||'booked',resultCompletedAt:item.resultCompletedAt}));
      if(url.searchParams.get('bookingStatus'))rows=rows.filter(row=>row.bookingStatus===url.searchParams.get('bookingStatus'));return send({items:rows,total:rows.length,page:1,pageSize:20});
    }
    if(path.endsWith('/booking-status')&&req.method()==='PATCH'){
      const body=req.postDataJSON(),item=order.items.find(item=>path.includes(item.id));expect(body.expectedRevision).toBe(order.revision);writes.push(path);order.revision++;item.radiologyBookingStatus=body.status;return send(order);
    }
    if(path.includes(`/laboratory/orders/${orderId}/items/`)&&req.method()==='PUT'){const body=req.postDataJSON(),item=order.items.find(item=>path.includes(item.id));expect(body.expectedRevision).toBe(item.resultRevision||1);item.results=body.results;item.resultNotes=body.notes;item.resultRevision=(item.resultRevision||1)+1;item.resultCompletedAt=body.complete?'2026-10-17T06:25:00Z':null;order.status=order.items.every(i=>i.resultCompletedAt)?'result_entered':'processing';order.revision++;writes.push(path);return send(order);}
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
  return {writes,patches,setCollected:()=>{order.status='sample_collected';order.samples[0].collectedAt='2026-10-17T06:00:00Z';},setOrdered:()=>{
 order={id:orderId,orderNumber:'LAB00000001',orderedOn:'2026-10-17',patient:{...patient,phone:'01712345678',ageYears:30,sex:'male',revision:1},bookingSource:'walk_in',status:'ordered',priority:'routine',revision:1,notes:'',samples:[{id:sampleId,specimenType:'blood',collectedAt:null}],items:[{id:itemId,testId,sampleId,testSnapshot:catalog[0],results:[],resultNotes:''}],events:[],address:{district:{id:'13'},upazila:{id:'85'},union:{id:'756'},village:''}};
 catalog.push({...catalog[0],id:'99999999-9999-4999-8999-999999999999',name:'Additional test',code:'ADD',amount:'200.00'});
 },setProcessing:()=>{order={id:orderId,orderNumber:"LAB00000001",orderedOn:"2026-10-17",patient,status:"processing",priority:"routine",revision:1,notes:"",samples:[],items:[{id:itemId,testSnapshot:catalog[0],results:[],resultNotes:""}],events:[]};if(multiple)order.items.push({...order.items[0],id:"88888888-8888-4888-8888-888888888888",testSnapshot:{...catalog[0],name:"Second Test",code:"SECOND"}});},setFinalized:()=>{
    order={id:orderId,orderNumber:"LAB00000001",orderedOn:"2026-10-17",createdAt:"2026-10-17T06:00:00Z",patient,status:"finalized",priority:"routine",revision:1,notes:"",samples:[],items:[{id:itemId,testSnapshot:catalog[0],results:[{parameterId,value:"123.45"}],resultRevision:1,resultCompletedAt:"2026-10-17T06:25:00Z"}],events:[],finalizedAt:"2026-10-17T06:25:00Z",finalizedByName:"Lab Finalizer"};
    order.finalReport={...order,hospital:{displayName:"Test Hospital",address:"Test address"},patient};
  }};
}
test("laboratory separates sample collection from result entry and prints finalized results",async({page},testInfo)=>{
  test.setTimeout(120000);
  const {writes}=await install(page,["lab.view","lab.create","lab.update","lab.approve","lab.export","patient.view"]);
  await page.goto("/laboratory/test-list");
  await expect(page.getByRole("link",{name:"Test List",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"New Test Booking",exact:true}).click();
  await expect(page).toHaveURL(/\/laboratory\/test-booking$/);
  let dialog=page.getByRole("main");await dialog.getByLabel("Find patient",{exact:true}).fill("Lab");
  await dialog.getByRole("button",{name:/Lab Patient.*000001/}).click();
  await dialog.getByRole("checkbox",{name:/Configured Test/}).check();
  await dialog.getByRole("button",{name:"Book tests",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Test booking successful"})).toBeVisible();
  await page.getByRole("link",{name:"View Test List",exact:true}).click();
  await expect(page.getByRole("button",{name:"Open results",exact:true})).toHaveCount(0);
  await expect(page.getByRole("list",{name:"Laboratory workflow"})).toHaveCount(0);
  await page.getByRole("button",{name:"Print",exact:true}).click();
  const slipFrame=page.frameLocator('iframe[title="Laboratory print document"]');
  await expect(slipFrame.getByRole("cell",{name:"450.25",exact:true})).toBeVisible();
  await expect(slipFrame.getByText("BDT 450.25",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Close",exact:true}).last().click();
  await page.getByRole("link",{name:"Sample Collection",exact:true}).click();
  await expect(page).toHaveURL(/\/laboratory\/sample-collection$/,{timeout:30000});
  await expect(page.getByRole("link",{name:"Lab Workflow",exact:true})).toHaveCount(0);
  await page.getByRole("button",{name:"View samples",exact:true}).click();
  dialog=page.getByRole("dialog",{name:"Sample collection LAB00000001",exact:true});
  await expect(dialog.getByRole("button",{name:"Start processing",exact:true})).toHaveCount(0);
  await dialog.getByRole("button",{name:"Collect sample",exact:true}).click();
  await expect(dialog.getByText("All samples have been collected.",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"View samples",exact:true})).toHaveCount(0);
  await expect(dialog.getByRole("button",{name:"Collect sample",exact:true})).toHaveCount(0);
  await dialog.getByRole("link",{name:"Go to Result Entry",exact:true}).click();
  await expect(page).toHaveURL(/\/laboratory\/result-entry$/,{timeout:30000});
  await expect(page.getByRole("cell",{name:"Lab Collector",exact:true})).toBeVisible();
  await expect(page.getByText("1 test pending",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Open results",exact:true}).click();
  dialog=page.getByRole("main");
  await expect(page).toHaveURL(/\/laboratory\/result-entry\/[a-f0-9-]+$/,{timeout:30000});
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(dialog.getByRole("button",{name:"Collect sample",exact:true})).toHaveCount(0);
  const frame=page.frameLocator('iframe[title="Laboratory print document"]');
  await expect(dialog.getByLabel("Configured Test: Configured parameter (unit)",{exact:true})).toHaveCount(0);
  await dialog.getByRole("button",{name:"Entry Result",exact:true}).click();
  await dialog.getByLabel("Configured Test: Configured parameter (unit)",{exact:true}).fill("123.45");
  await dialog.getByRole("button",{name:"Save result",exact:true}).click();
  await expect(dialog.getByRole("button",{name:"Complete result entry",exact:true})).toHaveCount(0);
  await dialog.getByRole("button",{name:"Print test",exact:true}).click();
  await expect(frame.getByRole("heading",{name:"Laboratory Test Report",exact:true})).toBeVisible();
  await expect(frame.getByRole("cell",{name:"123.45",exact:true})).toBeVisible();
  await expect(frame.getByText("Test address",{exact:true})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath("laboratory-final-report.png"),fullPage:true});
  expect(writes.filter(path=>path.includes("/items/"))).toHaveLength(1);
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
  await page.goto("/laboratory/test-list");await expect(page.getByRole("main").getByRole("alert")).toHaveText("You do not have permission to view Laboratory.");
  expect(requests).toEqual([]);await expect(page.getByRole("link",{name:"Test List",exact:true})).toHaveCount(0);
});

test("patient due blocks report printing until billing checkbox grants permission and revocation blocks an open preview",async({page})=>{
  await page.addInitScript(()=>{window.print=()=>window.parent.postMessage({type:"test-lab-printed"},"*");});
  const fixture=await install(page,["lab.view","lab.export","billing.view","billing.create"],{due:450.25});fixture.setFinalized();
  await page.goto("/laboratory/test-reports");await page.getByRole("button",{name:"Print / Edit",exact:true}).click();
  await expect(page).toHaveURL(new RegExp(`/laboratory/result-entry/${orderId}`),{timeout:30000});
  await expect(page.getByRole("button",{name:"Print test",exact:true})).toBeDisabled();
  await expect(page.getByText(/Report printing is blocked. Booking due:/)).toBeVisible();
  await page.goto("/dues/lab");await page.getByLabel("Search patient").fill("000001");await page.getByRole("button",{name:"Search due"}).click();
  const checkbox=page.getByRole("checkbox",{name:/Allow report printing with due for LAB00000001/});await checkbox.check();await expect(checkbox).toBeChecked();
  await expect(page.getByRole("status").filter({hasText:"LAB00000001: report print permission enabled."})).toBeVisible();
  await checkbox.uncheck();await expect(checkbox).not.toBeChecked();
  await expect(page.getByRole("status").filter({hasText:"LAB00000001: report print permission cancelled."})).toBeVisible();
  await checkbox.check();await expect(page.getByRole("status").filter({hasText:"LAB00000001: report print permission enabled."})).toBeVisible();
  await page.goto("/laboratory/test-reports");await page.getByRole("button",{name:"Print / Edit",exact:true}).click();await page.getByRole("button",{name:"Print test",exact:true}).click();
  const frame=page.frameLocator('iframe[title="Laboratory print document"]');await expect(frame.getByText("Outstanding booking due: 450.25",{exact:true})).toBeVisible();
  await page.evaluate(()=>{window.addEventListener("message",event=>{if(event.data?.type==="test-lab-printed")window.labPrinted=true;});});
  await page.getByRole("button",{name:"Print / Save PDF",exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.labPrinted)).toBe(true);
  // A separate cashier revokes permission while this report preview is open.
  await page.evaluate(async({orderId})=>{await fetch(`/api/v1/billing/laboratory/${orderId}/print-permission`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({allowPrintWithDue:false,expectedRevision:3})});},{orderId});
  await page.getByRole("button",{name:"Print / Save PDF",exact:true}).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Report printing is blocked");
  await expect(page.locator('iframe[title="Laboratory print document"]')).toHaveCount(0);
  await page.goto("/dues/lab");await page.getByLabel("Search patient").fill("000001");await page.getByRole("button",{name:"Search due"}).click();await expect(checkbox).not.toBeChecked();
});

test("report templates create editable layouts without copying patient results",async({page})=>{
 await install(page,["lab.view","lab.update"]);await page.goto('/laboratory/tests');
 const presets=page.getByRole('region',{name:'Report templates'});await expect(presets.getByRole('button')).toHaveCount(8);
 await presets.getByRole('button',{name:/TSH/}).click();let dialog=page.getByRole('dialog');await expect(dialog.getByLabel('Test code',{exact:true})).toHaveValue('TSH');await expect(dialog.getByLabel('Test amount (BDT)',{exact:true})).toHaveValue('');await expect(dialog.getByLabel('Parameter 1 reference range',{exact:true})).toHaveValue(/3rd trimester/);
 await dialog.getByRole('button',{name:'Preview report layout',exact:true}).click();await expect(dialog.getByRole('region',{name:'Report layout preview'})).toContainText('Not entered');await dialog.getByLabel('Test amount (BDT)',{exact:true}).fill('700');
 const saving=page.waitForRequest(request=>request.method()==='POST'&&request.url().endsWith('/laboratory/tests'));await dialog.getByRole('button',{name:'Save test',exact:true}).click();const payload=(await saving).postDataJSON();expect(payload.parameters[0].section).toBe('Hormone analysis');expect(payload.parameters[0].referenceRange).toContain('1st trimester');expect(payload.parameters[0].value).toBeUndefined();await expect(dialog).toHaveCount(0);
 await presets.getByRole('button',{name:/Semen Analysis \(Detailed\)/}).click();dialog=page.getByRole('dialog');await expect(dialog.getByLabel('Specimen type',{exact:true})).toHaveValue('semen');await expect(dialog.getByLabel('Parameter 15 type',{exact:true})).toHaveValue('choice');await expect(dialog.getByLabel('Parameter 15 choices',{exact:true})).toHaveValue('Present\nAbsent');await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
});
test("sectioned results support choices and optional notes before final report",async({page})=>{
 const optionId='77777777-7777-4777-8777-777777777777';
 const setup=await install(page,["lab.view","lab.update","lab.approve","lab.export"],{parameters:[{id:parameterId,label:'Clumping',type:'choice',options:['Present','Absent'],section:'Microscopic examination',unit:'',referenceRange:''},{id:optionId,label:'Opinion',type:'text',required:false,section:'Interpretation',unit:'',referenceRange:''}]});setup.setProcessing();
 await page.goto('/laboratory/result-entry');await page.getByRole('button',{name:'Open results',exact:true}).click();const dialog=page.getByRole('main');await dialog.getByRole('button',{name:'Entry Result',exact:true}).click();await expect(dialog.getByRole('heading',{name:'Microscopic examination',exact:true})).toBeVisible();await dialog.getByLabel('Configured Test: Clumping',{exact:true}).selectOption('Absent');await dialog.getByRole('button',{name:'Save result',exact:true}).click();await dialog.getByRole('button',{name:'Print test',exact:true}).click();const frame=page.frameLocator('iframe[title="Laboratory print document"]');await expect(frame.getByRole('cell',{name:'Microscopic examination',exact:true})).toBeVisible();await expect(frame.getByRole('cell',{name:'Absent',exact:true})).toBeVisible();
});

test("full urine layout saves every parameter and prints both supplied pages of findings",async({page})=>{
 test.setTimeout(120000);
 const parameters=[];const setup=await install(page,["lab.view","lab.update","lab.approve","lab.export"],{parameters});
 await page.goto('/laboratory/tests');await page.getByRole('region',{name:'Report templates'}).getByRole('button',{name:/Urine R\/E/}).click();const catalog=page.getByRole('dialog');await expect(catalog.getByLabel('Parameter 31 name',{exact:true})).toHaveValue('Others');await catalog.getByLabel('Test amount (BDT)',{exact:true}).fill('350');const saving=page.waitForRequest(r=>r.method()==='POST'&&r.url().endsWith('/laboratory/tests'));await catalog.getByRole('button',{name:'Save test',exact:true}).click();parameters.push(...(await saving).postDataJSON().parameters);expect(parameters).toHaveLength(31);await expect(catalog).toHaveCount(0);
 setup.setProcessing();await page.goto('/laboratory/result-entry');await page.getByRole('button',{name:'Open results',exact:true}).click();const dialog=page.getByRole('main');
 await dialog.getByRole('button',{name:'Entry Result',exact:true}).click();
 for(const [i,parameter] of parameters.entries()){if(parameter.required===false)continue;const label=`Configured Test: ${parameter.label}${parameter.unit?` (${parameter.unit})`:''}`;await expect(dialog.getByLabel(label,{exact:true})).toHaveValue('');await dialog.getByLabel(label,{exact:true}).fill(`Finding ${i+1}`);}
 await dialog.getByRole('button',{name:'Save result',exact:true}).click();await dialog.getByRole('button',{name:'Print test',exact:true}).click();const frame=page.frameLocator('iframe[title="Laboratory print document"]');await expect(frame.getByRole('cell',{name:'Casts',exact:true})).toBeVisible();await expect(frame.getByRole('cell',{name:'Crystals & others',exact:true})).toBeVisible();await expect(frame.getByRole('cell',{name:'Spermatozoa',exact:true})).toBeVisible();await expect(frame.getByRole('cell',{name:'Finding 30',exact:true})).toBeVisible();
});

test("individual results support combined and separate printing without saved groups",async({page})=>{
 test.setTimeout(120000);const setup=await install(page,["lab.view","lab.update","lab.export"],{multiple:true});setup.setProcessing();
 await page.goto('/laboratory/result-entry');await page.getByRole('button',{name:'Open results',exact:true}).click();let dialog=page.getByRole('main');
 await expect(dialog.getByLabel('Configured Test: Configured parameter (unit)',{exact:true})).toHaveCount(0);await dialog.getByRole('button',{name:'Entry Result',exact:true}).first().click();await expect(page.getByRole('dialog',{name:'Entry Result / Configured Test',exact:true})).toBeVisible();
 await dialog.getByLabel('Configured Test: Configured parameter (unit)',{exact:true}).fill('10.5');await dialog.getByRole('button',{name:'Save result',exact:true}).first().click();
 await expect(dialog.getByRole('button',{name:'Print test',exact:true}).first()).toBeEnabled();await expect(dialog.getByRole('button',{name:'Print test',exact:true}).nth(1)).toBeDisabled();
 await dialog.getByRole('button',{name:'Print test',exact:true}).first().click();let frame=page.frameLocator('iframe[title="Laboratory print document"]');await expect(frame.getByRole('cell',{name:'10.5',exact:true})).toBeVisible();await expect(frame.getByRole('heading',{name:/Second Test/})).toHaveCount(0);await page.getByRole('button',{name:'Back to results',exact:true}).click();dialog=page.getByRole('main');
 await expect(dialog.getByLabel('Print group name',{exact:true})).toHaveCount(0);await expect(dialog.getByRole('button',{name:'Save print group',exact:true})).toHaveCount(0);
 await dialog.getByLabel('Select Configured Test',{exact:true}).check();await dialog.getByLabel('Select Second Test',{exact:true}).check();await expect(dialog.getByRole('button',{name:'Print Group Tests',exact:true})).toBeDisabled();
 await dialog.getByRole('button',{name:'Entry Result',exact:true}).click();await dialog.getByLabel('Second Test: Configured parameter (unit)',{exact:true}).fill('20.5');await dialog.getByRole('button',{name:'Save result',exact:true}).click();await dialog.getByRole('button',{name:'Print Group Tests',exact:true}).click();frame=page.frameLocator('iframe[title="Laboratory print document"]');await expect(frame.getByRole('heading',{name:'Laboratory Test Report',exact:true})).toBeVisible();await expect(frame.getByRole('cell',{name:'20.5',exact:true})).toBeVisible();
 const groupHtml=await frame.locator('html').evaluate(node=>node.outerHTML);const printable=await page.context().newPage();await printable.setContent(groupHtml);const groupPdf=await printable.pdf({preferCSSPageSize:true});expect((groupPdf.toString('latin1').match(/\/Type\s*\/Page\b/g)||[])).toHaveLength(1);
 await page.getByRole('button',{name:'Back to results',exact:true}).click();dialog=page.getByRole('main');await dialog.getByLabel('Select Configured Test',{exact:true}).check();await dialog.getByLabel('Select Second Test',{exact:true}).check();await dialog.getByRole('button',{name:'Print Selected Tests',exact:true}).click();frame=page.frameLocator('iframe[title="Laboratory print document"]');await expect(frame.locator('article.separate-test-report')).toHaveCount(2);await expect(frame.getByRole('heading',{name:'Test Hospital',exact:true})).toHaveCount(2);await expect(frame.getByText('MRN:',{exact:false})).toHaveCount(2);
 await printable.setContent(await frame.locator('html').evaluate(node=>node.outerHTML));const separatePdf=await printable.pdf({preferCSSPageSize:true});expect((separatePdf.toString('latin1').match(/\/Type\s*\/Page\b/g)||[])).toHaveLength(2);await printable.close();await page.getByRole('button',{name:'Back to results',exact:true}).click();dialog=page.getByRole('main');
 await dialog.getByRole('button',{name:'Edit result',exact:true}).first().click();await dialog.getByLabel('Configured Test: Configured parameter (unit)',{exact:true}).fill('11.5');await expect(dialog.getByRole('button',{name:'Print test',exact:true}).first()).toBeDisabled();await dialog.getByLabel('Configured Test edit reason',{exact:true}).fill('Corrected analyzer reading');await dialog.getByRole('button',{name:'Save result',exact:true}).click();await dialog.getByRole('button',{name:'Print test',exact:true}).first().click();frame=page.frameLocator('iframe[title="Laboratory print document"]');await expect(frame.getByRole('cell',{name:'11.5',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Back to results',exact:true}).click();await page.getByRole('button',{name:'Back to Result Entry',exact:true}).click();await expect(page.getByRole('button',{name:'Open results',exact:true})).toHaveCount(0);
 await page.getByRole('link',{name:'Test Reports',exact:true}).click();await expect(page.getByRole('cell',{name:'Lab Collector',exact:true})).toBeVisible();await page.getByRole('button',{name:'Print / Edit',exact:true}).click();await expect(page).toHaveURL(/result-entry\/[^/?]+\?from=reports$/);await expect(page.getByRole('button',{name:'Back to Test Reports',exact:true})).toBeVisible();

});

test("ordered existing patient bookings allow only test selection and lock after collection",async({page})=>{
 const setup=await install(page,["lab.view","lab.update","patient.view"]);setup.setOrdered();await page.goto('/laboratory/test-list');await page.getByRole('button',{name:'Edit',exact:true}).click();const dialog=page.getByRole('dialog');
 await expect(dialog.getByLabel('First name',{exact:true})).toHaveCount(0);await expect(dialog.getByLabel('Priority',{exact:true})).toHaveCount(0);
 await dialog.getByRole('checkbox',{name:/Additional test/}).check();await dialog.getByRole('checkbox',{name:/Configured Test/}).uncheck();await dialog.getByRole('button',{name:'Save changes',exact:true}).click();await expect(dialog).toHaveCount(0);expect(Object.keys(setup.patches[0]).sort()).toEqual(['expectedRevision','testIds']);expect(setup.patches[0].testIds).toEqual(['99999999-9999-4999-8999-999999999999']);
 setup.setCollected();await page.reload();await expect(page.getByRole('button',{name:'Edit',exact:true})).toBeDisabled();
});
test("patients registered at booking can edit demographics and booking details",async({page})=>{
 const setup=await install(page,["lab.view","lab.update","patient.view","patient.update"],{newBooking:true});setup.setOrdered();await page.goto('/laboratory/test-list');await page.getByRole('button',{name:'Edit',exact:true}).click();const dialog=page.getByRole('dialog');await dialog.getByLabel('First name',{exact:true}).fill('Updated');await dialog.getByLabel('Phone number',{exact:true}).fill('01812345678');await dialog.getByLabel('Priority',{exact:true}).selectOption('urgent');await dialog.getByRole('checkbox',{name:/Additional test/}).check();await dialog.getByRole('button',{name:'Save changes',exact:true}).click();await expect(dialog).toHaveCount(0);expect(setup.patches[0].patient).toMatchObject({firstName:'Updated',phone:'01812345678',expectedRevision:1});expect(setup.patches[0].priority).toBe('urgent');expect(setup.patches[0].testIds).toHaveLength(2);
});

test("diagnostic booking uses one list and radiology reports bypass specimen collection",async({page})=>{
 test.setTimeout(120000);
 await install(page,["lab.view","lab.create","lab.update","lab.export","patient.view"],{diagnostic:true});
 await page.goto('/laboratory/test-booking');const main=page.getByRole('main');
 await expect(main.getByRole('tab')).toHaveCount(0);
 await main.getByLabel('Find patient',{exact:true}).fill('Lab');await main.getByRole('button',{name:/Lab Patient.*000001/}).click();
 await main.getByRole('checkbox',{name:/Configured Test/}).check();await main.getByRole('checkbox',{name:/USG Abdomen/}).check();
 await expect(main.getByText('BDT 950.25',{exact:true})).toBeVisible();await main.getByRole('button',{name:'Book tests',exact:true}).click();
 await expect(main.getByRole('heading',{name:'Test booking successful'})).toBeVisible();
 await page.goto('/radiology-imaging/report-entry');await page.getByRole('button',{name:'Open results',exact:true}).click();
 await expect(page).toHaveURL(/radiology-imaging\/report-entry\/[a-f0-9-]+$/,{timeout:30000});
 await expect(main.getByRole('button',{name:'Entry Result',exact:true})).toHaveCount(1);await expect(main.getByText('Configured Test',{exact:true})).toHaveCount(0);
 await main.getByRole('button',{name:'Entry Result',exact:true}).click();const modal=page.getByRole('dialog');
 await modal.getByLabel('USG Abdomen: Findings',{exact:true}).fill('Normal study.');await modal.getByLabel('USG Abdomen: Impression',{exact:true}).fill('No abnormality detected.');
 await modal.getByRole('button',{name:'Save result',exact:true}).click();await expect(modal).toHaveCount(0);
 await main.getByRole('button',{name:'Print test',exact:true}).click();const frame=page.frameLocator('iframe[title="Laboratory print document"]');
 await expect(frame.getByRole('heading',{name:'Radiology Report',exact:true})).toBeVisible();await expect(frame.getByRole('heading',{name:'Findings',exact:true})).toBeVisible();await expect(frame.getByText('Normal study.',{exact:true})).toBeVisible();await expect(frame.getByRole('table')).toHaveCount(0);
});

test("test list actions stay alongside and View shows booking details without editing",async({page})=>{
 test.setTimeout(120000);const setup=await install(page,["lab.view","lab.update","lab.export"]);setup.setOrdered();
 await page.goto('/laboratory/test-list');const main=page.getByRole('main'),view=main.getByRole('button',{name:'View',exact:true}),edit=main.getByRole('button',{name:'Edit',exact:true}),print=main.getByRole('button',{name:'Print',exact:true});
 await expect(view).toBeVisible();const boxes=await Promise.all([view,edit,print].map(button=>button.boundingBox()));expect(boxes.every(box=>Math.abs(box.y-boxes[0].y)<2)).toBe(true);expect(boxes[0].x).toBeLessThan(boxes[1].x);expect(boxes[1].x).toBeLessThan(boxes[2].x);
 await view.click();const modal=page.getByRole('dialog',{name:'Booking details / LAB00000001'});await expect(modal.getByRole('heading',{name:'Lab Patient',exact:true})).toBeVisible();await expect(modal.getByText('01712345678',{exact:true})).toBeVisible();await expect(modal.getByRole('region',{name:'Booked tests'}).getByText('Configured Test',{exact:true})).toBeVisible();await expect(modal.getByText('Awaiting sample',{exact:true})).toBeVisible();await expect(modal.getByRole('textbox')).toHaveCount(0);await modal.getByRole('button',{name:'Close',exact:true}).last().click();await expect(modal).toHaveCount(0);expect(setup.writes).toHaveLength(0);
});

test("radiology menu separates booking status management from unchanged report entry",async({page})=>{
 test.setTimeout(120000);const setup=await install(page,["lab.view","lab.create","lab.update","lab.export","patient.view"],{diagnostic:true});
 await page.goto('/laboratory/test-booking');const main=page.getByRole('main');await main.getByLabel('Find patient',{exact:true}).fill('Lab');await main.getByRole('button',{name:/Lab Patient.*000001/}).click();await main.getByRole('checkbox',{name:/Configured Test/}).check();await main.getByRole('checkbox',{name:/USG Abdomen/}).check();await main.getByRole('button',{name:'Book tests',exact:true}).click();await expect(main.getByRole('heading',{name:'Test booking successful'})).toBeVisible();
 await page.goto('/radiology-imaging/test-list');await expect(main.getByRole('heading',{name:'Radiology Test List',exact:true})).toBeVisible();await expect(main.getByText('Configured Test',{exact:true})).toHaveCount(0);
 await main.getByLabel('Status for USG Abdomen',{exact:true}).selectOption('in_progress');await main.getByRole('button',{name:'Save status',exact:true}).click();await expect(main.getByRole('cell',{name:'In Progress',exact:true})).toBeVisible();
 await main.getByLabel('Status for USG Abdomen',{exact:true}).selectOption('completed');await main.getByRole('button',{name:'Save status',exact:true}).click();await expect(main.getByRole('cell',{name:'Completed',exact:true})).toBeVisible();
 await main.getByRole('button',{name:'Open Report',exact:true}).click();await expect(page).toHaveURL(/radiology-imaging\/report-entry\/[a-f0-9-]+$/,{timeout:30000});await expect(main.getByRole('button',{name:'Entry Result',exact:true})).toBeEnabled();await expect(main.getByRole('button',{name:'Mark as Performed',exact:true})).toHaveCount(0);await expect(main.getByRole('button',{name:'Mark Report Delivered',exact:true})).toHaveCount(0);
 await page.goto('/laboratory/test-list');await main.getByRole('button',{name:'View',exact:true}).click();const modal=page.getByRole('dialog',{name:/Booking details/});await expect(modal.getByRole('button',{name:/Mark/})).toHaveCount(0);expect(setup.writes.filter(path=>path.endsWith('/booking-status'))).toHaveLength(2);
});

test("due table grants report printing per Lab ID for repeated bookings under the same MRN",async({page})=>{
 test.setTimeout(120000);const setup=await install(page,["billing.view","billing.create"],{due:450.25,multipleDue:true});
 await page.goto('/dues/lab');await page.getByLabel('Search patient').fill('000001');await page.getByRole('button',{name:'Search due',exact:true}).click();
 const first=page.getByRole('checkbox',{name:'Allow report printing with due for LAB00000001',exact:true}),second=page.getByRole('checkbox',{name:'Allow report printing with due for LAB00000002',exact:true});
 await expect(page.getByRole('checkbox',{name:'Allow lab report printing with due',exact:true})).toHaveCount(0);await expect(first).not.toBeChecked();await expect(second).not.toBeChecked();
 await first.check();await expect(first).toBeChecked();await expect(second).not.toBeChecked();expect(setup.writes.at(-1)).toBe(`/billing/laboratory/${orderId}/print-permission`);
 await second.check();await expect(second).toBeChecked();await first.uncheck();await expect(first).not.toBeChecked();await expect(second).toBeChecked();
});
