const {test,expect}=require("@playwright/test");
const patientId="11111111-1111-4111-8111-111111111111",orderId="22222222-2222-4222-8222-222222222222",doctorId="33333333-3333-4333-8333-333333333333";
async function install(page,grants=["billing.view","billing.create","billing.approve"]){
  const writes=[];let paid=0,doctorPaid=0,discount=0;
  const payments=[],payouts=[];
  const order=()=>({id:orderId,orderNumber:"LAB00000001",orderedOn:"2026-10-17",createdAt:"2026-10-17T06:00:00Z",status:"ordered",patientId,mrn:"000001",patientName:"Billing Patient",amount:"300.30",discount:discount.toFixed(2),net:(300.30-discount).toFixed(2),paid:paid.toFixed(2),due:(300.30-paid-discount).toFixed(2),tests:[{name:"Blood count",amount:"100.10"},{name:"Glucose",amount:"200.20"}]});
  const doctor=()=>({id:doctorId,doctorName:"Dr Billing",doctorCode:"D00001",visits:1,collected:"500.00",refunded:"0.00",earned:"500.00",paid:doctorPaid.toFixed(2),balance:(500-doctorPaid).toFixed(2)});
  const paged=(items,summary={})=>({items,total:items.length,page:1,pageSize:20,summary});
  await page.route("**/api/v1/**",async route=>{
    const req=route.request(),url=new URL(req.url()),path=url.pathname.replace(/^.*\/api\/v1/,"");
    const send=(data,status=200)=>route.fulfill({status,contentType:"application/json",body:JSON.stringify({success:status<400,data})});
    if(path.startsWith("/auth/"))return send({user:{id:patientId,tenantId:orderId,fullName:"Billing Staff"},accessToken:"fixture",permissions:grants,roles:["staff"],isPlatformAdmin:false});
    if(path==="/branding/appearance")return send({displayName:"Test Hospital"});
    if(req.method()==="POST"){
      const body=req.postDataJSON();writes.push({path,body});
      const payment={id:crypto.randomUUID(),...body,createdAt:"2026-10-17T07:00:00Z",createdByName:"Billing Staff"};
      if(path===`/billing/laboratory/${orderId}/settle`){
        const received=Number(body.amount),discountAmount=300.30-paid-received;paid+=received;discount+=discountAmount;
        const discountEntry={id:crypto.randomUUID(),type:"discount",amount:discountAmount.toFixed(2),reason:body.reason,createdAt:payment.createdAt,createdByName:"Billing Staff"};
        payments.push({...payment,type:"payment",reason:null},discountEntry);return send({payment,discount:discountEntry},201);
      }
      if(path===`/billing/laboratory/${orderId}/payments`){paid+=Number(body.amount);payments.push(payment);return send(payment,201);}
      if(path===`/billing/doctors/${doctorId}/payments`){doctorPaid+=Number(body.amount);payouts.push(payment);return send(payment,201);}
      return send(null,404);
    }
    if(path==="/billing/due"){
      if(url.searchParams.get("patient")==="missing")return route.fulfill({status:404,contentType:"application/json",body:JSON.stringify({success:false,error:{message:"No patient found with this patient ID or MRN"}})});
      return send({...paged([order()],{amount:"300.30",discount:discount.toFixed(2),net:(300.30-discount).toFixed(2),paid:paid.toFixed(2),due:(300.30-paid-discount).toFixed(2)}),patient:{id:patientId,mrn:"000001",name:"Billing Patient",phone:"01700000000"}});
    }
    if(path==="/billing/laboratory")return send(paged([order()],{amount:"300.30",discount:discount.toFixed(2),net:(300.30-discount).toFixed(2),paid:paid.toFixed(2),due:(300.30-paid-discount).toFixed(2)}));
    if(path===`/billing/laboratory/${orderId}/payments`)return send(paged(payments,{paid:paid.toFixed(2)}));
    if(path==="/billing/doctors")return send(paged([doctor()],{earned:"500.00",paid:doctorPaid.toFixed(2),payable:(500-doctorPaid).toFixed(2),recovery:"0.00"}));
    if(path.startsWith(`/billing/doctors/${doctorId}/payments/`)&&path.endsWith("/receipt")){
      const payment=payouts.find(p=>p.id===path.split("/").at(-2));return send({...payment,receiptNumber:`DP-${payment.id.toUpperCase()}`,doctorName:"Dr Billing",doctorCode:"D00001",hospital:{displayName:"Test Hospital",address:"Hospital Road",phone:"01700000000"}});
    }
    if(path===`/billing/doctors/${doctorId}`){expect(url.searchParams.has("kind")).toBe(false);return send({...paged(payouts),doctor:doctor()});}
    if(path==="/billing/opd")return send(paged([{id:orderId,date:"2026-10-17",patientName:"Billing Patient",mrn:"000001",doctorName:"Dr Billing",visitType:"new",status:"completed",amount:"500.00",collected:"500.00",refunded:"0.00",net:"500.00"}],{collected:"500.00",refunded:"0.00",net:"500.00",pending:"0.00"}));
    return send(null);
  });
  return writes;
}
test("Billing menu opens due search, collects partial and full lab payments, and preserves history",async({page})=>{
  const writes=await install(page);
  await page.goto("/billing/due");
  await expect(page.getByRole("button",{name:"Billing",exact:true})).toBeVisible();
  for(const href of ["opd","laboratory","doctors","due"])await expect(page.locator(`a[href="/billing/${href}"]`)).toBeVisible();
  await page.getByLabel("Search patient").fill("000001");await page.getByRole("button",{name:"Search due"}).click();
  await expect(page.getByText("Blood count")).toBeVisible();await expect(page.getByText("Glucose")).toBeVisible();
  await page.getByRole("button",{name:"Collect payment"}).click();
  let dialog=page.getByRole("dialog");await dialog.getByLabel("Payment amount").fill("100.10");
  await dialog.getByRole("button",{name:"Record payment"}).click();await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("cell",{name:"200.20",exact:true})).toBeVisible();
  expect(writes[0].body.amount).toBe("100.10");expect(writes[0].body.requestKey).toMatch(/^[0-9a-f-]{36}$/);
  await page.getByRole("button",{name:"Collect payment"}).click();dialog=page.getByRole("dialog");
  await expect(dialog.getByLabel("Payment amount")).toHaveValue("200.20");
  await dialog.getByLabel("Payment method").selectOption("mobile");
  await expect(dialog.getByLabel("Transaction reference")).toHaveCount(0);await expect(dialog.getByLabel("Notes",{exact:true})).toHaveCount(0);
  await dialog.getByRole("button",{name:"Record payment"}).click();
  await expect(page.getByRole("cell",{name:"0.00",exact:true}).last()).toBeVisible();
  await expect(page.getByRole("button",{name:"Collect payment"})).toHaveCount(0);
  await page.getByRole("button",{name:"Payment history",exact:true}).click();
  await expect(page.getByRole("dialog").getByText("Mobile banking",{exact:true})).toBeVisible();
  expect(writes[1].body.requestKey).not.toBe(writes[0].body.requestKey);
});
test("Doctor bill payments update balances and appear in account history",async({page},testInfo)=>{
  const writes=await install(page);await page.goto("/billing/doctors");
  await page.getByRole("button",{name:"Pay bill",exact:true}).click();
  const dialog=page.getByRole("dialog");await dialog.getByLabel("Payment amount").fill("500.00");
  await expect(dialog.getByLabel("Transaction reference")).toHaveCount(0);await expect(dialog.getByLabel("Notes",{exact:true})).toHaveCount(0);
  await expect(dialog.getByText("Record this payment after paying the doctor. It will be saved in payment history.",{exact:true})).toHaveCount(0);
  await dialog.getByRole("button",{name:"Record payment"}).click();
  await expect(page.getByRole("button",{name:"Pay bill",exact:true})).toHaveCount(0);
  expect(writes[0].path).toBe(`/billing/doctors/${doctorId}/payments`);
  await page.getByRole("button",{name:"View account"}).click();
  await expect(page.getByRole("dialog").getByRole("button",{name:"OPD visits",exact:true})).toHaveCount(0);
  await expect(page.getByRole("dialog").getByRole("cell",{name:"Billing Staff",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Print receipt",exact:true}).click();
  const receipt=page.frameLocator('iframe[title="Doctor payment receipt preview"]');
  await expect(receipt.getByRole("heading",{name:"Payment Receipt",exact:true})).toBeVisible();
  await expect(receipt.getByRole("heading",{name:"Test Hospital",exact:true})).toBeVisible();
  await expect(receipt.getByText("Total paid",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Print / Save PDF",exact:true})).toBeEnabled();
  await page.screenshot({path:testInfo.outputPath("doctor-payment-receipt.png"),fullPage:true});
  await page.locator('iframe[title="Doctor payment receipt preview"]').evaluate(frame=>{frame.contentWindow.print=()=>{frame.dataset.printed="true";};});
  await page.getByRole("button",{name:"Print / Save PDF",exact:true}).click();
  await expect(page.locator('iframe[title="Doctor payment receipt preview"]')).toHaveAttribute("data-printed","true");
  await page.getByRole("button",{name:"Back to history",exact:true}).click();
  await expect(page.getByRole("button",{name:"Print receipt",exact:true})).toBeVisible();
});
test("Billing readers see reports without collection and payout actions and missing patient errors are visible",async({page})=>{
  const writes=await install(page,["billing.view"]);await page.goto("/billing/laboratory");
  await expect(page.getByRole("cell",{name:"LAB00000001",exact:false})).toBeVisible();
  await expect(page.getByRole("button",{name:"Collect payment"})).toHaveCount(0);
  await page.goto("/billing/doctors");await expect(page.getByRole("button",{name:"View account"})).toBeVisible();await expect(page.getByRole("button",{name:"Pay bill"})).toHaveCount(0);
  await page.goto("/billing/opd");await expect(page.getByRole("heading",{name:"OPD Billing",exact:true})).toBeVisible();
  await page.getByLabel("Visit date from").fill("2026-10-18");await page.getByLabel("To date",{exact:true}).fill("2026-10-17");
  await expect(page.getByRole("alert").filter({hasText:"From date must be before"})).toBeVisible();
  await page.goto("/billing/due");await page.getByLabel("Search patient").fill("missing");await page.getByRole("button",{name:"Search due"}).click();
  await expect(page.getByRole("alert").filter({hasText:"No patient found"})).toBeVisible();expect(writes).toHaveLength(0);
});
test("Users without billing permission cannot open billing reports",async({page})=>{
  await install(page,[]);await page.goto("/billing/due");
  await expect(page.getByRole("button",{name:"Billing",exact:true})).toHaveCount(0);
  await expect(page.getByRole("alert").filter({hasText:"You do not have permission to view Billing."})).toBeVisible();
  await expect(page.getByLabel("Search patient")).toHaveCount(0);
});

test("Management can accept a lower payment and settle the balance as a separate discount",async({page},testInfo)=>{
  const writes=await install(page);await page.goto("/billing/due");
  await page.getByLabel("Search patient").fill("000001");await page.getByRole("button",{name:"Search due"}).click();
  await page.getByRole("button",{name:"Collect payment",exact:true}).click();
  const dialog=page.getByRole("dialog");await dialog.getByLabel("Payment amount",{exact:true}).fill("250.00");
  await dialog.getByRole("radio",{name:/Discount & settle bill/}).check();
  await expect(dialog.getByText("50.30",{exact:true})).toBeVisible();
  await dialog.getByLabel("Discount reason",{exact:true}).selectOption("Financial hardship");
  await page.screenshot({path:testInfo.outputPath("lab-discount-settlement.png"),fullPage:true});
  await dialog.getByRole("button",{name:"Receive & settle bill",exact:true}).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("cell",{name:"0.00",exact:true}).last()).toBeVisible();
  expect(writes[0].path).toBe(`/billing/laboratory/${orderId}/settle`);
  expect(writes[0].body).toMatchObject({amount:"250.00",expectedDue:"300.30",reason:"Financial hardship"});
  await expect(page.getByRole("cell",{name:"50.30",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Payment history",exact:true}).click();
  await expect(page.getByRole("dialog").getByRole("cell",{name:"Discount",exact:true})).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("cell",{name:"Financial hardship",exact:true})).toBeVisible();
});
test("Collection-only staff can take partial payments without discounting a bill",async({page})=>{
  const writes=await install(page,["billing.view","billing.create"]);await page.goto("/billing/due");
  await page.getByLabel("Search patient").fill("000001");await page.getByRole("button",{name:"Search due"}).click();
  await page.getByRole("button",{name:"Collect payment",exact:true}).click();
  const dialog=page.getByRole("dialog");await dialog.getByLabel("Payment amount",{exact:true}).fill("250.00");
  await expect(dialog.getByRole("radio",{name:/Discount & settle bill/})).toHaveCount(0);
  await dialog.getByRole("button",{name:"Record payment",exact:true}).click();
  await expect(page.getByRole("cell",{name:"50.30",exact:true})).toBeVisible();expect(writes[0].path).toBe(`/billing/laboratory/${orderId}/payments`);
});

test("Due searches by lab number without patient detail and amount summary cards",async({page})=>{
  await install(page);const searches=[];page.on("request",request=>{const url=new URL(request.url());if(url.pathname.endsWith("/billing/due"))searches.push(url.searchParams.get("patient"));});
  await page.goto("/billing/due");await page.getByLabel("Search patient").fill("LAB00000001");await page.getByRole("button",{name:"Search due"}).click();
  await expect(page.getByRole("cell").filter({hasText:"LAB00000001"})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Billing Patient",exact:true})).toHaveCount(0);
  await expect(page.getByText("Total Lab Bill",{exact:true})).toHaveCount(0);
  await expect(page.getByText(`Patient ID: ${patientId}`,{exact:true})).toHaveCount(0);
  expect(searches).toContain("LAB00000001");
});
