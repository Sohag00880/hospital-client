const {test,expect}=require("@playwright/test");
const AxeBuilder=require("@axe-core/playwright").default;

test("Appointments submenu filters booking users by visit date and filters doctors and separates cancelled and refunded amounts",async({page})=>{
  const first="11111111-1111-4111-8111-111111111111",second="22222222-2222-4222-8222-222222222222";
  const doctorOne="44444444-4444-4444-8444-444444444444",doctorTwo="55555555-5555-4555-8555-555555555555",doctorThree="66666666-6666-4666-8666-666666666666";
  const initial=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Dhaka"}).format(new Date()), other="2027-02-10",empty="2027-02-11";
  const requests=[],errors=[];page.on("pageerror",error=>errors.push(error.message));
  await page.route("**/api/v1/**",async route=>{
    const url=new URL(route.request().url()),path=url.pathname.replace(/^.*\/api\/v1/,"");
    const send=data=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({success:true,data})});
    if(path.startsWith("/auth/"))return send({user:{id:first,tenantId:second,fullName:"Reception One"},accessToken:"fixture",permissions:["appointment.view"],roles:["staff"],isPlatformAdmin:false});
    if(path==="/branding/appearance")return send({displayName:"Hospital"});
    if(path==="/appointments/booking-users"){const date=url.searchParams.get("date");return send(date===empty?[]:date===other?[{id:second,fullName:"Reception Two",count:1}]:[{id:first,fullName:"Reception One",count:3}]);}
    if(path==="/appointments/booking-doctors")return send(url.searchParams.get("createdBy")===first?[{id:doctorOne,fullName:"Dr Test",count:2},{id:doctorTwo,fullName:"Dr Refund",count:1}]:[{id:doctorThree,fullName:"Dr Second User",count:1}]);
    if(path==="/appointments"){
      const user=url.searchParams.get("createdBy"),date=url.searchParams.get("date");const doctor=url.searchParams.get("doctorId");requests.push({user,date,doctor});
      const row={id:"33333333-3333-4333-8333-333333333333",patientName:user===first?(doctor===doctorTwo?"Refund Patient":"First Patient"):"Second Patient",mrn:"000001",phone:"01711111111",doctorId:doctor || doctorOne,doctorName:doctor===doctorTwo?"Dr Refund":"Dr Test",date,serialNumber:1,amount:"125.50",status:"completed",createdByName:user===first?"Reception One":"Reception Two",visitType:"new",createdAt:"2026-10-16T12:00:00Z"};
      return send({items:[row],total:user===first?(doctor===doctorTwo?1:doctor===doctorOne?2:3):1,page:1,pageSize:20,counts:{completed:1,cancelled:1},amounts:user===first?(doctor===doctorTwo?{refunded:{amount:"250.00"}}:doctor===doctorOne?{completed:{amount:"125.50"},cancelled:{amount:"500.00"}}:{completed:{amount:"125.50"},refunded:{amount:"250.00"},cancelled:{amount:"500.00"}}):{completed:{amount:"200.00"}}});
    }
    return send(null);
  });
  await page.goto("/appointments/by-users");
  await expect(page.getByRole("button",{name:"Appointments",exact:true})).toHaveAttribute("aria-expanded","true");
  await expect(page.getByRole("link",{name:"All Appointments",exact:true})).toHaveAttribute("href","/appointments");
  await expect(page.getByLabel("Appointment date",{exact:true})).toHaveValue(initial);
  const select=page.getByLabel("Booked by user",{exact:true});
  await expect(select.locator("option")).toHaveText(["Select a user","Reception One (3)"]);
  const doctor=page.getByLabel("Doctor",{exact:true});
  await expect(doctor).toBeDisabled();
  expect(requests).toEqual([]);
  await select.selectOption(first);
  await expect(page.getByRole("cell",{name:/First Patient/})).toBeVisible();
  const summary=label=>page.locator('[aria-label="User appointment totals"] > div').filter({has:page.locator("p",{hasText:new RegExp(`^${label}$`)})});
  await expect(summary("Total amount")).toContainText("875.50");
  await expect(summary("Refund amount")).toContainText("250.00");
  await expect(summary("Cancelled amount")).toContainText("500.00");
  await expect(doctor).toHaveValue("");
  await expect(doctor.locator("option")).toHaveText(["All doctors","Dr Test (2)","Dr Refund (1)"]);
  await expect(summary("Completed amount")).toContainText("125.50");
  expect(requests.at(-1)).toEqual({user:first,date:initial,doctor:null});
  await doctor.selectOption(doctorTwo);
  await expect(page.getByRole("cell",{name:/Refund Patient/})).toBeVisible();
  await expect(summary("Total amount")).toContainText("250.00");
  await expect(summary("Cancelled amount")).toContainText("0.00");
  await expect(summary("Refund amount")).toContainText("250.00");
  expect(requests.at(-1)).toEqual({user:first,date:initial,doctor:doctorTwo});
  await doctor.selectOption(doctorOne);
  await expect(summary("Total amount")).toContainText("625.50");
  await expect(summary("Refund amount")).toContainText("0.00");
  await doctor.selectOption("");await expect(summary("Total amount")).toContainText("875.50");
  await doctor.selectOption(doctorTwo);
  await page.getByLabel("Appointment date",{exact:true}).fill(other);
  await expect(select).toHaveValue("");await expect(doctor).toHaveValue("");await expect(doctor).toBeDisabled();
  await expect(select.locator("option")).toHaveText(["Select a user","Reception Two (1)"]);
  await expect(page.getByRole("cell",{name:/First Patient/})).toHaveCount(0);
  await select.selectOption(second);
  await expect(page.getByRole("cell",{name:/Second Patient/})).toBeVisible();
  await expect(summary("Completed amount")).toContainText("200.00");
  expect(requests.at(-1)).toEqual({user:second,date:other,doctor:null});
  await expect(doctor.locator("option")).toHaveText(["All doctors","Dr Second User (1)"]);
  await expect(doctor).toHaveValue("");
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  await page.getByLabel("Appointment date",{exact:true}).fill(empty);
  await expect(page.getByText("No users booked appointments for this date.")).toBeVisible();
  await expect(select).toBeDisabled();expect(errors).toEqual([]);
});
