"use client";
import Link from "next/link";
import {useState} from "react";
import {useAppSelector} from "@/store/hooks";
import {bangladeshTimestamp} from "@/lib/time";
import {Modal} from "@/components/ui/Modal";
import {Card} from "@/components/ui/Card";
import {Button} from "@/components/ui/Button";
import {useLabOrderQuery,useLabSampleActionMutation,labQueryOptions} from "./laboratoryApi";
import {LabError,LabField,StageBadge} from "./LabUI";
export function SampleCollectionDetails({id,onClose}){
 const canCollect=useAppSelector(s=>s.auth.permissions.includes("lab.update"));
 const query=useLabOrderQuery(id,labQueryOptions),order=query.currentData?.data;
 const [collect,state]=useLabSampleActionMutation(),[notes,setNotes]=useState({}),[error,setError]=useState(null),[notice,setNotice]=useState("");
 const busy=query.isFetching||state.isLoading;
 return <Modal open title={order?`Sample collection ${order.orderNumber}`:"Sample collection"} size="lg" onClose={state.isLoading?()=>{}:onClose}><div className="max-h-[75vh] space-y-4 overflow-y-auto"><LabError error={query.error||error}/>{!order&&query.isFetching&&<p role="status">Loading samples...</p>}{order&&<><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{order.patient.name}</h3><p className="mt-1 text-xs text-muted-foreground">MRN {order.patient.mrn} / {order.orderedOn}</p></div><StageBadge status={order.status}/></div>{notice&&<p role="status" className="rounded-lg bg-muted p-3 text-sm">{notice}</p>}
 {order.samples.map(sample=><Card key={sample.id} className="space-y-3"><div className="flex items-center justify-between gap-3"><h4 className="font-semibold capitalize">{sample.specimenType}</h4><span className={`text-xs font-medium ${sample.collectedAt?"text-emerald-700":"text-amber-700"}`}>{sample.collectedAt?"Collected":"Awaiting collection"}</span></div><ul className="space-y-1 text-sm text-muted-foreground">{order.items.filter(item=>item.sampleId===sample.id).map(item=><li key={item.id}>{item.testSnapshot.name}</li>)}</ul>{sample.collectedAt?<><p className="text-xs text-muted-foreground">Collected: {bangladeshTimestamp(sample.collectedAt)}</p><p className="break-all font-mono text-xs">{sample.barcode}</p>{sample.collectionNotes&&<p className="whitespace-pre-wrap text-sm">{sample.collectionNotes}</p>}</>:canCollect&&order.status==="ordered"&&<form className="space-y-3" onSubmit={async e=>{e.preventDefault();setError(null);try{await collect({id,sampleId:sample.id,action:"collect",expectedRevision:order.revision,notes:notes[sample.id]||""}).unwrap();setNotice("Sample collected successfully.");}catch(err){setError(err);}}}><LabField label={`${sample.specimenType} collection notes (optional)`} maxLength={500} disabled={busy} value={notes[sample.id]||""} onChange={e=>setNotes(old=>({...old,[sample.id]:e.target.value}))}/><Button type="submit" disabled={busy}>Collect sample</Button></form>}</Card>)}
 {order.status!=="ordered"&&<div className="rounded-lg border p-4"><p className="text-sm">All samples have been collected.</p><Link href="/laboratory/result-entry" onClick={onClose} className="mt-2 inline-block text-sm font-medium text-primary hover:underline">Go to Result Entry</Link></div>}</>}<div className="flex justify-end"><Button variant="outline" disabled={state.isLoading} onClick={onClose}>Close</Button></div></div></Modal>;
}
