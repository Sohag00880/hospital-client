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
import {useBillingReportQuery,usePatientDueQuery,useDoctorLedgerQuery,useLabPaymentHistoryQuery,useEditLabPaymentMutation,useSetPatientPrintPermissionMutation} from "./billingApi";
import {BillingError,Field,Summary,Pagination,PaymentForm,money,timestamp,queryOptions,paymentColumns} from "./BillingUI";

function useAccess(){const permissions=useAppSelector(s=>s.auth.permissions);return {allowed:permissions.includes("billing.view"),canCollect:permissions.includes("billing.create"),canPay:permissions.includes("billing.approve")};}
function useSearch(){const [search,setSearch]=useState(""),[debounced,setDebounced]=useState("");useEffect(()=>{const timer=setTimeout(()=>setDebounced(search),300);return()=>clearTimeout(timer);},[search]);return {search,setSearch,debounced};}
const patientColumn={key:"patient",header:"Patient",accessor:row=><div><p className="font-medium">{row.patientName}</p><p className="text-xs text-muted-foreground">{row.mrn}</p></div>};
const statusColumn={key:"status",header:"Status",accessor:row=><span className="capitalize">{row.status.replaceAll("_"," ")}</span>};

export function BillingWorkspace({kind="opd"}){
  const {allowed}=useAccess(),{search,setSearch,debounced}=useSearch();
  const [today]=useState(()=>bangladeshDate());
  const [from,setFrom]=useState(today),[to,setTo]=useState(today),[page,setPage]=useState(1),[dialog,setDialog]=useState(null);
  const invalid=Boolean(from&&to&&from>to),lab=kind==="laboratory";
  const query=useBillingReportQuery({kind,from:from || undefined,to:to || undefined,search:debounced,page}, {...queryOptions,skip:!allowed || invalid}),data=query.currentData?.data;
  useEffect(()=>setPage(1),[debounced,from,to]);
  if(!allowed)return <BillingError error="You do not have permission to view Billing."/>;
  return <div className="space-y-5"><PageHeader title={lab?"Laboratory Billing":"Doctor Fee Collection"} description={lab?undefined:"Confirmed appointment collections, refunds and net collection by visit date. Pending fees are uncollected."}/>
    <Summary values={lab?[["Total Bill",data?.summary.amount],["Discount",data?.summary.discount],["Collected",data?.summary.paid],["Due",data?.summary.due]]:[["Gross Collection",data?.summary.collected],["Refunded",data?.summary.refunded],["Net Collection",data?.summary.net],["Pending Fees",data?.summary.pending]]}/>
    <Card><div className="grid gap-4 md:grid-cols-3"><Field label={lab?"Order date from":"Visit date from"} type="date" value={from} onChange={e=>setFrom(e.target.value)}/><Field label="To date" type="date" value={to} min={from || undefined} onChange={e=>setTo(e.target.value)}/><Field label="Search" placeholder={lab?"Order number, patient or MRN":"Patient, MRN or doctor"} value={search} onChange={e=>setSearch(e.target.value)}/></div>{!lab&&<p className="mt-3 text-xs text-muted-foreground">Leave dates empty to view all dates. Times are shown in Bangladesh time.</p>}</Card>
    <BillingError error={invalid?"From date must be before or equal to To date":query.error}/>
    {!invalid&&(lab?<LaboratoryTable data={data} busy={query.isFetching} onDialog={setDialog}/>:<DataTable rows={data?.items || []} loading={query.isFetching} rowKey={r=>r.id} emptyTitle="No doctor fee collection records" columns={[
      {key:"date",header:"Visit date",accessor:r=>r.date},patientColumn,{key:"doctor",header:"Doctor",accessor:r=>r.doctorName},{key:"visit",header:"Visit",accessor:r=>r.visitType==="new"?"New":"Follow-up"},statusColumn,
      {key:"fee",header:"Fee",align:"right",accessor:r=>money(r.amount)},{key:"collected",header:"Collected",align:"right",accessor:r=>money(r.collected)},{key:"refund",header:"Refund",align:"right",accessor:r=>money(r.refunded)},{key:"net",header:"Net",align:"right",accessor:r=><b>{money(r.net)}</b>},
    ]}/>)}
    <Pagination data={data} page={page} setPage={setPage} busy={query.isFetching || invalid}/>
    {dialog?.type==="history"&&<LabHistory account={dialog.account} onClose={()=>setDialog(null)}/>}
  </div>;
}

function LaboratoryTable({data,busy,canCollect,onDialog,emptyTitle="No laboratory bills"}){
  return <DataTable rows={data?.items || []} loading={busy} rowKey={r=>r.id} emptyTitle={emptyTitle} columns={[
    {key:"order",header:"Order",accessor:r=><div><p className="font-medium">{r.orderNumber}</p><p className="whitespace-nowrap text-xs text-muted-foreground">{timestamp(r.createdAt)}</p></div>},patientColumn,
    {key:"tests",header:"Tests",accessor:r=><ul className="min-w-40 space-y-1">{r.tests.map((test,index)=><li key={index} className="text-xs">{test.name} <span className="font-medium">({money(test.amount)})</span></li>)}</ul>},
    {key:"amount",header:"Bill",align:"right",accessor:r=>money(r.amount)},{key:"discount",header:"Discount",align:"right",accessor:r=><span className="text-emerald-700">{money(r.discount)}</span>},{key:"paid",header:"Paid",align:"right",accessor:r=>money(r.paid)},
    {key:"due",header:"Due",align:"right",accessor:r=><b className={Number(r.due)>0?"text-amber-700":"text-emerald-700"}>{money(r.due)}</b>},
    {key:"actions",header:"Actions",accessor:r=><div className="flex flex-wrap gap-2">{canCollect&&Number(r.due)>0&&<Button size="sm" onClick={()=>onDialog({type:"pay",account:r})}>Collect payment</Button>}<Button size="sm" variant="outline" onClick={()=>onDialog({type:"history",account:r})}>Payment history</Button></div>},
  ]}/>;
}
function LabHistory({account,onClose}){
  const canEdit=useAppSelector(s=>s.auth.permissions.includes("billing.create"));
  const [page,setPage]=useState(1),[editing,setEditing]=useState(null),[amount,setAmount]=useState(""),[error,setError]=useState(null),[notice,setNotice]=useState("");
  const query=useLabPaymentHistoryQuery({id:account.id,page},queryOptions),data=query.currentData?.data;
  const [save,saveState]=useEditLabPaymentMutation();
  const valid=amount!==""&&Number.isFinite(Number(amount))&&Number(amount)>0&&Number(amount)<=Number(data?.maxEditableAmount);
  return <Modal open title={`Payment history · ${account.orderNumber}`} size="lg" onClose={saveState.isLoading?()=>{}:onClose}><div className="max-h-[72vh] space-y-4 overflow-y-auto">
    <BillingError error={query.error || error}/>{notice&&<p role="status" className="text-sm text-emerald-600">{notice}</p>}
    {editing&&<form className="space-y-3 rounded-lg border border-border p-4" onSubmit={async e=>{
      e.preventDefault();if(!valid)return;setError(null);setNotice("");
      try{await save({id:account.id,paymentId:editing.id,amount,expectedAmount:editing.amount}).unwrap();setEditing(null);setNotice("Payment amount updated.");}catch(e){setError(e);}
    }}><Field label="Payment amount" type="number" min="0.01" max={data?.maxEditableAmount} step="0.01" required value={amount} disabled={saveState.isLoading} onChange={e=>setAmount(e.target.value)}/><p className="text-xs text-muted-foreground">Maximum: {money(data?.maxEditableAmount)}</p><div className="flex justify-end gap-2"><Button variant="outline" disabled={saveState.isLoading} onClick={()=>{setEditing(null);setError(null);}}>Cancel</Button><Button type="submit" disabled={!valid || saveState.isLoading || query.isFetching}>{saveState.isLoading?"Saving…":"Save amount"}</Button></div></form>}
    <DataTable rows={data?.items || []} loading={query.isFetching} rowKey={r=>r.id} columns={[{key:"type",header:"Entry",accessor:r=><span className={r.type==="discount"?"font-medium text-emerald-700":""}>{r.type==="discount"?"Discount":"Payment"}</span>},...paymentColumns,{key:"reason",header:"Discount reason",accessor:r=>r.reason || "-"},...(canEdit?[{key:"actions",header:"Actions",accessor:r=>r.type==="payment"&&r.id===data?.latestPaymentId?<Button size="sm" variant="outline" disabled={saveState.isLoading || query.isFetching} onClick={()=>{setEditing(r);setAmount(r.amount);setError(null);setNotice("");}}>Edit amount</Button>:null}]:[])]} emptyTitle="No payments or discounts recorded"/>
    <Pagination data={data} page={page} setPage={setPage} busy={query.isFetching || saveState.isLoading}/>
  </div></Modal>;
}

export function PatientDueWorkspace(){
  const {allowed,canCollect}=useAccess(),[search,setSearch]=useState(""),[patient,setPatient]=useState(""),[page,setPage]=useState(1),[dialog,setDialog]=useState(null),[notice,setNotice]=useState("");
  const [from,setFrom]=useState(""),[to,setTo]=useState(""),[period,setPeriod]=useState("");
  const showResults=Boolean(patient || from || to),invalid=!patient&&Boolean(from&&to&&from>to);
  const query=usePatientDueQuery({patient:patient || undefined,from:patient?undefined:from || undefined,to:patient?undefined:to || undefined,page},{...queryOptions,skip:!allowed || invalid || !showResults}),data=query.currentData?.data;
  const selectPeriod=value=>{
    const current=bangladeshDate(),start=new Date(`${current}T00:00:00Z`),end=new Date(start);
    if(value==="week"){start.setUTCDate(start.getUTCDate()-(start.getUTCDay()+6)%7-7);end.setTime(start.getTime());end.setUTCDate(end.getUTCDate()+6);}
    if(value==="month"){start.setUTCDate(1);}
    setFrom(start.toISOString().slice(0,10));setTo(end.toISOString().slice(0,10));setPeriod(value);setPatient("");setPage(1);
  };
  const [setPrintPermission,permissionState]=useSetPatientPrintPermissionMutation(),[pendingPrint,setPendingPrint]=useState(null);
  if(!allowed)return <BillingError error="You do not have permission to view Billing."/>;
  return <div className="space-y-5"><PageHeader title="Patient Due"/>
    <Card><div className="flex flex-wrap items-center justify-end gap-3"><div className="flex flex-wrap justify-end gap-2" role="group" aria-label="Due period">{[["today","Today"],["week","Last Week"],["month","This Month"]].map(([value,label])=><Button key={value} size="sm" variant={period===value?"primary":"outline"} aria-pressed={period===value} onClick={()=>selectPeriod(value)}>{label}</Button>)}{(from || to)&&<Button size="sm" variant="ghost" onClick={()=>{setFrom("");setTo("");setPeriod("");setPage(1);}}>Clear dates</Button>}</div></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Order date from" type="date" className="[&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:invert" value={from} onChange={e=>{setFrom(e.target.value);setPeriod("custom");setPatient("");setPage(1);}}/><Field label="To date" type="date" className="[&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:invert" min={from} value={to} onChange={e=>{setTo(e.target.value);setPeriod("custom");setPatient("");setPage(1);}}/></div>
      <form className="mt-4 flex flex-wrap items-end gap-3 border-t pt-4" onSubmit={e=>{e.preventDefault();const value=search.trim();setPatient(value);setPage(1);setNotice("");if(value===patient&&showResults&&!invalid)query.refetch();}}><div className="min-w-60 flex-1"><Field label="Search patient (optional)" placeholder="Patient ID, MRN or Lab ID" maxLength={100} value={search} onChange={e=>setSearch(e.target.value)}/></div><Button type="submit" disabled={(!search.trim() && (!showResults || invalid)) || query.isFetching}>Search due</Button>{(patient || search)&&<Button variant="outline" onClick={()=>{setSearch("");setPatient("");setPage(1);}}>Clear search</Button>}</form></Card>
    {showResults&&!invalid&&<div className="rounded-xl border border-border p-5" aria-live="polite"><p className="text-sm font-medium text-foreground">Total Dues</p><p className={`mt-2 text-3xl font-semibold tracking-tight ${query.isFetching || !data || invalid?"text-muted-foreground":Number(data.summary.due)===0?"text-green-600":"text-[#AA510D]"}`}>{query.isFetching || !data || invalid?"—":money(data.summary.due)}</p></div>}
    <BillingError error={invalid?"Select a valid date range. From date must be before or equal to To date.":showResults?query.error:null}/>{notice&&<p role="status" className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {showResults&&!invalid&&(data || query.isFetching)&&<>
      <BillingError error={permissionState.error}/>
      {data?.printAccess&&<Card><div className="flex items-center gap-3 text-sm"><input type="checkbox" aria-label="Allow lab report printing with due" className="h-5 w-5 shrink-0 cursor-pointer accent-primary disabled:cursor-not-allowed" checked={pendingPrint?.patientId===data.patient.id?pendingPrint.checked:data.printAccess.allowPrintWithDue} disabled={!canCollect || permissionState.isLoading || Boolean(pendingPrint) || query.isFetching} onChange={async e=>{
        const checked=e.target.checked;setPendingPrint({patientId:data.patient.id,checked});try{await setPrintPermission({id:data.patient.id,allowPrintWithDue:checked,expectedRevision:data.printAccess.revision}).unwrap();await query.refetch();setNotice(checked?"Report print permission enabled despite due.":"Report print permission cancelled.");}catch{}finally{setPendingPrint(null);}
      }}/><span><b>Allow lab report printing with due</b></span></div></Card>}

      <LaboratoryTable data={data} busy={query.isFetching} canCollect={canCollect} onDialog={setDialog} emptyTitle="No outstanding dues for this period"/><Pagination data={data} page={page} setPage={setPage} busy={query.isFetching}/>
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
