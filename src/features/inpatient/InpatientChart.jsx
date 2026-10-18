"use client";
import {useState} from "react";
import Link from "next/link";
import {ArrowLeft,ArrowRightLeft,BedDouble,LogOut,RefreshCw} from "lucide-react";
import {useAppSelector} from "@/store/hooks";
import {Button} from "@/components/ui/Button";
import {useInpatientChartQuery,useInpatientSetupQuery,queryOptions} from "./inpatientApi";
import {InpatientBilling} from "./InpatientBilling";
import {Badge,Empty,ErrorBox,FormDialog,bedLabel,dateTime,field,label} from "./InpatientUI";


const tabs=[["overview","Overview"],["billing","Billing"],["discharge","Discharge"]];
const titles={admission:"Patient admitted",allocation:"Bed allocated",transfer:"Patient transferred",reopen:"Admission restored",discharge:"Discharge summary"};
const dataLabels={previousDischargedAt:"Corrected discharge time",reason:"Reason",bedId:"Allocated bed",fromBedId:"Previous bed",toBedId:"New bed",diagnosis:"Diagnosis",course:"Hospital course",condition:"Condition at discharge",medications:"Discharge medications",instructions:"Patient instructions",followUp:"Follow-up",outcome:"Discharge type"};
function Timeline({rows,setup}){
 if(!rows.length)return <Empty title="No entries yet"/>;
 const corrected=new Set(rows.filter(e=>e.kind==="reopen").map(e=>e.data.dischargeEntryId));
 const resolve=(key,value)=>key==="previousDischargedAt"?dateTime(value):key.endsWith("BedId")||key==="bedId"?setup.beds.find(b=>b.id===value)?bedLabel(setup.beds.find(b=>b.id===value)):value?"Previous bed":"Not allocated":String(value);
 return <div className="space-y-4">{rows.map(entry=><article key={entry.id} className="rounded-2xl border bg-card p-5"><h3 className="font-semibold">{titles[entry.kind]||label(entry.kind)}{corrected.has(entry.id)&&<span className="ml-2 text-xs text-amber-700">Reversed</span>}</h3><p className="mt-1 text-xs text-muted-foreground">{entry.author} | {dateTime(entry.createdAt)}</p><dl className="mt-4 grid gap-4 sm:grid-cols-2">{Object.entries(entry.data).filter(([key,value])=>value!==null&&value!==""&&typeof value!=="boolean"&&key!=="toBedName"&&key!=="dischargeEntryId"&&key!=="initialCharges").map(([key,value])=><div key={key}><dt className="text-xs text-muted-foreground">{dataLabels[key]||label(key)}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm">{resolve(key,value)}</dd></div>)}</dl></article>)}</div>;
}
export function InpatientChart({id}){
 const permissions=useAppSelector(s=>s.auth.permissions),allowed=permissions.includes("inpatient.view"),can=action=>permissions.includes("inpatient."+action);
 const chart=useInpatientChartQuery(id,{...queryOptions,skip:!allowed}),setupQuery=useInpatientSetupQuery(undefined,{...queryOptions,skip:!allowed});
 const [tab,setTab]=useState("overview"),[dialog,setDialog]=useState(null),[notice,setNotice]=useState("");
 const data=chart.currentData?.data,setup=setupQuery.currentData?.data;
 if(!allowed)return <ErrorBox error="You do not have permission to view inpatient care."/>;
 if(!data||!setup)return <div className="space-y-4"><Link href="/inpatient">Back to admissions</Link><ErrorBox error={chart.error||setupQuery.error}/>{(chart.isLoading||setupQuery.isLoading)&&<p role="status">Loading patient chart...</p>}</div>;
 const a=data.admission,active=a.status==="admitted",freeBeds=setup.beds.filter(b=>b.status==="available"&&!b.admissionId),dischargeEntry=active?null:data.timeline.find(e=>e.kind==="discharge");
 const timeline=rows=><Timeline rows={rows} setup={setup}/>;
 return <div className="space-y-5">
 <Link href="/inpatient" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4"/>Back to admissions</Link>
  <header className="rounded-2xl border bg-gradient-to-br from-teal-500/10 via-card to-card p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-semibold tracking-tight">{a.patientName}</h1><Badge tone={active?"green":"neutral"}>{label(a.status)}</Badge></div><p className="mt-2 text-sm text-muted-foreground"><span className="font-mono">{a.mrn}</span> · Admitted {dateTime(a.admittedAt)}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" size="icon" aria-label="Refresh chart" disabled={chart.isFetching} onClick={()=>chart.refetch()}><RefreshCw className="h-4 w-4"/></Button>{!active&&can("discharge")&&<Button onClick={()=>setDialog({type:"reopen"})}>Restore to admitted</Button>}{active&&can("admit")&&<Button variant="outline" onClick={()=>setDialog({type:"transfer"})}><ArrowRightLeft className="h-4 w-4"/>{a.bedId?"Transfer":"Allocate bed"}</Button>}{active&&can("discharge")&&<Button onClick={()=>setTab("discharge")}><LogOut className="h-4 w-4"/>Discharge</Button>}</div></div><div className="mt-5 grid gap-4 border-t pt-4 sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">Current location</p><p className="mt-1 flex items-center gap-2 text-sm font-medium"><BedDouble className="h-4 w-4 text-teal-600"/>{a.bedId?`${a.wardName} / ${a.roomName} / ${a.bedName}`:active?"Awaiting bed allocation":"Bed released"}</p></div><div><p className="text-xs text-muted-foreground">Consultant</p><p className="mt-1 text-sm font-medium">{a.doctorName}</p></div></div></header>
  <nav className="flex gap-1 overflow-x-auto rounded-xl border bg-card p-1" aria-label="Patient chart sections">{tabs.filter(([value])=>value!=="billing"||permissions.includes("billing.view")).map(([value,title])=><button key={value} type="button" aria-current={tab===value?"page":undefined} onClick={()=>setTab(value)} className={`whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium ${tab===value?"bg-primary text-primary-foreground":"text-muted-foreground hover:bg-muted"}`}>{title}</button>)}</nav>
 {notice&&<p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
 <ErrorBox error={chart.error||setupQuery.error}/>
 {tab==="overview"&&<>{a.reason?.trim()&&<section className="rounded-2xl border bg-card p-5"><h2 className="font-semibold">Reason for admission</h2><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{a.reason}</p></section>}<h2 className="font-semibold">Admission history</h2>{timeline(data.timeline)}</>}
 {tab==="billing"&&<InpatientBilling admission={a}/>}
 {tab==="discharge"&&(dischargeEntry?timeline([dischargeEntry]):<section className="rounded-2xl border bg-card p-6"><h2 className="font-semibold">Discharge patient</h2><p className="my-4 text-sm text-muted-foreground">Record the discharge summary, instructions and follow-up. The allocated bed will be released for cleaning.</p>{active&&can("discharge")&&<Button onClick={()=>setDialog({type:"discharge"})}><LogOut className="h-4 w-4"/>Complete discharge</Button>}</section>)}
 {dialog&&<ChartDialog dialog={dialog} admission={a} freeBeds={freeBeds} onClose={()=>setDialog(null)} onSaved={()=>setNotice("Patient chart updated.")}/>}
 </div>;
}
function ChartDialog({dialog,admission:a,freeBeds,onClose,onSaved}){
 const type=dialog.type,base="admissions/"+a.id;
 let title,path,fields,prepare=(v,key)=>({...v,requestKey:key}),submitLabel="Save";
 if(type==="transfer"){
  title=a.bedId?"Transfer patient":"Allocate a bed";path=`${base}/transfer`;submitLabel=a.bedId?"Confirm transfer":"Allocate bed";
  fields=[field("bedId","Available bed","select",{wide:true,options:freeBeds.map(b=>({value:b.id,label:bedLabel(b)}))}),field("reason","Reason","textarea",{maxLength:1000,required:Boolean(a.bedId)})];
  prepare=(v,key)=>({...v,requestKey:key,expectedRevision:a.revision});
 }else if(type==="reopen"){
  title="Correct discharge and restore admission";path=base+"/reopen";submitLabel="Restore to admitted";fields=[field("reason","Reason for correcting discharge","textarea",{maxLength:1000}),field("bedId","Available bed","select",{required:false,placeholder:"Allocate later",options:freeBeds.map(b=>({value:b.id,label:bedLabel(b)}))})];prepare=(v,key)=>({...v,bedId:v.bedId||null,requestKey:key,expectedRevision:a.revision});
 }else if(type==="discharge"){
  title="Complete discharge";path=`${base}/discharge`;submitLabel="Confirm discharge";
  fields=[field("outcome","Discharge type","select",{options:["Routine","Against medical advice","Referred","Deceased"].map(s=>({value:s,label:s})),wide:true}),field("diagnosis","Final diagnosis"),field("course","Hospital course / treatment summary"),field("condition","Condition at discharge","textarea",{maxLength:1000}),field("medications","Discharge medications / reconciliation"),field("instructions","Patient instructions"),field("followUp","Follow-up plan"),field("medicationReconciled","I reviewed and reconciled all medications and confirmed the discharge plan.","checkbox")];
  prepare=(v,key)=>({...v,requestKey:key,expectedRevision:a.revision});
 }
 return <FormDialog title={title} path={path} fields={fields} prepare={prepare} submitLabel={submitLabel} onClose={onClose} onSaved={onSaved}>{type==="transfer"&&!freeBeds.length&&<ErrorBox error="No beds are available. Mark a clean bed as Available on the bed board first."/>}</FormDialog>;
}
