"use client";
import {cloneElement,useId,useEffect,useState} from "react";
import {useRouter,useSearchParams} from "next/navigation";
import {useAppSelector} from "@/store/hooks";
import {Button} from "@/components/ui/Button";
import {Input} from "@/components/ui/Input";
import {Select} from "@/components/ui/Select";
import {Textarea} from "@/components/ui/Textarea";
import {Modal} from "@/components/ui/Modal";
import {DataTable} from "@/components/ui/DataTable";
import {ErrorBox,Pager} from "@/features/inpatient/InpatientUI";
import {HospitalCharges,PatientChargeList} from "./IpdCharges";
import {bangladeshDate,bangladeshTimestamp} from "@/lib/time";
import {useIpdChargeCatalogQuery,useIpdBillsQuery,useIpdAccountQuery,useIpdReportsQuery,useIpdSaveMutation} from "./ipdApi";
import {IpdPrint,money} from "./IpdPrint";
const ipdViews={
 bills:{title:"IPD Bill Management",suffix:""},
 deposits:{title:"Advance & Deposit",suffix:"/deposits"},
 payments:{title:"Payments & Due",suffix:"/payments"},
 services:{title:"Service Charges",suffix:"/services"},
 final:{title:"Final Bill & Discharge",suffix:"/final"},
 reports:{title:"IPD Billing Reports",suffix:"/reports"},
};
const titles={services:"Add charges",deposit:"Receive advance",deposit_refund:"Refund advance",apply:"Apply advance to bill",payment:"Receive payment",payment_refund:"Refund bill credit",discount:"Add discount",finalize:"Finalize bill",close:"Close bill & discharge"};
const cashActions=["payment","deposit","deposit_refund","payment_refund"];
const amountActions=[...cashActions,"apply","discount"];
const stamp=value=>value?bangladeshTimestamp(value):"—";
export function IpdBilling({view="bills"}){
 const router=useRouter(),params=useSearchParams(),id=params.get("admission")||"";
 const permissions=useAppSelector(s=>s.auth.permissions),allowed=permissions.includes("billing.view")&&permissions.includes("inpatient.view");
 const canWrite=permissions.includes("billing.create"),canApprove=canWrite&&permissions.includes("billing.approve");
 const [search,setSearch]=useState(""),[lookup,setLookup]=useState(""),[status,setStatus]=useState("active"),[page,setPage]=useState(1),[dialog,setDialog]=useState(null),[print,setPrint]=useState(null),[notice,setNotice]=useState("");
 const list=useIpdBillsQuery({search:lookup,status,page},{skip:!allowed||view==="reports",refetchOnMountOrArgChange:true});
 const account=useIpdAccountQuery(id,{skip:!allowed||!id||view==="reports",refetchOnMountOrArgChange:true});
 const catalog=useIpdChargeCatalogQuery(undefined,{skip:!allowed});
 const data=account.currentData?.data,a=data?.admission,s=data?.summary,closed=Boolean(data?.account.closedAt)||a?.status==="discharged",locked=closed||Boolean(data?.account.finalizedAt);
 const current=ipdViews[view]||ipdViews.bills,url=`/billing/ipd${current.suffix}`;
 useEffect(()=>{setDialog(null);setPrint(null);setNotice("");},[id,view]);
 const addRequested=params.get("add")==="1";
 useEffect(()=>{
  if(addRequested&&data&&!account.isFetching&&!catalog.isFetching&&!closed&&canWrite){router.replace(`/billing/ipd/services/edit?admission=${id}`);}
 },[addRequested,data,account.isFetching,catalog.isFetching,closed,canWrite,url,id,router]);
 if(!allowed)return <ErrorBox error="You do not have permission to view IPD Billing."/>;
 const choose=admission=>router.push(`${url}?admission=${admission}`);
 const open=(action,entry)=>action==="services"?router.push(`/billing/ipd/services/edit?admission=${id}`):setDialog({action,entry});
 const actions=[];
 if(data&&!closed){
  if(["bills","services"].includes(view)&&canWrite&&(!locked||canApprove))actions.push(["services",data.charges?.length?"Add / edit charges":titles.services]);
  if(view==="deposits"&&canWrite){if(!locked)actions.push(["deposit",titles.deposit]);if(Number(s.advance)>0){if(Number(s.due)>0)actions.push(["apply",titles.apply]);if(canApprove)actions.push(["deposit_refund",titles.deposit_refund]);}}
  if(["payments","final","bills"].includes(view)&&canWrite&&Number(s.due)>0)actions.push(["payment",titles.payment]);
  if(view==="final"&&canApprove){
   if(!locked)actions.push(["finalize",titles.finalize]);
   if(Number(s.net)>0)actions.push(["discount",titles.discount]);
   if(Number(s.credit)>0)actions.push(["payment_refund",titles.payment_refund]);
   if(Number(s.advance)>0){if(Number(s.due)>0)actions.push(["apply",titles.apply]);actions.push(["deposit_refund",titles.deposit_refund]);}
   if(locked&&permissions.includes("inpatient.discharge"))actions.push(["close",titles.close]);
  }
 }
 const entries=(data?.entries||[]).filter(e=>view==="deposits"?["deposit","deposit_refund","apply"].includes(e.kind):["bills","services","payments"].includes(view)?["payment","payment_refund","apply"].includes(e.kind):true);
 return <div className="space-y-5">
  {view==="reports"?<Reports onOpen={admission=>router.push(`/billing/ipd?admission=${admission}`)}/>:<>
   <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">{current.title}</h2>{id&&<Button variant="outline" onClick={()=>router.push(url)}>Back to patient list</Button>}</div>
   <ErrorBox error={list.error||account.error||catalog.error}/>
   {view==="services"&&!id&&<HospitalCharges canManage={permissions.includes("billing.approve")}/> }{notice&&<p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
   {!id?<><form className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4" onSubmit={e=>{e.preventDefault();setLookup(search.trim());setPage(1);}}><Field title="Find patient / admission"><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, MRN or admission number"/></Field><Field title="Bill status"><Select value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}>{[["active","Admitted patients"],["finalized","Finalized"],["due","With due"],["advance","With advance"],["closed","Closed"],["all","All patients"]].map(([value,title])=><option key={value} value={value}>{title}</option>)}</Select></Field><Button type="submit">Search</Button><Button variant="outline" onClick={list.refetch} disabled={list.isFetching}>Refresh</Button></form><PatientTable data={list.currentData?.data} loading={list.isFetching} onOpen={choose}/><Pager data={list.currentData?.data} page={page} setPage={setPage} busy={list.isFetching}/></>:account.isFetching&&!data?<p role="status">Loading patient bill…</p>:data&&<>
    <section className="space-y-5 rounded-xl border bg-card p-5 sm:p-6">
     <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 space-y-2"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Patient</p><h3 className="break-words text-2xl font-semibold tracking-tight">{a.patientName}</h3><span className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${closed?"border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200":locked?"border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200":"border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-200"}`}><span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-current"/>{closed?"Closed / discharged":locked?"Finalized ? awaiting settlement":"Open bill"}</span></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={account.refetch} disabled={account.isFetching}>Refresh</Button><Button variant="outline" onClick={()=>setPrint({})}>Print bill</Button></div>
     </div>
     <dl className="grid grid-cols-1 gap-x-6 gap-y-4 border-y py-4 sm:grid-cols-2 xl:grid-cols-5">
      {[["Admission number",a.admissionNumber,true],["Patient ID / MRN",a.mrn,true],["Admitting doctor",a.doctorName],["Bed / cabin",a.bedName||"No bed allocated"],["Admitted on",stamp(a.admittedAt)]].map(([label,value,identifier])=><div key={label} className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className={`mt-1.5 break-words text-sm font-medium leading-6 ${identifier?"font-mono tabular-nums":""}`}>{value||"?"}</dd></div>)}
     </dl>
     <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">{[["Net bill",s.net],["Discount",s.discount],["Paid / applied",s.paid],["Due",s.due],["Advance",s.advance],["Bill credit",s.credit]].map(([title,value])=><div key={title} className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">{title} (BDT)</p><p className="mt-1 text-lg font-semibold tabular-nums">{money(value)}</p></div>)}</div>
     {view==="deposits"&&<p className="text-sm text-muted-foreground">Advance is separate from bill payment. Apply it to the bill to reduce due, or refund the unused balance.</p>}
     {view==="final"&&<p className="text-sm text-muted-foreground">Finalize to stop automatic calculation. Settle due, unused advance and bill credit, then discharge. Editing finalized service charges reopens the bill for review.</p>}
     <div className="flex flex-wrap gap-2">{actions.map(([action,title])=><Button key={action} disabled={account.isFetching||(action==="services"&&catalog.isFetching)} onClick={()=>open(action)}>{title}</Button>)}</div>
    </section>
    {["bills","services"].includes(view)&&<PatientChargeList data={data} editable={false} onEdit={()=>open("services")}/>}
    <details className="rounded-xl border bg-card p-4" open={!["bills","services"].includes(view)}><summary className="mb-3 cursor-pointer text-sm font-semibold">{["bills","services"].includes(view)?"Payment history":"Transaction history"}</summary>
    <DataTable loading={account.isFetching} rows={entries.slice().reverse()} rowKey={e=>e.id} emptyTitle="No transactions recorded" columns={[
     {key:"date",header:"Recorded",accessor:e=><div className="whitespace-nowrap text-xs">{stamp(e.createdAt)}<p className="mt-1 text-muted-foreground">{e.metadata?.automatic?"Automatic update":e.author}</p></div>},
     {key:"description",header:"Details",accessor:e=><div><p className="font-medium capitalize">{e.name||e.kind.replaceAll("_"," ")}{data.entries.some(row=>row.replacesId===e.id)?" (removed)":""}</p><p className="mt-1 text-xs text-muted-foreground">{e.description}</p>{e.metadata?.from&&<p className="mt-1 text-xs">{stamp(e.metadata.from)} → {stamp(e.metadata.until)}</p>}</div>},
     {key:"amount",header:"Amount (BDT)",accessor:e=><div className="tabular-nums">{money(e.amount)}<p className="text-xs text-muted-foreground">{e.quantity?`${e.quantity} × ${money(e.unitPrice)}`:e.method}</p></div>},
     {key:"actions",header:"Actions",accessor:e=><div className="flex gap-2">{cashActions.includes(e.kind)&&<Button size="sm" variant="outline" onClick={()=>setPrint({entry:e})}>Receipt</Button>}</div>},
    ]}/></details>
    {dialog&&dialog.action!=="services"&&<ActionDialog key={`${dialog.action}-${dialog.entry?.id||"new"}`} dialog={dialog} data={data} onClose={()=>setDialog(null)} onSaved={()=>{setDialog(null);setNotice("Saved successfully.");}}/>}
    {print&&<IpdPrint data={data} entry={print.entry} onClose={()=>setPrint(null)}/>}
   </>}
  </>}
 </div>;
}
function Field({title,children}){const id=useId();return <div className="space-y-1.5 text-sm font-medium"><label className="block" htmlFor={id}>{title}</label>{cloneElement(children,{id})}</div>;}
function PatientTable({data,loading,onOpen}){return <DataTable rows={data?.items||[]} loading={loading} rowKey={r=>r.id} emptyTitle="No patient bills found" columns={[
 {key:"patient",header:"Patient",accessor:r=><div><p className="font-medium">{r.patientName}</p><p className="text-xs text-muted-foreground">MRN {r.mrn} · {r.admissionNumber}</p></div>},
 {key:"status",header:"Status",accessor:r=>r.closedAt?"Closed":r.finalizedAt?"Finalized":r.status==="discharged"?"Discharged":"Open"},
 ...[["net","Net bill"],["paid","Paid"],["due","Due"],["advance","Advance"]].map(([key,title])=>({key,header:`${title} (BDT)`,accessor:r=>money(r[key])})),
 {key:"open",header:"Bill",accessor:r=><Button size="sm" variant="outline" onClick={()=>onOpen(r.id)}>Open bill</Button>},
 ]}/>;}
function ActionDialog({dialog,data,onClose,onSaved}){
 const {action}=dialog;
 const [values,setValues]=useState({amount:"",method:"cash",description:""});
 const [expectedRevision]=useState(data.account.revision),[requestKey]=useState(()=>crypto.randomUUID()),[error,setError]=useState(null),[save,state]=useIpdSaveMutation();
 const change=(key,value)=>setValues(v=>({...v,[key]:value}));
 const input=(key,extra={})=><Input required value={values[key]} onChange={e=>change(key,e.target.value)} {...extra}/>;
 return <Modal open title={titles[action]} size="lg" onClose={state.isLoading?()=>{}:onClose}><form className="space-y-4" onSubmit={async e=>{
  e.preventDefault();setError(null);
  const body={action,requestKey,expectedRevision,description:values.description};
  if(amountActions.includes(action))body.amount=values.amount;
  if(cashActions.includes(action))body.method=values.method;
  try{await save({id:data.admission.id,...body}).unwrap();onSaved();}catch(err){setError(err);}
 }}>
  <ErrorBox error={error}/>
  {action==="payment"&&<div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/30"><span className="text-sm font-medium">Current due</span><strong className="text-xl tabular-nums">BDT {money(data.summary.due)}</strong></div>}
  {amountActions.includes(action)&&<Field title="Amount (BDT)">{input("amount",{type:"number",min:"0.01",step:"0.01"})}</Field>}
  {cashActions.includes(action)&&<Field title="Payment method"><Select value={values.method} onChange={e=>change("method",e.target.value)}>{["cash","bank","mobile"].map(method=><option key={method} value={method}>{method}</option>)}</Select></Field>}
  {action==="close"&&<p className="text-sm">Close the settled final bill and discharge this patient. The bed will be released for cleaning. This cannot be undone.</p>}
  {action==="finalize"&&<p className="text-sm">Automatic service charges will be calculated through now and paused. You can review or edit the charges before closing the bill.</p>}
  <Field title="Note / reason"><Textarea required maxLength={400} value={values.description} onChange={e=>change("description",e.target.value)}/></Field>
  <div className="flex justify-end gap-2"><Button variant="outline" disabled={state.isLoading} onClick={onClose}>Cancel</Button><Button type="submit" disabled={state.isLoading}>{state.isLoading?"Saving…":titles[action]}</Button></div>
 </form></Modal>;
}
function Reports({onOpen}){
 const [dates,setDates]=useState({from:"",to:""}),[filter,setFilter]=useState(null),[search,setSearch]=useState(""),[page,setPage]=useState(1);
 useEffect(()=>{const today=bangladeshDate();setDates({from:today,to:today});setFilter({from:today,to:today,search:""});},[]);
 const query=useIpdReportsQuery({...filter,page},{skip:!filter,refetchOnMountOrArgChange:true}),data=query.currentData?.data;
 return <div className="space-y-5"><h2 className="text-xl font-semibold">IPD Billing Reports</h2><form className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4" onSubmit={e=>{e.preventDefault();setPage(1);setFilter({...dates,search:search.trim()});}}><Field title="From"><Input required type="date" value={dates.from} onChange={e=>setDates(v=>({...v,from:e.target.value}))}/></Field><Field title="To"><Input required type="date" min={dates.from} value={dates.to} onChange={e=>setDates(v=>({...v,to:e.target.value}))}/></Field><Field title="Patient / admission"><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, MRN or admission"/></Field><Button type="submit" disabled={query.isFetching}>View report</Button></form><ErrorBox error={query.error}/>
  <div className="grid gap-3 sm:grid-cols-3">{[["Patient net bills",data?.summary.net],["Current due",data?.summary.due],["Unused advance",data?.summary.advance]].map(([title,value])=><div className="rounded-xl border bg-card p-4" key={title}><p className="text-sm text-muted-foreground">{title}</p><p className="mt-1 text-xl font-semibold">BDT {money(value)}</p></div>)}</div>
  <h3 className="font-semibold">Daily collection</h3><p className="text-xs text-muted-foreground">Selected dates in Asia/Dhaka. Advance applications are excluded from cash collection to avoid counting the same money twice.</p>
  <DataTable rows={data?.daily||[]} loading={query.isFetching} rowKey={r=>r.date} emptyTitle="No collections in this period" columns={[["date","Date"],["payments","Payments"],["deposits","Advance received"],["refunds","Refunds"],["collection","Net collection"]].map(([key,title])=>({key,header:title,accessor:r=>key==="date"?r[key]:money(r[key])}))}/>
  <h3 className="font-semibold">Patient balances</h3><p className="text-xs text-muted-foreground">Current cumulative bill, due and advance for matching patients across all dates.</p><PatientTable data={data} loading={query.isFetching} onOpen={onOpen}/><Pager data={data} page={page} setPage={setPage} busy={query.isFetching}/>
 </div>;
}

