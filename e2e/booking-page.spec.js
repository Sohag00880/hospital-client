const {test,expect}=require("@playwright/test");
const AxeBuilder=require("@axe-core/playwright").default;
const doctorId="44444444-4444-4444-8444-444444444444";
async function install(page,{failUnion=false,canBook=true,doctorDates,lookupPatients=[]}={}){
 const writes=[],requests=[];let unionCalls=0;
 await page.route("**/api/v1/**",async route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname.replace(/^.*\/api\/v1/,"");requests.push({path,params:Object.fromEntries(url.searchParams)});
  const send=(data,status=200)=>route.fulfill({status,contentType:"application/json",body:JSON.stringify({success:status===200,data})});
  if(path.startsWith('/auth/'))return send({user:{id:doctorId,tenantId:doctorId,fullName:"Reception"},accessToken:"fixture",permissions:["appointment.view","patient.view",...(canBook?["appointment.create"]:[])],roles:["staff"],isPlatformAdmin:false});
  if(path==='/branding/appearance')return send({displayName:"Hospital"});
  if(path==='/references/booking')return send({items:[],defaultReference:null});
  if(path==='/appointments/doctors')return send(doctorDates?doctorDates[url.searchParams.get('date')] || []:[{id:doctorId,fullName:"Dr Test",newVisitFee:"500.00",followUpFee:"300.00"}]);
  if(path==='/appointments/schedules'||path==='/appointments/queue')return send([]);
  if(path==='/appointments')return send({items:[],total:0,page:1,pageSize:20,counts:{},amounts:{}});
  if(path==='/appointments/reception/lookup')return send(lookupPatients);
  if(path==='/appointments/reception'){writes.push(req.postDataJSON());return send({id:doctorId,date:writes.at(-1).date,estimatedSerialNumber:1});}
  if(path==='/locations/districts')return send([{id:"13",name:"Pabna",bnName:"পাবনা"},{id:"47",name:"Dhaka",bnName:"ঢাকা"}]);
  if(path==='/locations/upazilas')return send(url.searchParams.get('districtId')==='13'?[{id:"85",parentId:"13",name:"Pabna Sadar",bnName:"পাবনা সদর"}]:[{id:"100",parentId:"47",name:"Dhamrai",bnName:"ধামরাই"}]);
  if(path==='/locations/unions'){unionCalls++;if(failUnion&&unionCalls===1)return send(null,503);return send([{id:"756",parentId:"85",name:"Dogachi",bnName:"দোগাছি"}]);}
  return send(null);
 });return {writes,requests};
}
async function fillPatient(page){
 await page.getByLabel('Doctor name',{exact:true}).selectOption(doctorId);await page.getByLabel('Phone number',{exact:true}).fill('01712345678');
 await page.getByLabel('Patient name',{exact:true}).fill('Booking Patient');await page.getByLabel('Age (years)',{exact:true}).fill('30');await page.getByLabel('Gender',{exact:true}).selectOption('female');
}
async function choose(page,label,search,option){
 await page.getByRole('combobox',{name:new RegExp(`^${label}`)}).click();await page.getByRole('searchbox',{name:`Search ${label.toLowerCase()}`}).fill(search);await page.getByRole('option',{name:option}).click();
}
test('booking opens a page and saves searchable cascading address with optional village',async({page})=>{
 const {writes,requests}=await install(page);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/appointments');await page.getByRole('button',{name:'Book appointment',exact:true}).click();await expect(page).toHaveURL(/\/appointments\/book/,{timeout:30000});await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('heading',{name:'Book a Appointment',exact:true})).toBeVisible();
 await fillPatient(page);await expect(page.getByRole('button',{name:'Book appointment',exact:true})).toBeDisabled();await expect(page.getByRole('combobox',{name:/^Upazila/})).toBeDisabled();
 await choose(page,'District','পাবনা',/Pabna — পাবনা/);await choose(page,'Upazila','Sadar',/Pabna Sadar/);await choose(page,'Union','দোগাছি',/Dogachi/);
 await expect(page.getByRole('button',{name:'Book appointment',exact:true})).toBeEnabled();
 await choose(page,'District','Dhaka',/Dhaka/);await expect(page.getByRole('combobox',{name:/^Upazila/})).toHaveText(/Select upazila/);await expect(page.getByRole('combobox',{name:/^Union/})).toBeDisabled();await expect(page.getByRole('button',{name:'Book appointment',exact:true})).toBeDisabled();
 await choose(page,'District','Pabna',/Pabna/);await choose(page,'Upazila','পাবনা',/Pabna Sadar/);await choose(page,'Union','Dogachi',/Dogachi/);
 expect(requests.filter(r=>r.path==='/locations/districts')).toHaveLength(1);expect(requests.filter(r=>r.path==='/locations/upazilas'&&r.params.districtId==='13')).toHaveLength(1);
 const axe=await new AxeBuilder({page}).analyze();expect(axe.violations).toEqual([]);
 await page.getByRole('button',{name:'Book appointment',exact:true}).click();await expect(page.getByRole('heading',{name:'Appointment booked',exact:true})).toBeVisible();expect(writes[0].address).toEqual({districtId:'13',upazilaId:'85',unionId:'756',village:''});expect(errors).toEqual([]);
});
test('address options retry failures and support keyboard selection on mobile',async({page})=>{
 await page.setViewportSize({width:390,height:844});const {writes}=await install(page,{failUnion:true});await page.goto('/appointments/book');await fillPatient(page);
 await choose(page,'District','Pabna',/Pabna/);await choose(page,'Upazila','Sadar',/Pabna Sadar/);await page.getByRole('combobox',{name:/^Union/}).click();await expect(page.getByRole('alert').filter({hasText:'Could not load unions'})).toContainText('Could not load unions');await page.getByRole('button',{name:'Retry',exact:true}).click();await expect(page.getByRole('option',{name:/Dogachi/})).toBeVisible();await page.getByRole('searchbox',{name:'Search union'}).fill('Dogachi');await page.getByRole('searchbox',{name:'Search union'}).press('Enter');
 await page.getByLabel('Village (optional)',{exact:true}).fill('Test village');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Book appointment',exact:true}).click();await expect(page.getByRole('heading',{name:'Appointment booked',exact:true})).toBeVisible();expect(writes[0].address.village).toBe('Test village');
});
test('direct booking page enforces permissions and the submenu links to a page',async({page})=>{
 const {requests}=await install(page,{canBook:false});await page.goto('/appointments/book');await expect(page.getByRole('alert').filter({hasText:'You do not have permission'})).toHaveText('You do not have permission to book appointments.');await expect(page.getByRole('link',{name:'Book a Appointment',exact:true})).toHaveCount(0);expect(requests.filter(r=>r.path.startsWith('/locations/'))).toHaveLength(0);
});
test('doctor options follow only the selected date and reset the previous selection',async({page})=>{
 const secondId="55555555-5555-4555-8555-555555555555",{requests}=await install(page,{doctorDates:{"2027-03-10":[{id:doctorId,fullName:"Dr Wednesday"}],"2027-03-11":[{id:secondId,fullName:"Dr Thursday"}]}});
 await page.goto('/appointments/book?date=2027-03-10');const date=page.getByLabel('Appointment date (Bangladesh time)',{exact:true}),doctor=page.getByLabel('Doctor name',{exact:true});
 await expect(doctor.locator('option')).toHaveText(['Choose available doctor','Dr Wednesday']);await doctor.selectOption(doctorId);
 await date.fill('2027-03-11');await expect(doctor).toHaveValue('');await expect(doctor.locator('option')).toHaveText(['Choose available doctor','Dr Thursday']);
 await date.fill('2027-03-12');await expect(doctor.locator('option')).toHaveText(['Choose available doctor']);await expect(page.getByText('No doctors are available on this date. Choose another date.')).toBeVisible();
 await date.fill('');await expect(doctor).toBeDisabled();expect(requests.filter(r=>r.path==='/appointments/doctors').map(r=>r.params.date)).toEqual(['2027-03-10','2027-03-11','2027-03-12']);
});

test('shared phone supports a separate new patient and switching back to existing patients',async({page})=>{
 const patient={id:doctorId,mrn:'000123',name:'Existing Patient',phone:'01712345678',age:40,gender:'male',visitType:'follow_up',address:{district:{id:'13'},upazila:{id:'85'},union:{id:'756'}}};
 const {writes}=await install(page,{lookupPatients:[patient]});await page.goto('/appointments/book');
 await page.getByLabel('Doctor name',{exact:true}).selectOption(doctorId);await page.getByLabel('Phone number',{exact:true}).fill(patient.phone);
 await expect(page.getByLabel('Patient name',{exact:true})).toHaveValue(patient.name);await expect(page.getByLabel('Amount',{exact:true})).toHaveValue('300.00');
 await page.getByRole('button',{name:'Add new patient with this number',exact:true}).click();
 await expect(page.getByLabel('Patient name',{exact:true})).toHaveValue('');await expect(page.getByLabel('Phone number',{exact:true})).toHaveValue(patient.phone);await expect(page.getByLabel('Amount',{exact:true})).toHaveValue('500.00');await expect(page.getByRole('button',{name:'Book appointment',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Choose existing patient',exact:true}).click();await expect(page.getByLabel('Patient name',{exact:true})).toHaveValue(patient.name);
 await page.getByRole('button',{name:'Add new patient with this number',exact:true}).click();await page.getByLabel('Patient name',{exact:true}).fill('Family Member');await page.getByLabel('Age (years)',{exact:true}).fill('12');await page.getByLabel('Gender',{exact:true}).selectOption('female');
 await choose(page,'District','Pabna',/Pabna/);await choose(page,'Upazila','Sadar',/Pabna Sadar/);await choose(page,'Union','Dogachi',/Dogachi/);
 await page.getByRole('button',{name:'Book appointment',exact:true}).click();await expect(page.getByRole('heading',{name:'Appointment booked',exact:true})).toBeVisible();expect(writes[0]).toMatchObject({phone:patient.phone,createNewPatient:true,name:'Family Member',visitType:'new',expectedAmount:500});expect(writes[0].patientId).toBeUndefined();
});
