const {test,expect}=require('@playwright/test');
test('patient and appointment lists show a single comma-separated address',async({page})=>{
 const id='44444444-4444-4444-8444-444444444444',address={district:{name:'Pabna'},upazila:{name:'Pabna Sadar'},union:{name:'Dogachi'},village:'Test Village'};
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dhaka',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 await page.route('**/api/v1/**',async route=>{
  const path=new URL(route.request().url()).pathname.replace(/^.*\/api\/v1/,'');const send=data=>route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data})});
  if(path.startsWith('/auth/'))return send({user:{id,tenantId:id,fullName:'Reception'},accessToken:'fixture',permissions:['patient.view','appointment.view'],roles:['staff'],isPlatformAdmin:false});
  if(path==='/branding/appearance')return send({displayName:'Hospital'});
  if(path==='/patients')return send({items:[{id,firstName:'Address',lastName:'Patient',mrn:'000001',phone:'01712345678',sex:'female',status:'active',address}],total:1,page:1,pageSize:20});
  if(['/appointments/doctors','/appointments/booking-doctors'].includes(path))return send([{id,fullName:'Dr Test',count:1}]);
  if(['/appointments/booking-users','/appointments/booking-references'].includes(path))return send([{id,fullName:'Reception',name:'Referral',code:'REF000001',count:1}]);
  if(path==='/appointments/schedules')return send([]);
  const row={id,doctorId:id,date,patientName:'Address Patient',mrn:'000001',phone:'01712345678',status:'booked',address,amount:'500.00',visitType:'new',revision:1};
  if(path==='/appointments/queue')return send([row]);
  if(['/appointments','/appointments/opd'].includes(path))return send({items:[row],total:1,page:1,pageSize:20,counts:{booked:1},amounts:{booked:{amount:'500.00'}}});
  return send(null);
 });
 for(const path of ['/patients','/appointments','/opd','/appointments/by-users','/appointments/by-reference']){
  await page.goto(path);if(path.endsWith('by-users'))await page.getByLabel('Booked by user',{exact:true}).selectOption(id);if(path.endsWith('by-reference'))await page.getByLabel('Reference',{exact:true}).selectOption(id);
  await expect(page.locator('thead th').filter({hasText:/^Address$/})).toBeVisible();await expect(page.getByRole('cell',{name:'Test Village, Dogachi, Pabna Sadar, Pabna',exact:true})).toBeVisible();
 }
});
