const {test,expect}=require("@playwright/test");
test("By Reference shows test-only PC Bill and hospital share",async({page})=>{
 const ref="11111111-1111-4111-8111-111111111111",doctor="22222222-2222-4222-8222-222222222222";
 const pc={testAmount:"2000.00",collected:"1600.00",hospitalShare:"1200.00",pcBill:"400.00",due:"0.00",orderCount:1,unconfiguredOrders:0};
 await page.route("**/api/v1/**",async route=>{
  const url=new URL(route.request().url()),path=url.pathname.replace(/^.*\/api\/v1/,"");
  const send=data=>route.fulfill({contentType:"application/json",body:JSON.stringify({success:true,data})});
  if(path.startsWith("/auth/"))return send({user:{id:doctor,tenantId:ref,fullName:"Accountant"},accessToken:"fixture",permissions:["appointment.view","billing.view"],roles:["staff"],isPlatformAdmin:false});
  if(path==="/branding/appearance")return send({displayName:"Hospital"});
  if(path==="/appointments/booking-references")return send([{id:ref,name:"Referral Person",code:"REF000001",count:2}]);
  if(path==="/appointments/booking-doctors")return send([{id:doctor,fullName:"Dr Test",count:2}]);
  if(path==="/appointments"){const items=[{id:ref,patientName:"Test Patient",mrn:"000001",doctorName:"Dr Test",status:"completed",amount:"500.00",visitType:"new",referenceName:"Referral Person",pcBill:pc},{id:doctor,patientName:"No Test Patient",mrn:"000002",doctorName:"Dr Test",status:"pending",amount:"500.00",visitType:"new",referenceName:"Referral Person",pcBill:null}];return send({items:url.searchParams.get("patientFilter")==="test_orders"?items.slice(0,1):items,total:url.searchParams.get("patientFilter")==="test_orders"?1:2,page:1,pageSize:20,amounts:{completed:{amount:"500.00"}},pcSummary:pc});}
  return send(null);
 });
 await page.goto("/appointments/by-reference");await page.getByLabel("Reference",{exact:true}).selectOption(ref);
 const totals=page.getByRole("region",{name:"PC Bill totals"});await expect(totals).toContainText("2,000.00");await expect(totals).toContainText("1,600.00");await expect(totals).toContainText("1,200.00");await expect(totals).toContainText("400.00");
 const tested=page.getByRole("row").filter({hasText:"000001"});await expect(tested).toContainText("400.00");
 const untested=page.getByRole("row").filter({hasText:"000002"});await expect(untested).not.toContainText("400.00");
 await page.getByLabel("Patients",{exact:true}).selectOption("test_orders");await expect(untested).toHaveCount(0);await expect(tested).toContainText("400.00");
});

