const {test,expect}=require("@playwright/test");
test("Revenue Billing and Dues menus preserve account pages and redirects",async({page})=>{
 await page.route("**/api/v1/**",async route=>{
  const path=new URL(route.request().url()).pathname.replace(/^.*\/api\/v1/,"");const send=data=>route.fulfill({contentType:"application/json",body:JSON.stringify({success:true,data})});
  if(path.startsWith("/auth/"))return send({user:{id:"11111111-1111-4111-8111-111111111111",tenantId:"22222222-2222-4222-8222-222222222222",fullName:"Accountant"},accessToken:"fixture",permissions:["billing.view","billing.approve","inpatient.view","doctor.view","appointment.view"],roles:["staff"],isPlatformAdmin:false});
  if(path==="/branding/appearance")return send({displayName:"Hospital"});
  if(path==="/billing/pc")return send({summary:{pcBill:"0.00",paid:"0.00",remaining:"0.00",overpaid:"0.00",unconfiguredOrders:0},reference:null,items:[],total:0,page:1,pageSize:20});
  if(path==="/billing/doctors")return send({summary:{earned:"0.00",paid:"0.00",balance:"0.00"},items:[],total:0,page:1,pageSize:20});
  return send(null);
 });
 for(const [old,url,heading] of [["/opd/due","/dues/lab","Patient Due"],["/dues/pc","/billing/pc","PC"],["/doctors/due","/billing/doctors","Doctor Billing"],["/billing/opd","/revenue/opd","OPD Billing"],["/billing/laboratory","/revenue/laboratory","Laboratory Billing"]]){
  await page.goto(old);await expect(page).toHaveURL(new RegExp(`${url}$`));await expect(page.getByRole("heading",{name:heading,exact:true})).toBeVisible();
  if(url.startsWith("/dues/")){const nav=page.getByRole("navigation",{name:"Dues navigation"});await expect(nav.getByRole("link")).toHaveText(["Lab"]);await expect(nav.locator('[aria-current="page"]')).toHaveAttribute("href",url);}
 }
 const dues=page.getByRole("button",{name:"Dues",exact:true}).locator("..");await expect(dues.getByRole("link")).toHaveText(["Lab"]);
 await expect(page.getByRole("button",{name:"Billing",exact:true}).locator("..").getByRole("link")).toHaveText(["PC","Doctors","Refund History","Refund Approval"]);
 await expect(page.getByRole("button",{name:"Revenue",exact:true}).locator("..").getByRole("link")).toHaveText(["OPD","Laboratory"]);
 await expect(page.getByRole("button",{name:"IPD",exact:true}).locator("..").getByRole("link",{name:"Due",exact:true})).toHaveCount(0);
 await expect(page.getByRole("button",{name:"Doctors",exact:true})).toHaveCount(0);
});
