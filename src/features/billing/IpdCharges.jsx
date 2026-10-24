"use client";
import {cloneElement,useId,useState} from "react";
import {Plus,ChevronDown,Check,Clock3} from "lucide-react";
import {Button} from "@/components/ui/Button";
import {Input} from "@/components/ui/Input";
import {Select} from "@/components/ui/Select";
import {Modal} from "@/components/ui/Modal";
import {ErrorBox} from "@/features/inpatient/InpatientUI";
import {bangladeshDate,bangladeshTimestamp} from "@/lib/time";
import {useIpdChargeCatalogQuery,useIpdTemplateSaveMutation,useIpdSaveMutation} from "./ipdApi";
import {money} from "./IpdPrint";
export const chargeCategories={bed:"Bed / Cabin / ICU",doctor:"Doctor round",admission:"Admission fee",nursing:"Nursing",ot:"OT / Surgery",laboratory:"Laboratory",radiology:"Radiology",medicine:"Medicine",oxygen:"Oxygen / Nebulization",procedure:"Procedure / Dressing",blood:"Blood / Transfusion",physiotherapy:"Physiotherapy",consumables:"Consumables",ambulance:"Ambulance",food:"Food",other:"Other"};
const blank=()=>({id:crypto.randomUUID(),name:"",category:"bed",mode:"manual",unitPrice:"",units:1,days:1,times:1,unitLabel:"bed",active:true,revision:0});
const localTime=value=>`${bangladeshDate(value)}T${new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Dhaka",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).format(new Date(value))}`;
const iso=value=>value?new Date(`${value}+06:00`).toISOString():null;
function math(row,at=new Date()){
 const days=row.mode==="automatic"?Math.ceil(Math.max(0,Math.min(new Date(at),row.endAt?new Date(row.endAt):Infinity)-new Date(row.startAt))/86400000):Number(row.days);
 const quantity=row.category==="bed"?days*Number(row.units):row.category==="doctor"?Number(row.units)*Number(row.times)*(row.mode==="automatic"?days:1):Number(row.units);
 return {days,quantity,total:quantity*Number(row.unitPrice||0)};
}
function Field({title,children}){const id=useId();return <div className="min-w-0 space-y-1 text-xs font-medium text-muted-foreground"><label className="block" htmlFor={id}>{title}</label>{cloneElement(children,{id})}</div>;}
function ConfigFields({row,onChange,patient=false,disabled=false}){
 const update=(key,value)=>onChange({...row,[key]:value});
 const number=(key,opts={})=><Input disabled={disabled} required type="number" value={row[key]} min={key==="days"||key==="times"?0:1} max={key==="days"?3650:key==="units"?1000000:1000} step="1" onChange={e=>update(key,e.target.value)} {...opts}/>;
 const auto=row.mode==="automatic";
 return <fieldset disabled={disabled} className="space-y-3"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
  <Field title="Charge name"><Input required maxLength={150} value={row.name} onChange={e=>update("name",e.target.value)} placeholder="e.g. General bed / Dr Rahman round"/></Field>
  <Field title="Charge type"><Select value={row.category} onChange={e=>{const category=e.target.value;onChange({...row,category,mode:["bed","doctor"].includes(category)?row.mode:"manual",unitLabel:category==="bed"?"bed":category==="doctor"?"doctor":"unit"});}}>{Object.entries(chargeCategories).map(([key,title])=><option key={key} value={key}>{title}</option>)}</Select></Field>
  <Field title="Rate per unit (BDT)">{number("unitPrice",{min:"0.01",max:"999999999999.99",step:"0.01",placeholder:"0.00"})}</Field>
  {["bed","doctor"].includes(row.category)?<Field title="Calculation"><Select value={row.mode} onChange={e=>onChange({...row,mode:e.target.value,times:Math.max(1,Number(row.times))})}><option value="manual">Manual</option><option value="automatic">Automatic</option></Select></Field>:<div className="self-end rounded-lg bg-muted/40 px-3 py-2 text-sm">Manual quantity</div>}
 </div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
  <Field title={row.category==="doctor"?"Doctors / units":row.category==="bed"?"Beds / units":"Quantity / units"}>{number("units")}</Field>
  {row.category==="bed"&&!auto&&<Field title="Total bed days">{number("days")}</Field>}
  {row.category==="doctor"&&<Field title={auto?"Rounds per day":"Total rounds"}>{number("times",{min:auto?1:0})}</Field>}
  <Field title="Unit label"><Input required maxLength={40} value={row.unitLabel} onChange={e=>update("unitLabel",e.target.value)} placeholder="bed, doctor, session…"/></Field>
  {auto&&<p className="self-end rounded-lg bg-teal-50 px-3 py-2 text-xs leading-relaxed text-teal-900 dark:bg-teal-950 dark:text-teal-100">{row.category==="doctor"?"Days × doctors × rounds/day × rate":"Days × beds × daily rate"}</p>}
 </div>
 {patient&&<details className="rounded-lg border bg-muted/10 px-3 py-2"><summary className="cursor-pointer text-xs font-medium">Dates & note {auto?"· automatic start / stop":""}</summary><div className="mt-3 grid gap-3 sm:grid-cols-2"><Field title="Start (Asia/Dhaka)"><Input required type="datetime-local" step="1" value={localTime(row.startAt)} onChange={e=>{if(e.target.value)update("startAt",iso(e.target.value));}}/></Field><Field title="End (optional, Asia/Dhaka)"><Input type="datetime-local" step="1" value={row.endAt?localTime(row.endAt):""} onChange={e=>update("endAt",iso(e.target.value))}/></Field><div className="sm:col-span-2"><Field title="Note (optional)"><Input maxLength={400} value={row.description||""} onChange={e=>update("description",e.target.value)}/></Field></div></div></details>}
 </fieldset>;
}
export function HospitalCharges({canManage}){
 const query=useIpdChargeCatalogQuery(),[editing,setEditing]=useState(null),[show,setShow]=useState(false);
 const rows=query.currentData?.data||[];
 return <section className="rounded-xl border bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Saved hospital charges</h3><p className="mt-1 text-sm text-muted-foreground">Set rates once. Use them together for any admitted patient, with patient-specific changes.</p></div><div className="flex gap-2"><Button variant="outline" onClick={()=>setShow(!show)}><ChevronDown className="h-4 w-4"/>{show?"Hide list":`View charges (${rows.filter(r=>r.active).length})`}</Button>{canManage&&<Button onClick={()=>setEditing(blank())}><Plus className="h-4 w-4"/>Create charge</Button>}</div></div><ErrorBox error={query.error}/>
  {(show||!rows.length)&&<div className="mt-4">{query.isLoading?<p className="text-sm">Loading charges…</p>:!rows.length?<p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">Create your bed, doctor round, nursing, OT and other charges here. Then open a patient and choose Add charges.</p>:<div className="grid gap-3 md:grid-cols-2">{rows.map(row=><div key={row.id} className={`rounded-lg border p-4 ${!row.active?"opacity-60":""}`}><div className="flex justify-between gap-3"><div><p className="font-medium">{row.name}{!row.active?" · Inactive":""}</p><p className="mt-1 text-xs text-muted-foreground">{chargeCategories[row.category]} · {row.mode==="automatic"?"Automatic":"Manual"}{row.category==="doctor"?` · ${row.times} ${row.mode==="automatic"?"rounds/day":"total rounds"}`:""}</p></div>{canManage&&<Button size="sm" variant="outline" onClick={()=>setEditing(row)}>Edit</Button>}</div><p className="mt-3 font-semibold tabular-nums">BDT {money(row.unitPrice)} <span className="text-xs font-normal text-muted-foreground">per {row.unitLabel}{row.category==="bed"?" / day":row.category==="doctor"?" / round":""}</span></p></div>)}</div>}</div>}
  {editing&&<TemplateDialog row={editing} onClose={()=>setEditing(null)}/>}
 </section>;
}
function TemplateDialog({row,onClose}){
 const [value,setValue]=useState(row),[error,setError]=useState(null),[save,state]=useIpdTemplateSaveMutation();
 return <Modal open title={row.revision?"Edit saved charge":"Create hospital charge"} size="xl" onClose={state.isLoading?()=>{}:onClose}><form className="space-y-5" onSubmit={async e=>{e.preventDefault();setError(null);try{await save({id:value.id,expectedRevision:row.revision,...payload(value),active:value.active}).unwrap();onClose();}catch(err){setError(err);}}}><ErrorBox error={error}/><ConfigFields row={value} onChange={setValue} disabled={state.isLoading}/><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.active} onChange={e=>setValue(v=>({...v,active:e.target.checked}))}/>Available for new patients</label><p className="text-xs text-muted-foreground">Changes here update the saved default. Existing patient charges keep their own rates.</p><div className="flex justify-end gap-2"><Button variant="outline" disabled={state.isLoading} onClick={onClose}>Cancel</Button><Button type="submit" disabled={state.isLoading}>{state.isLoading?"Saving…":"Save hospital charge"}</Button></div></form></Modal>;
}
function payload(row){return {name:row.name,category:row.category,mode:row.mode,unitPrice:String(row.unitPrice),units:Number(row.units),days:Number(row.days),times:Number(row.times),unitLabel:row.unitLabel};}
export function PatientChargeEditor({data,catalog,canEdit,onClose,onSaved}){
 const [rows,setRows]=useState(()=>{
  const existing=(data.charges||[]).map(row=>({...row,selected:true,existing:true}));
  const used=new Set(existing.map(r=>r.templateId));
  return [...existing,...catalog.filter(t=>t.active&&!used.has(t.id)).map(t=>({...t,id:crypto.randomUUID(),templateId:t.id,selected:existing.length===0,startAt:data.admission.admittedAt,endAt:null,description:"",existing:false}))];
 });
 const [expectedRevision]=useState(data.account.revision),[requestKey]=useState(()=>crypto.randomUUID()),[error,setError]=useState(null),[save,state]=useIpdSaveMutation();
 const update=(id,row)=>setRows(previous=>previous.map(old=>old.id===id?row:old));
 const selected=rows.filter(r=>r.selected),total=selected.reduce((sum,row)=>sum+math(row).total,0);
 return <form onSubmit={async e=>{
  e.preventDefault();setError(null);
  try{await save({id:data.admission.id,action:"services",requestKey,expectedRevision,items:selected.map(row=>({id:row.id,templateId:row.templateId||null,...payload(row),startAt:new Date(row.startAt).toISOString(),endAt:row.endAt?new Date(row.endAt).toISOString():null,description:row.description||""}))}).unwrap();onSaved();}catch(err){setError(err);}
 }}>
  <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex gap-2"><Button variant="outline" size="sm" disabled={state.isLoading} onClick={()=>setRows(old=>old.map(row=>row.existing&&!canEdit?row:{...row,selected:true}))}>Select all</Button><Button size="sm" disabled={state.isLoading||rows.length>=100} onClick={()=>setRows(old=>[...old,{...blank(),templateId:null,selected:true,existing:false,startAt:data.admission.admittedAt,endAt:null,description:""}])}><Plus className="h-4 w-4"/>New patient charge</Button></div></div>
  <div className="space-y-4"><ErrorBox error={error}/>{rows.length===0&&<p className="rounded-lg border border-dashed p-6 text-center text-sm">No saved charges yet. Add a new patient charge to begin.</p>}{rows.map((row,index)=>{
   const calc=math(row),disabled=state.isLoading||(row.existing&&!canEdit);
   return <section aria-label={`Charge ${index+1}`} key={row.id} className="rounded-xl border bg-card p-4 sm:p-5"><div className="mb-3 flex items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" aria-label={`Include charge ${index+1}`} checked={row.selected} disabled={disabled} onChange={e=>update(row.id,{...row,selected:e.target.checked})}/>{row.name||"New charge"}</label><span className="text-sm font-semibold tabular-nums">BDT {money(row.selected?calc.total:0)}</span></div><ConfigFields row={row} onChange={value=>update(row.id,value)} patient disabled={disabled||!row.selected}/>{row.selected&&<p className="mt-3 text-xs text-muted-foreground">{row.mode==="automatic"?`${calc.days} calculated day(s) · `:""}{calc.quantity} billed unit(s) × BDT {money(row.unitPrice)}{row.mode==="automatic"?" · updates automatically":""}</p>}</section>;
  })}</div>
  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4"><div><p className="text-sm">{selected.length} charges selected</p><p className="text-lg font-semibold">Current total: BDT {money(total)}</p></div><div className="flex gap-2"><Button variant="outline" disabled={state.isLoading} onClick={onClose}>Cancel</Button><Button type="submit" disabled={state.isLoading}>{state.isLoading?"Saving…":"Save patient charges"}</Button></div></div>
 </form>;
}
export function PatientChargeList({data,onEdit,editable}){
 const rows=data.charges||[];
 return <details className="rounded-xl border bg-card p-5"><summary className="cursor-pointer text-sm font-semibold">Patient service charges</summary><div className="mt-4">{editable&&<div className="mb-4 flex justify-end"><Button variant="outline" onClick={onEdit}>{rows.length?"Add / edit charges":"Add charges"}</Button></div>}
  {!rows.length?<p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">No service charges added yet. Choose from your saved hospital charges or create one for this patient.</p>:<div className="space-y-3">{rows.map(row=><div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"><div><p className="font-medium">{row.name}</p><p className="mt-1 text-xs text-muted-foreground">{chargeCategories[row.category]} · {row.mode==="automatic"?`${row.calculatedDays} day(s) × ${row.units} ${row.unitLabel}${row.category==="doctor"?` × ${row.times} rounds/day`:""}`:row.category==="bed"?`${row.days} day(s) × ${row.units} ${row.unitLabel}`:row.category==="doctor"?`${row.units} doctor(s) × ${row.times} total rounds`:`${row.units} ${row.unitLabel}`} × BDT {money(row.unitPrice)}</p>{row.mode==="automatic"&&<p className="mt-1 text-xs text-muted-foreground">From {bangladeshTimestamp(row.startAt)}{row.endAt?` to ${bangladeshTimestamp(row.endAt)}`:""}</p>}</div><div className="flex items-center gap-5"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${row.mode==="automatic"?"bg-teal-100 text-teal-800":"bg-muted text-muted-foreground"}`}>{row.mode==="automatic"?<Clock3 className="h-3 w-3"/>:<Check className="h-3 w-3"/>}{row.mode==="automatic"?"Automatic":"Manual"}</span><strong className="tabular-nums">BDT {money(row.amount)}</strong></div></div>)}</div>}
  {rows.some(r=>r.mode==="automatic")&&<p className="mt-3 text-xs text-muted-foreground">Automatic days count each started 24-hour period. Doctor round totals follow your configured rounds per day.</p>}
 </div></details>;
}
