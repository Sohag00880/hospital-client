const {test,expect}=require('@playwright/test');
const AxeBuilder=require('@axe-core/playwright').default;
test('history has a dedicated read-only page and All Appointments has no history action',async({page})=>{
 test.setTimeout(120000);const searches=[],events=[],id='11111111-1111-4111-8111-111111111111';
 const row={id,patientName:'History Patient',mrn:'000001',doctorName:'Dr History',date:'2026-10-19',status:'booked',amount:'500.00',serialNumber:1,revision:1};
 await page.route('**/api/v1/**',async route=>{const url=new URL(route.request().url()),path=url.pathname.replace(/^.*\/api\/v1/,'');const send=data=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data})});
 if(path.startsWith('/auth/'))return send({user:{id,tenantId:id,fullName:'Reader'},accessToken:'fixture',permissions:['appointment.view','patient.view'],roles:['staff'],isPlatformAdmin:false});
 if(path==='/branding/appearance')return send({displayName:'Hospital'});
 if(path==='/appointments/history'){searches.push(url.searchParams.get('patient'));return send({patient:{id,mrn:'000001',name:'History Patient'},items:[row],total:1,page:1,pageSize:20});}
 if(path===`/appointments/${id}/history`){events.push(id);return send([{id:'event1',type:'confirm',createdAt:'2026-10-19T09:00:00Z',actorName:'Reception',reason:'Patient arrived',metadata:{}},{id:'event2',type:'serial_changed',createdAt:'2026-10-19T08:00:00Z',actorName:'Reception',metadata:{from:2,to:1}}]);}
 if(path==='/appointments')return send({items:[row],total:1,page:1,pageSize:20,counts:{booked:1},amounts:{booked:{amount:'500.00'}}});
 return send([]);});
 await page.goto('/appointments');await expect(page.getByRole('heading',{name:'All Appointments',exact:true})).toBeVisible({timeout:30000});await expect(page.getByRole('button',{name:'History',exact:true})).toHaveCount(0);await expect(page.getByRole('link',{name:'All Appointments',exact:true})).toBeVisible();await page.getByRole('link',{name:'Appointments History',exact:true}).click();await expect(page.getByRole('heading',{name:'Appointments History',exact:true})).toBeVisible();expect(searches).toHaveLength(0);expect(events).toHaveLength(0);
 await page.getByLabel('Patient ID / MRN',{exact:true}).fill('000001');await page.getByRole('button',{name:'Search patient',exact:true}).click();await page.getByRole('button',{name:'View history',exact:true}).click();await expect(page.getByRole('region',{name:'Appointment activity'})).toContainText('Patient arrived');await expect(page.getByRole('region',{name:'Appointment activity'})).toContainText('Serial 2 → 1');expect(searches).toEqual(['000001']);expect(events).toEqual([id]);
 const a11y=await new AxeBuilder({page}).include('main').analyze();expect(a11y.violations).toEqual([]);
 await page.getByRole('button',{name:'Clear',exact:true}).click();await expect(page.getByRole('heading',{name:'Find appointment history'})).toBeVisible();await expect(page.getByRole('region',{name:'Appointment activity'})).toHaveCount(0);
});
