"use client";
import {useEffect,useState} from "react";
import {DoctorReceipt} from "./DoctorReceipt";
import {useAppSelector} from "@/store/hooks";
import {PageHeader} from "@/components/layout/PageHeader";
import {Card} from "@/components/ui/Card";
import {Button} from "@/components/ui/Button";
import {DataTable} from "@/components/ui/DataTable";
import {Modal} from "@/components/ui/Modal";
import {bangladeshDate} from "@/lib/time";
import {useBillingReportQuery,usePatientDueQuery,useDoctorLedgerQuery,useLabPaymentHistoryQuery,useSetPatientPrintPermissionMutation} from "./billingApi";
import {BillingError,Field,Summary,Pagination,PaymentForm,money,timestamp,queryOptions,paymentColumns} from "./BillingUI";

function useAccess(){const permissions=useAppSelector(s=>s.auth.permissions);return {allowed:permissions.includes("billing.view"),canCollect:permissions.includes("billing.create"),canPay:permissions.includes("billing.approve")};}
function useSearch(){const [search,setSearch]=useState(""),[debounced,setDebounced]=useState("");useEffect(()=>{const timer=setTimeout(()=>setDebounced(search),300);return()=>clearTimeout(timer);},[search]);return {search,setSearch,debounced};}
const patientColumn={key:"patient",header:"Patient",accessor:row=><div><p className="font-medium">{row.patientName}</p><p className="text-xs text-muted-foreground">{row.mrn}</p></div>};
const statusColumn={key:"status",header:"Status",accessor:row=><span className="capitalize">{row.status.replaceAll("_"," ")}</span>};

export function BillingWorkspace({kind="opd"}){
  const {allowed}=useAccess(),{search,setSearch,debounced}=useSearch();
  const [today]=useState(()=>kind==="laboratory"?bangladeshDate():"");
  const [from,setFrom]=useState(today),[to,setTo]=useState(today),[page,setPage]=useState(1),[dialog,setDialog]=useState(null);
  const invalid=Boolean(from&&to&&from>to),lab=kind==="laboratory";
  const query=useBillingReportQuery({kind,from:from || undefined,to:to || undefined,search:debounced,page}, {...queryOptions,skip:!allowed || invalid}),data=query.currentData?.data;
  useEffect(()=>setPage(1),[debounced,from,to]);
  if(!allowed)return <BillingError error="You do not have permission to view Billing."/>;
  return <div className="space-y-5"><PageHeader title={lab?"Laboratory Billing":"OPD Billing"} description={lab?undefined:"Confirmed appointment collections, refunds and net collection by visit date. Pending fees are uncollected."}/>
    <Summary values={lab?[["Total Bill",data?.summary.amount],["Discount",data?.summary.discount],["Collected",data?.summary.paid],["Due",data?.summary.due]]:[["Gross Collection",data?.summary.collected],["Refunded",data?.summary.refunded],["Net Collection",data?.summary.net],["Pending Fees",data?.summary.pending]]}/>
    <Card><div className="grid gap-4 md:grid-cols-3"><Field label={lab?"Order date from":"Visit date from"} type="date" value={from} onChange={e=>setFrom(e.target.value)}/><Field label="To date" type="date" value={to} min={from || undefined} onChange={e=>setTo(e.target.value)}/><Field label="Search" placeholder={lab?"Order number, patient or MRN":"Patient, MRN or doctor"} value={search} onChange={e=>setSearch(e.target.value)}/></div>{!lab&&<p className="mt-3 text-xs text-muted-foreground">Leave dates empty to view all dates. Times are shown in Bangladesh time.</p>}</Card>
    <BillingError error={invalid?"From date must be before or equal to To date":query.error}/>
    {!invalid&&(lab?<LaboratoryTable data={data} busy={query.isFetching} onDialog={setDialog}/>:<DataTable rows={data?.items || []} loading={query.isFetching} rowKey={r=>r.id} emptyTitle="No OPD billing records" columns={[
      {key:"date",header:"Visit date",accessor:r=>r.date},patientColumn,{key:"doctor",header:"Doctor",accessor:r=>r.doctorName},{key:"visit",header:"Visit",accessor:r=>r.visitType==="new"?"New":"Follow-up"},statusColumn,
      {key:"fee",header:"Fee",align:"right",accessor:r=>money(r.amount)},{key:"collected",header:"Collected",align:"right",accessor:r=>money(r.collected)},{key:"refund",header:"Refund",align:"right",accessor:r=>money(r.refunded)},{key:"net",header:"Net",align:"right",accessor:r=><b>{money(r.net)}</b>},
    ]}/>)}
    <Pagination data={data} page={page} setPage={setPage} busy={query.isFetching || invalid}/>
    {dialog?.type==="history"&&<LabHistory account={dialog.account} onClose={()=>setDialog(null)}/>}
  </div>;
}

function LaboratoryTable({data,busy,canCollect,onDialog}){
  return <DataTable rows={data?.items || []} loading={busy} rowKey={r=>r.id} emptyTitle="No laboratory bills" columns={[
    {key:"order",header:"Order",accessor:r=><div><p className="font-medium">{r.orderNumber}</p><p className="whitespace-nowrap text-xs text-muted-foreground">{timestamp(r.createdAt)}</p></div>},patientColumn,
    {key:"tests",header:"Tests",accessor:r=><ul className="min-w-40 space-y-1">{r.tests.map((test,index)=><li key={index} className="text-xs">{test.name} <span className="font-medium">({money(test.amount)})</span></li>)}</ul>},
    {key:"amount",header:"Bill",align:"right",accessor:r=>money(r.amount)},{key:"discount",header:"Discount",align:"right",accessor:r=><span className="text-emerald-700">{money(r.discount)}</span>},{key:"paid",header:"Paid",align:"right",accessor:r=>money(r.paid)},
    {key:"due",header:"Due",align:"right",accessor:r=><b className={Number(r.due)>0?"text-amber-700":"text-emerald-700"}>{money(r.due)}</b>},
    {key:"actions",header:"Actions",accessor:r=><div className="flex flex-wrap gap-2">{canCollect&&Number(r.due)>0&&<Button size="sm" onClick={()=>onDialog({type:"pay",account:r})}>Collect payment</Button>}<Button size="sm" variant="outline" onClick={()=>onDialog({type:"history",account:r})}>Payment history</Button></div>},
  ]}/>;
}
function LabHistory({account,onClose}){
  const [page,setPage]=useState(1),query=useLabPaymentHistoryQuery({id:account.id,page},queryOptions),data=query.currentData?.data;
  return <Modal open title={`Payment history · ${account.orderNumber}`} size="lg" onClose={onClose}><div className="max-h-[72vh] space-y-4 overflow-y-auto"><BillingError error={query.error}/><DataTable rows={data?.items || []} loading={query.isFetching} rowKey={r=>r.id} columns={[{key:"type",header:"Entry",accessor:r=><span className={r.type==="discount"?"font-medium text-emerald-700":""}>{r.type==="discount"?"Discount":"Payment"}</span>},...paymentColumns,{key:"reason",header:"Discount reason",accessor:r=>r.reason || "-"}]} emptyTitle="No payments or discounts recorded"/><Pagination data={data} page={page} setPage={setPage} busy={query.isFetching}/></div></Modal>;
}

export function PatientDueWorkspace(){
  const {allowed,canCollect}=useAccess(),[search,setSearch]=useState(""),[patient,setPatient]=useState(""),[page,setPage]=useState(1),[dialog,setDialog]=useState(null),[notice,setNotice]=useState("");
  const query=usePatientDueQuery({patient,page},{...queryOptions,skip:!allowed || !patient}),data=query.currentData?.data;
  const [setPrintPermission,permissionState]=useSetPatientPrintPermissionMutation(),[pendingPrint,setPendingPrint]=useState(null);
  if(!allowed)return <BillingError error="You do not have permission to view Billing."/>;
  return <div className="space-y-5"><PageHeader title="Patient Due"/>
    <Card><form className="flex flex-wrap items-end gap-3" onSubmit={e=>{e.preventDefault();const value=search.trim();if(!value)return;setPatient(value);setPage(1);setNotice("");if(value===patient)query.refetch();}}><div className="min-w-60 flex-1"><Field label="Search patient" placeholder="Patient ID or Lab ID" required maxLength={100} value={search} onChange={e=>setSearch(e.target.value)}/></div><Button type="submit" disabled={!search.trim() || query.isFetching}>Search due</Button></form></Card>
    <BillingError error={query.error}/>{notice&&<p role="status" className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {patient&&(data || query.isFetching)&&<>
      <BillingError error={permissionState.error}/>
      {data?.printAccess&&<Card><div className="flex items-center gap-3 text-sm"><input type="checkbox" aria-label="Allow lab report printing with due" className="h-5 w-5 shrink-0 cursor-pointer accent-primary disabled:cursor-not-allowed" checked={pendingPrint?.patientId===data.patient.id?pendingPrint.checked:data.printAccess.allowPrintWithDue} disabled={!canCollect || permissionState.isLoading || Boolean(pendingPrint) || query.isFetching} onChange={async e=>{
        const checked=e.target.checked;setPendingPrint({patientId:data.patient.id,checked});try{await setPrintPermission({id:data.patient.id,allowPrintWithDue:checked,expectedRevision:data.printAccess.revision}).unwrap();await query.refetch();setNotice(checked?"Report print permission enabled despite due.":"Report print permission cancelled.");}catch{}finally{setPendingPrint(null);}
      }}/><span><b>Allow lab report printing with due</b></span></div></Card>}

      <LaboratoryTable data={data} busy={query.isFetching} canCollect={canCollect} onDialog={setDialog}/><Pagination data={data} page={page} setPage={setPage} busy={query.isFetching}/>
    </>}
    {dialog?.type==="pay"&&<PaymentForm kind="laboratory" account={dialog.account} onClose={()=>setDialog(null)} onSaved={result=>{setDialog(null);setNotice(result.discount?"Payment recorded and remaining amount discounted. Bill settled.":"Lab payment recorded. Patient due updated.");}}/>}
    {dialog?.type==="history"&&<LabHistory account={dialog.account} onClose={()=>setDialog(null)}/>}
  </div>;
}

export function DoctorBillingWorkspace(){
  const {allowed,canPay}=useAccess(),{search,setSearch,debounced}=useSearch(),[page,setPage]=useState(1),[dialog,setDialog]=useState(null),[notice,setNotice]=useState("");
  const query=useBillingReportQuery({kind:"doctors",search:debounced,page},{...queryOptions,skip:!allowed}),data=query.currentData?.data;
  useEffect(()=>setPage(1),[debounced]);
  if(!allowed)return <BillingError error="You do not have permission to view Billing."/>;
  return <div className="space-y-5"><PageHeader title="Doctor Billing" description="Doctors receive the full OPD fee for completed visits. Refunded visits are excluded. Balances and payments cover all dates."/>
    <Summary values={[["Total Earned",data?.summary.earned],["Paid to Doctors",data?.summary.paid],["Payable",data?.summary.payable],["Recovery after Refund",data?.summary.recovery]]}/>
    <Card><Field label="Search doctor" value={search} placeholder="Doctor name or ID" onChange={e=>setSearch(e.target.value)}/></Card><BillingError error={query.error}/>
    {notice&&<p role="status" className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    <DataTable rows={data?.items || []} loading={query.isFetching} rowKey={r=>r.id} emptyTitle="No doctor accounts" columns={[
      {key:"doctor",header:"Doctor",accessor:r=><div><p className="font-medium">{r.doctorName}</p><p className="text-xs text-muted-foreground">{r.doctorCode}</p></div>},
      {key:"visits",header:"Completed visits",accessor:r=>r.visits},{key:"collection",header:"OPD Collection",align:"right",accessor:r=>money(r.collected)},{key:"refund",header:"Refunded",align:"right",accessor:r=>money(r.refunded)},
      {key:"earned",header:"Earned",align:"right",accessor:r=>money(r.earned)},{key:"paid",header:"Paid",align:"right",accessor:r=>money(r.paid)},
      {key:"balance",header:"Balance",align:"right",accessor:r=><div><b>{money(r.balance)}</b>{Number(r.balance)<0&&<p className="text-xs text-destructive">Recover from doctor</p>}</div>},
      {key:"actions",header:"Actions",accessor:r=><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={()=>setDialog({type:"statement",account:r})}>View account</Button>{canPay&&Number(r.balance)>0&&<Button size="sm" onClick={()=>setDialog({type:"pay",account:r})}>Pay bill</Button>}</div>},
    ]}/><Pagination data={data} page={page} setPage={setPage} busy={query.isFetching}/>
    {dialog?.type==="pay"&&<PaymentForm kind="doctors" account={dialog.account} onClose={()=>setDialog(null)} onSaved={()=>{setDialog(null);setNotice("Doctor payment recorded.");}}/>}
    {dialog?.type==="statement"&&<DoctorStatement account={dialog.account} onClose={()=>setDialog(null)}/>}
  </div>;
}
function DoctorStatement({account,onClose}){
  const [page,setPage]=useState(1),[paymentId,setPaymentId]=useState(null),query=useDoctorLedgerQuery({id:account.id,page},queryOptions),data=query.currentData?.data;
  if(paymentId)return <DoctorReceipt doctorId={account.id} paymentId={paymentId} onClose={()=>setPaymentId(null)}/>;
  return <Modal open title={`Payment history ? ${account.doctorName}`} size="lg" onClose={onClose}><div className="max-h-[76vh] space-y-4 overflow-y-auto"><Summary values={[["Earned",data?.doctor.earned],["Paid",data?.doctor.paid],["Balance",data?.doctor.balance]]}/>
    <h3 className="text-sm font-semibold">Payment history</h3>
    <BillingError error={query.error}/><DataTable rows={data?.items || []} loading={query.isFetching} rowKey={r=>r.id} emptyTitle="No payments recorded" columns={[...paymentColumns,
      {key:"receipt",header:"Receipt",accessor:r=><Button size="sm" variant="outline" onClick={()=>setPaymentId(r.id)}>Print receipt</Button>},
    ]}/><Pagination data={data} page={page} setPage={setPage} busy={query.isFetching}/></div></Modal>;
}
