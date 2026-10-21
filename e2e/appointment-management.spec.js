const {test,expect}=require('@playwright/test');
const AxeBuilder=require('@axe-core/playwright').default;
const ids={patient:'11111111-1111-4111-8111-111111111111',appointment:'22222222-2222-4222-8222-222222222222',doctor:'33333333-3333-4333-8333-333333333333',nextDoctor:'44444444-4444-4444-8444-444444444444',session:'55555555-5555-4555-8555-555555555555',nextSession:'66666666-6666-4666-8666-666666666666',confirmed:'77777777-7777-4777-8777-777777777777'};
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dhaka',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const tomorrow=()=>new Date(Date.parse(today()+'T00:00:00Z')+86400000).toISOString().slice(0,10);
async function install(page,{allowed=true,conflict=false}={}){
 const writes=[],searches=[];let current={id:ids.appointment,patientId:ids.patient,patientName:'Manage Patient',mrn:'000001',phone:'01712345678',doctorId:ids.doctor,doctorName:'Dr Original',scheduleId:ids.session,date:today(),status:'pending',revision:1,amount:'500.00',visitType:'new',estimatedSerialNumber:1};
 await page.route('**/api/v1/**',async route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname.replace(/^.*\/api\/v1/,'');const send=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify({success:status===200,data})});
  if(path.startsWith('/auth/'))return send({user:{id:ids.patient,tenantId:ids.patient,fullName:'Reception'},accessToken:'fixture',permissions:['appointment.view','patient.view',...(allowed?['appointment.update']:[])],roles:['staff'],isPlatformAdmin:false});
  if(path==='/branding/appearance')return send({displayName:'Hospital'});
  if(path==='/appointments/manage'){
   searches.push(url.searchParams.get('patient'));if(!['000001',ids.patient].includes(url.searchParams.get('patient')))return send({patient:null,items:[],total:0,pending:0,cancelled:0,page:1,pageSize:20});
   const items=[current,{...current,id:ids.confirmed,status:'booked',revision:1,serialNumber:1}];return send({patient:{id:ids.patient,mrn:'000001',name:'Manage Patient',phone:'01712345678'},items,total:2,pending:current.status==='pending'?1:0,cancelled:current.status==='cancelled'?1:0,page:1,pageSize:20});
  }
  if(req.method()==='POST'&&path.startsWith('/appointments/')){
   const body=req.postDataJSON();writes.push({path,body});
   if(conflict)return route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({success:false,error:{message:'Appointment changed. Refresh before trying again.'}})});
   if(path.endsWith('/reschedule'))current={...current,date:tomorrow(),doctorId:ids.nextDoctor,doctorName:'Dr Next Day',scheduleId:ids.nextSession,revision:current.revision+1,amount:'800.00'};
   if(path.endsWith('/cancel'))current={...current,status:'cancelled',cancellationReason:body.reason,revision:current.revision+1};return send(current);
  }
  if(path==='/appointments/doctors')return send(url.searchParams.get('date')===tomorrow()?[{id:ids.nextDoctor,fullName:'Dr Next Day'}]:[{id:ids.doctor,fullName:'Dr Original'}]);
  if(path==='/appointments/schedules'){const next=url.searchParams.get('date')===tomorrow();return send([{id:next?ids.nextSession:ids.session,doctorId:next?ids.nextDoctor:ids.doctor,doctorName:next?'Dr Next Day':'Dr Original',date:next?tomorrow():today(),timeZone:'Asia/Dhaka',startMinute:540,endMinute:600,room:'201',status:'active'}]);}
  if(path==='/appointments/queue')return send([]);
  if(path==='/appointments')return send({items:[current],total:1,page:1,pageSize:20,counts:{pending:1},amounts:{pending:{amount:'500.00'}}});
  return send(null);
 });return {writes,searches};
}
async function search(page,value='000001'){await page.getByLabel('Patient ID / MRN',{exact:true}).fill(value);await page.getByRole('button',{name:'Search patient',exact:true}).click();}
test('search-driven reschedule and cancellation preserve status rules and remove All actions',async({page})=>{
 test.setTimeout(120000);
 const {writes,searches}=await install(page);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/appointments');await expect(page.getByRole('button',{name:'Reschedule',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Cancel',exact:true})).toHaveCount(0);
 await page.getByRole('link',{name:'Reschedule & Cancellation',exact:true}).click();await expect(page.getByRole('heading',{name:'Reschedule & Cancellation',exact:true})).toBeVisible({timeout:30000});expect(searches).toHaveLength(0);
 await search(page);await expect(page.getByRole('region',{name:'Patient details'})).toContainText('Manage Patient',{timeout:30000});const row=page.locator(`[data-appointment-id="${ids.appointment}"]`),confirmed=page.locator(`[data-appointment-id="${ids.confirmed}"]`);await expect(confirmed.getByRole('button')).toHaveCount(0);
 const axe=await new AxeBuilder({page}).analyze();expect(axe.violations).toEqual([]);
 await row.getByRole('button',{name:'Reschedule',exact:true}).click();let dialog=page.getByRole('dialog');await expect(dialog.getByRole('button',{name:'Save reschedule'})).toBeDisabled();await dialog.getByLabel('New appointment date',{exact:true}).fill(tomorrow());await dialog.getByLabel('Doctor',{exact:true}).selectOption(ids.nextDoctor);await expect(dialog.getByLabel('Visiting session',{exact:true})).toHaveValue(ids.nextSession);await dialog.getByLabel('Reason for rescheduling',{exact:true}).fill('Patient requested another day');await dialog.getByRole('button',{name:'Save reschedule',exact:true}).click();await expect(dialog).toHaveCount(0);await expect(row).toContainText('Dr Next Day');
 expect(writes[0]).toEqual({path:`/appointments/${ids.appointment}/reschedule`,body:{scheduleId:ids.nextSession,expectedRevision:1,reason:'Patient requested another day'}});
 await row.getByRole('button',{name:'Cancel appointment',exact:true}).click();dialog=page.getByRole('dialog');await expect(dialog.getByRole('button',{name:'Confirm cancellation'})).toBeDisabled();await dialog.getByLabel('Cancellation reason',{exact:true}).fill('Patient cannot attend');await dialog.getByRole('button',{name:'Confirm cancellation',exact:true}).click();await expect(dialog).toHaveCount(0);await expect(row).toContainText('Cancelled');await expect(row.getByRole('button')).toHaveCount(0);expect(writes[1].body.expectedRevision).toBe(2);expect(errors).toEqual([]);
});
test('unknown patients and permission denial never show actionable appointments',async({page})=>{
 const {searches}=await install(page);await page.goto('/appointments/manage');await search(page,'999999');await expect(page.getByRole('heading',{name:'No patient found'})).toBeVisible();await page.getByRole('button',{name:'Clear',exact:true}).click();await expect(page.getByRole('heading',{name:'Find an appointment'})).toBeVisible();expect(searches).toEqual(['999999']);
 await page.unrouteAll({behavior:'wait'});const denied=await install(page,{allowed:false});await page.reload();await expect(page.getByRole('main').getByRole('alert')).toHaveText('You do not have permission to manage appointments.');expect(denied.searches).toHaveLength(0);await expect(page.getByRole('link',{name:'Reschedule & Cancellation',exact:true})).toHaveCount(0);
});
test('stale appointment changes can be refreshed without closing a failed action silently',async({page})=>{
 await install(page,{conflict:true});await page.goto('/appointments/manage');await search(page);await page.getByRole('button',{name:'Cancel appointment',exact:true}).click();const dialog=page.getByRole('dialog');await dialog.getByLabel('Cancellation reason',{exact:true}).fill('Patient cannot attend');await dialog.getByRole('button',{name:'Confirm cancellation'}).click();await expect(dialog.getByRole('alert')).toContainText('Appointment changed');await dialog.getByRole('button',{name:'Refresh appointments'}).click();await expect(dialog).toHaveCount(0);await expect(page.getByRole('button',{name:'Cancel appointment',exact:true})).toBeVisible();
});
