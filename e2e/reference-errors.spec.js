const { test, expect } = require("@playwright/test");

for (const scenario of [
  { name: "missing API route", status: 404, body: "<html>Not found</html>", type: "text/html", expected: /Reference API route was not found \(HTTP 404\)/ },
  { name: "invalid phone", status: 422, body: JSON.stringify({success:false,error:{message:"Check the reference form values",details:{issues:[{path:["phone"],message:"Enter a valid phone number"}]}}}), type: "application/json", expected: /phone: Enter a valid phone number/ },
  { name: "connection failure", abort: true, expected: /Cannot connect to the server/ },
]) test(`reference creation explains ${scenario.name} instead of a generic error`, async ({page}) => {
  await page.route("**/api/v1/**",async route=>{
    const request=route.request(),path=new URL(request.url()).pathname;
    const send=data=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({success:true,data})});
    if(path.includes("/auth/"))return send({user:{id:"11111111-1111-4111-8111-111111111111",tenantId:"22222222-2222-4222-8222-222222222222",fullName:"Staff"},accessToken:"fixture",permissions:["user.view","user.create"],roles:["staff"],isPlatformAdmin:false});
    if(path.endsWith("/branding/appearance"))return send({displayName:"Hospital"});
    if(path.endsWith("/references")&&request.method()==="POST")return scenario.abort ? route.abort("connectionrefused") : route.fulfill({status:scenario.status,contentType:scenario.type,body:scenario.body});
    if(path.endsWith("/references"))return send({items:[],total:0,page:1,pageSize:20,defaultReference:null});
    return send(null);
  });
  await page.goto("/users/references");
  await page.getByRole("button",{name:"Add reference",exact:true}).click();
  const dialog=page.getByRole("dialog",{name:"Create reference",exact:true});
  for(const [name,value]of Object.entries({Name:"Test Referral",Phone:"01712345678",Address:"Dhaka",Designation:"Consultant"}))await dialog.getByLabel(name,{exact:true}).fill(value);
  await dialog.getByRole("button",{name:"Save reference",exact:true}).click();
  await expect(dialog.getByRole("alert")).toHaveText(scenario.expected);
  await expect(dialog.getByRole("button",{name:"Save reference",exact:true})).toBeEnabled();
});
