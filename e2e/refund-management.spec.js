const {test,expect}=require('@playwright/test');
const AxeBuilder=require('@axe-core/playwright').default;
const id='11111111-1111-4111-8111-111111111111',bill='22222222-2222-4222-8222-222222222222',refund='33333333-3333-4333-8333-333333333333';
test('Dues uses the Lab name and preserves the old OPD link',async({page})=>{
 await install(page);await page.goto('/dues/opd');await expect(page).toHaveURL(/\/dues\/lab$/);await expect(page.getByRole('navigation',{name:'Dues navigation'}).getByRole('link',{name:'Lab',exact:true})).toHaveAttribute('href','/dues/lab');await expect(page.getByRole('navigation',{name:'Dues navigation'}).getByRole('link',{name:'OPD',exact:true})).toHaveCount(0);
});
async function install(page,{approve=true}={}){
 const calls=[],requests=[];const items=[];
 await page.route('**/api/v1/**',async route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname.replace(/^.*\/api\/v1/,'');
  const send=data=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data})});
  if(path.startsWith('/auth/'))return send({user:{id,tenantId:id,fullName:'Refund Staff'},accessToken:'fixture',permissions:['billing.view','billing.create','patient.view','appointment.view','lab.view','inpatient.view',...(approve?['billing.approve']:[])],roles:['staff'],isPlatformAdmin:false});
  if(path==='/branding/appearance')return send({displayName:'Hospital'});
  if(path==='/billing/refunds/bills'){
   calls.push(url.searchParams.get('source'));return send({patient:{id,mrn:'000001',name:'Refund Patient',phone:'01712345678'},items:[{id:bill,date:'2026-10-19',title:'Doctor or hospital bill',reference:'BILL001',status:'completed',paid:'500.00',refunded:'0.00',refundable:'500.00',pendingRequestId:items.some(r=>r.status==='pending')?refund:null}],total:1,page:1,pageSize:20});
  }
  if(path==='/billing/refunds'&&req.method()==='POST'){
   const body=req.postDataJSON();requests.push(body);const row={...body,id:refund,mrn:'000001',patientName:'Refund Patient',reference:'BILL001',status:'pending',createdAt:new Date().toISOString(),createdByName:'Refund Staff'};items.push(row);return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({success:true,data:row})});
  }
  if(path.endsWith('/decision')){const body=req.postDataJSON();requests.push(body);items[0].status=body.decision==='approve'?'approved':'rejected';items[0].decisionNote=body.note;return send(items[0]);}
  if(path==='/billing/refunds'){const status=url.searchParams.get('status'),rows=items.filter(r=>status==='all'||r.status===status);return send({items:rows,total:rows.length,amount:rows.length?'500.00':'0.00',page:1,pageSize:20});}
  return send(null);
 });return {calls,requests,items};
}
test('new refund searches explicitly, requests full doctor fee, approves and records history',async({page})=>{
 test.setTimeout(120000);const fixture=await install(page);await page.goto('/billing/refunds/new');await expect(page.getByRole('heading',{name:'New Refund',exact:true})).toBeVisible({timeout:30000});expect(fixture.calls).toHaveLength(0);await expect(page.getByLabel('Fee type',{exact:true}).locator('option')).toHaveText(['OPD','Lab']);
 await expect(page.getByRole('button',{name:'Refund Management',exact:true})).toBeVisible();await page.getByLabel('Patient ID / MRN',{exact:true}).fill('000001');await page.getByRole('button',{name:'Search bills',exact:true}).click();await expect(page.getByRole('button',{name:'Request refund',exact:true})).toBeVisible();
 const a11y=await new AxeBuilder({page}).include('main').analyze();expect(a11y.violations).toEqual([]);
 await page.getByRole('button',{name:'Request refund',exact:true}).click();await expect(page.getByLabel('Refund amount (BDT)',{exact:true})).toHaveAttribute('readonly','');await page.getByLabel('Refund reason',{exact:true}).fill('Patient requested a refund');await page.getByRole('button',{name:'Submit request',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'waiting for approval'})).toBeVisible();expect(fixture.requests[0].source).toBe('opd');expect(fixture.requests[0].amount).toBe('500.00');
 await page.getByRole('navigation',{name:'Refund management',exact:true}).getByRole('link',{name:'Refund Approval',exact:true}).click();await expect(page.getByRole('button',{name:'Approve refund',exact:true})).toBeVisible();await page.getByRole('button',{name:'Approve refund',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('does not send a bank or mobile transfer');await page.getByRole('button',{name:'Confirm approval',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'approved and recorded'})).toBeVisible();await expect(page.getByRole('heading',{name:'No refunds awaiting approval'})).toBeVisible();
 await page.getByRole('navigation',{name:'Refund management',exact:true}).getByRole('link',{name:'Refund History',exact:true}).click();await expect(page.getByRole('article')).toContainText('approved');expect(fixture.requests.at(-1).decision).toBe('approve');
});
test('Lab partial request can be rejected with reason and approval is permission protected',async({page})=>{
 test.setTimeout(120000);const fixture=await install(page);await page.goto('/billing/refunds/new');await page.getByLabel('Fee type',{exact:true}).selectOption('lab');expect(fixture.calls).toHaveLength(0);await expect(page.getByLabel('Fee type',{exact:true}).locator('option')).toHaveText(['OPD','Lab']);await page.getByLabel('Patient ID / MRN',{exact:true}).fill('000001');await page.getByRole('button',{name:'Search bills',exact:true}).click();await page.getByRole('button',{name:'Request refund',exact:true}).click();await page.getByLabel('Refund amount (BDT)',{exact:true}).fill('150');await page.getByLabel('Refund reason',{exact:true}).fill('Test fee refund');await page.getByRole('button',{name:'Submit request',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'waiting for approval'})).toBeVisible();expect(fixture.requests[0].amount).toBe('150');expect(fixture.requests[0].source).toBe('lab');
 await page.getByRole('navigation',{name:'Refund management',exact:true}).getByRole('link',{name:'Refund Approval',exact:true}).click();await page.getByRole('button',{name:'Reject',exact:true}).click();await expect(page.getByRole('button',{name:'Confirm rejection',exact:true})).toBeDisabled();await page.getByLabel('Rejection reason',{exact:true}).fill('Fee refund not justified');await page.getByRole('button',{name:'Confirm rejection',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'rejected'})).toBeVisible();
 await page.unroute('**/api/v1/**');await install(page,{approve:false});await page.goto('/billing/refunds/approval');await expect(page.getByRole('alert').filter({hasText:'permission'})).toBeVisible();await expect(page.getByRole('button',{name:'Approve refund',exact:true})).toHaveCount(0);
});
