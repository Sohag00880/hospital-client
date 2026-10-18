"use client";
import {useEffect,useRef,useState} from "react";
import {Printer} from "lucide-react";
import {bangladeshDate,bangladeshTime} from "@/lib/time";
import {useAppSelector} from "@/store/hooks";
import {PageHeader} from "@/components/layout/PageHeader";
import {Card} from "@/components/ui/Card";
import {Button} from "@/components/ui/Button";
import {Input} from "@/components/ui/Input";
import {Select} from "@/components/ui/Select";
import {Modal} from "@/components/ui/Modal";
import {DataTable} from "@/components/ui/DataTable";
import {useListPatientsQuery} from "@/features/patients/patientsApi";
import {useLabOrdersQuery,useLabTestsQuery,useCreateLabOrderMutation,labQueryOptions} from "./laboratoryApi";
import {LabError,LabField,StageBadge,stages,stageLabel} from "./LabUI";
import {LabOrderDetails} from "./LabOrderDetails";
import {LabDocument} from "./LabDocument";
export function LabWorkspace({workflow=false}){
  const permissions=useAppSelector(s=>s.auth.permissions),allowed=permissions.includes("lab.view"),canExport=permissions.includes("lab.export"),canCreate=permissions.includes("lab.create")&&permissions.includes("patient.view");
  const [date,setDate]=useState(null),[status,setStatus]=useState(""),[search,setSearch]=useState(""),[debounced,setDebounced]=useState(""),[page,setPage]=useState(1),[dialog,setDialog]=useState(null);
  useEffect(()=>{setDate(bangladeshDate());},[]);
  useEffect(()=>{const timer=setTimeout(()=>{setDebounced(search);setPage(1);},300);return()=>clearTimeout(timer);},[search]);
  const query=useLabOrdersQuery({date:date || undefined,status:status || undefined,search:debounced,page,pageSize:20},{...labQueryOptions,skip:!allowed || date===null}),data=query.currentData?.data;
  if(!allowed)return <LabError error="You do not have permission to view Laboratory."/>;
  return <div className="space-y-5"><PageHeader title={workflow?"Lab Workflow":"Lab Orders"} actions={!workflow&&canCreate&&<Button onClick={()=>setDialog({type:"create"})}>New lab order</Button>}/>
    {!workflow&&<div className="grid gap-3 sm:grid-cols-3" aria-label="Lab order amount summary">{[["Pending Amount","pendingAmount"],["Collection Amount","collectionAmount"],["Total Amount","totalAmount"]].map(([title,key])=><Card key={key}><p className="text-xs font-medium text-muted-foreground">{title}</p><p className={`mt-2 text-xl font-semibold ${key==="totalAmount"?"text-teal-700":""}`}>BDT {Number(data?.amounts?.[key] ?? 0).toLocaleString("en-BD",{minimumFractionDigits:2,maximumFractionDigits:2})}</p></Card>)}</div>}
    {workflow&&<ol aria-label="Laboratory workflow" className="grid gap-2 sm:grid-cols-4 xl:grid-cols-5">{stages.map((value,index)=><li key={value}><Button className="h-auto w-full justify-between py-3" variant={status===value?"primary":"outline"} onClick={()=>{setStatus(status===value?"":value);setPage(1);}} aria-pressed={status===value}><span>{index+1}. {stageLabel(value)}</span><span>{data?.counts?.[value] || 0}</span></Button></li>)}</ol>}
    <Card><div className="grid gap-4 md:grid-cols-3"><LabField label="Order date">{id=><Input id={id} type="date" value={date ?? ""} onChange={event=>{setDate(event.target.value);setPage(1);}}/>}</LabField><LabField label="Search orders" placeholder="Order number, patient, MRN or barcode" value={search} onChange={event=>setSearch(event.target.value)}/><LabField label="Stage">{id=><Select id={id} value={status} onChange={event=>{setStatus(event.target.value);setPage(1);}}><option value="">All stages</option>{stages.map(value=><option key={value} value={value}>{stageLabel(value)}</option>)}</Select>}</LabField></div></Card>
    <LabError error={query.error}/><DataTable rows={data?.items || []} loading={query.isFetching} rowKey={row=>row.id} emptyTitle="No laboratory orders" columns={[
      {key:"number",header:"Order",accessor:row=>row.orderNumber},{key:"patient",header:"Patient",accessor:row=><div><p className="font-medium">{row.patientName}</p><p className="text-xs text-muted-foreground">{row.mrn}</p></div>},
      {key:"date",header:"Order date",accessor:row=>row.orderedOn},{key:"orderedTime",header:"Ordered time",accessor:row=>row.createdAt?bangladeshTime(row.createdAt):"-"},
      ...(!workflow?[{key:"amount",header:"Amount",accessor:row=>Number(row.totalAmount ?? 0).toLocaleString("en-BD",{minimumFractionDigits:2,maximumFractionDigits:2})}]:[]),{key:"priority",header:"Priority",accessor:row=><span className={row.priority==="urgent"?"font-semibold text-destructive":"capitalize"}>{row.priority}</span>},
      {key:"stage",header:"Stage",accessor:row=><StageBadge status={row.status}/>},{key:"actions",header:"Actions",accessor:row=><div className="flex flex-wrap gap-2">{workflow&&<Button size="sm" variant="outline" onClick={()=>setDialog({type:"order",id:row.id})}>Open order</Button>}{!workflow&&canExport&&<Button size="sm" className="bg-teal-700 text-white hover:bg-teal-800" onClick={()=>setDialog({type:"print",id:row.id})}><Printer className="h-3.5 w-3.5" />Print</Button>}</div>},
    ]}/><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{data?.total ?? 0} orders · Page {page}</p><div className="flex gap-2"><Button variant="outline" disabled={page===1 || query.isFetching} onClick={()=>setPage(value=>value-1)}>Previous</Button><Button variant="outline" disabled={!data || page*20>=data.total || query.isFetching} onClick={()=>setPage(value=>value+1)}>Next</Button></div></div>
    {!workflow&&dialog?.type==="create"&&<NewOrder onClose={()=>setDialog(null)} onSaved={()=>setDialog(null)}/>}{!workflow&&dialog?.type==="print"&&<LabDocument id={dialog.id} kind="order" closeLabel="Close" onClose={()=>setDialog(null)}/>}{workflow&&dialog?.type==="order"&&<LabOrderDetails id={dialog.id} onClose={()=>setDialog(null)}/>}
  </div>;
}
function NewOrder({onClose,onSaved}){
  const [search,setSearch]=useState(""),[debounced,setDebounced]=useState(""),[patient,setPatient]=useState(null),[testIds,setTests]=useState([]),[priority,setPriority]=useState("routine"),[notes,setNotes]=useState(""),[error,setError]=useState(null),key=useRef(null);
  useEffect(()=>{const timer=setTimeout(()=>setDebounced(search),300);return()=>clearTimeout(timer);},[search]);
  useEffect(()=>{key.current=null;},[patient,testIds,priority,notes]);
  const people=useListPatientsQuery({search:debounced,page:1,pageSize:10},{skip:debounced.length<2}),tests=useLabTestsQuery({active:"true"},labQueryOptions),[create,state]=useCreateLabOrderMutation();
  return <Modal open title="New laboratory order" size="lg" onClose={state.isLoading?()=>{}:onClose}><form className="max-h-[75vh] space-y-4 overflow-y-auto pr-1" onSubmit={async event=>{event.preventDefault();setError(null);if(!patient || !testIds.length)return setError("Select a patient and at least one test");try{if(!key.current)key.current=crypto.randomUUID();const saved=await create({orderKey:key.current,patientId:patient.id,testIds,priority,notes}).unwrap();onSaved(saved.data);}catch(e){setError(e);}}}>
    <LabError error={error || tests.error || people.error}/><fieldset disabled={state.isLoading} className="space-y-4"><LabField label="Find patient" value={search} placeholder="Patient name or MRN" onChange={event=>{setSearch(event.target.value);setPatient(null);}}/>
    {patient?<p className="rounded bg-muted p-3 text-sm">Selected: {patient.firstName} {patient.lastName} · {patient.mrn}</p>:debounced.length>=2&&<div className="max-h-32 overflow-y-auto rounded border">{people.isFetching?<p className="p-3 text-sm">Searching patients...</p>:!(people.currentData?.data?.items || []).length?<p role="status" className="p-3 text-sm">No matching patients found.</p>:(people.currentData?.data?.items || []).map(row=><button type="button" key={row.id} className="block w-full p-3 text-left text-sm hover:bg-muted" onClick={()=>setPatient(row)}>{row.firstName} {row.lastName} · {row.mrn}</button>)}</div>}
    <fieldset className="space-y-2"><legend className="mb-2 text-sm font-semibold">Tests ({testIds.length}/20)</legend>{tests.isFetching?<p>Loading tests...</p>:!(tests.currentData?.data || []).length?<p className="text-sm text-muted-foreground">Add an active test in Test Catalog first.</p>:(tests.currentData?.data || []).map(row=><label key={row.id} className="flex cursor-pointer items-start gap-3 rounded border p-3 text-sm"><input type="checkbox" className="mt-1" checked={testIds.includes(row.id)} disabled={testIds.length>=20&&!testIds.includes(row.id)} onChange={event=>setTests(old=>event.target.checked?[...old,row.id]:old.filter(id=>id!==row.id))}/><span><b>{row.name}</b> <span className="font-semibold"> ? BDT {Number(row.amount ?? 0).toLocaleString("en-BD",{minimumFractionDigits:2,maximumFractionDigits:2})}</span> <span className="text-muted-foreground">{row.code} · {row.specimenType}</span></span></label>)}</fieldset>
    <p className="text-right font-semibold">Total amount: BDT {((tests.currentData?.data || []).filter(row=>testIds.includes(row.id)).reduce((sum,row)=>sum+Math.round(Number(row.amount ?? 0)*100),0)/100).toLocaleString("en-BD",{minimumFractionDigits:2,maximumFractionDigits:2})}</p>
    <LabField label="Priority">{id=><Select id={id} value={priority} onChange={event=>setPriority(event.target.value)}><option value="routine">Routine</option><option value="urgent">Urgent</option></Select>}</LabField><LabField label="Order notes" maxLength={1000} value={notes} onChange={event=>setNotes(event.target.value)}/></fieldset>
    <div className="flex justify-end gap-2"><Button variant="outline" disabled={state.isLoading} onClick={onClose}>Cancel</Button><Button type="submit" disabled={state.isLoading || !patient || !testIds.length || tests.isFetching || tests.isError}>Create order</Button></div>
  </form></Modal>;
}
