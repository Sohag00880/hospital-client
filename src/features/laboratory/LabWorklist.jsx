"use client";
import {useRouter} from "next/navigation";
import {Printer,ArrowRight,CheckCheck} from "lucide-react";
import {useEffect,useState} from "react";
import {useAppSelector} from "@/store/hooks";
import {PageHeader} from "@/components/layout/PageHeader";
import {Card} from "@/components/ui/Card";
import {Button} from "@/components/ui/Button";
import {Input} from "@/components/ui/Input";
import {Select} from "@/components/ui/Select";
import {DataTable} from "@/components/ui/DataTable";
import {useLabOrdersQuery,useCollectAllLabSamplesMutation,labQueryOptions} from "./laboratoryApi";
import {LabField,LabError,StageBadge,stageLabel} from "./LabUI";
import {SampleCollectionDetails} from "./SampleCollectionDetails";
export function LabWorklist({mode}){
 const router=useRouter();
 const allowed=useAppSelector(s=>s.auth.permissions.includes("lab.view"));
 const canCollect=useAppSelector(s=>s.auth.permissions.includes("lab.update"));
 const [collectAll,collectState]=useCollectAllLabSamplesMutation();
 const [collectError,setCollectError]=useState(null);
 const radiology=mode==="radiology";
 const collection=mode==="collection",reports=mode==="reports",statuses=radiology?["ordered","sample_collected","processing","result_entered","finalized"]:collection?["ordered"]:reports?["result_entered","finalized"]:["sample_collected","processing"],title=radiology?"Radiology Report Entry":collection?"Sample Collection":reports?"Test Reports":"Result Entry";
 const [date,setDate]=useState(""),[search,setSearch]=useState(""),[debounced,setDebounced]=useState(""),[status,setStatus]=useState(""),[page,setPage]=useState(1),[selected,setSelected]=useState(null);
 useEffect(()=>{const timer=setTimeout(()=>{setDebounced(search.trim());setPage(1);},300);return()=>clearTimeout(timer);},[search]);
 const query=useLabOrdersQuery({worklist:mode,date:date||undefined,search:debounced,status:status||undefined,page,pageSize:20},{...labQueryOptions,skip:!allowed}),data=query.currentData?.data;
 if(!allowed)return <LabError error="You do not have permission to view Laboratory."/>;
 return <div className="space-y-5"><PageHeader title={title}/><p className="text-sm text-muted-foreground">{radiology?"Open a radiology booking to enter findings, save the report and print. No specimen collection is required.":collection?"Find a booking, record specimen collection and hand it over for result entry.":reports?"Completed test reports. Open a report to print individual tests, print groups or edit saved results.":"Collected orders with pending results. Open an order to enter and save each test result."}</p>
  <Card><div className={`grid gap-4 ${collection?"md:grid-cols-2":"md:grid-cols-3"}`}><LabField label="Order date (optional)">{id=><Input id={id} type="date" value={date} onChange={e=>{setDate(e.target.value);setPage(1);}}/>}</LabField><LabField label="Search orders" placeholder="Lab ID, patient name, MRN or sample barcode" value={search} onChange={e=>setSearch(e.target.value)}/>{!collection&&<LabField label="Stage">{id=><Select id={id} value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}><option value="">All {collection?"collection":"result"} stages</option>{statuses.map(value=><option key={value} value={value}>{stageLabel(value)}</option>)}</Select>}</LabField>}</div></Card>
  <LabError error={query.error||collectError}/><DataTable rows={data?.items||[]} loading={query.isFetching} rowKey={row=>row.id} emptyTitle={radiology?"No radiology bookings":collection?"No samples awaiting collection":reports?"No completed test reports":"No pending test results"} columns={[
   {key:"order",header:"Lab ID",accessor:row=><span className="font-mono text-xs">{row.orderNumber}</span>},
   {key:"patient",header:"Patient",accessor:row=><div><p className="font-medium">{row.patientName}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{row.mrn}</p></div>},
   ...(radiology?[{key:"testNames",header:"Test name",accessor:row=><div className="space-y-1">{row.testNames?.length?row.testNames.map((name,index)=><p key={index} className="font-medium">{name}</p>):"—"}</div>}]:[]),
   {key:"date",header:"Order date",accessor:row=>row.orderedOn},
   {key:"priority",header:"Priority",accessor:row=><span className={row.priority==="urgent"?"font-semibold text-destructive":"capitalize"}>{row.priority}</span>},
   ...(!collection&&!radiology?[{key:"collector",header:"Collected by",accessor:row=><span className="text-sm">{row.collectedBy||"Not recorded"}</span>}]:[]),
   ...(!collection?[{key:"results",header:"Result progress",accessor:row=><div className="space-y-1"><p className="text-sm font-medium">{Math.max(0,Number(row.totalItems||0)-Number(row.pendingResults||0))} / {row.totalItems||0} complete</p><p className={`text-xs ${Number(row.pendingResults)>0?"text-amber-700":"text-emerald-700"}`}>{Number(row.pendingResults)>0?`${row.pendingResults} ${Number(row.pendingResults)===1?"test":"tests"} pending`:"All results ready"}</p></div>}]:[]),
   {key:"status",header:"Stage",accessor:row=><StageBadge status={row.status}/>},
   {key:"actions",header:"Actions",accessor:row=><div className="flex flex-wrap gap-2">{collection&&canCollect&&<Button size="sm" disabled={collectState.isLoading||query.isFetching} onClick={async()=>{setCollectError(null);try{await collectAll({id:row.id,expectedRevision:row.revision}).unwrap();}catch(error){setCollectError(error);}}}><CheckCheck className="h-3.5 w-3.5"/>{collectState.isLoading&&collectState.originalArgs?.id===row.id?"Collecting...":"Mark as Collected"}</Button>}<Button size="sm" variant="outline" disabled={collectState.isLoading} onClick={()=>collection?setSelected(row.id):router.push(radiology?`/radiology-imaging/report-entry/${row.id}`:`/laboratory/result-entry/${row.id}${reports?"?from=reports":""}`)}>{collection?"View samples":reports?<><Printer className="h-3.5 w-3.5"/>Print / Edit</>:<>Open results<ArrowRight className="h-3.5 w-3.5"/></>}</Button></div>},
  ]}/><div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{data?.total??0} orders / Page {page}</p><div className="flex gap-2"><Button variant="outline" disabled={page===1||query.isFetching} onClick={()=>setPage(page-1)}>Previous</Button><Button variant="outline" disabled={!data||page*20>=data.total||query.isFetching} onClick={()=>setPage(page+1)}>Next</Button></div></div>
  {selected&&collection&&<SampleCollectionDetails id={selected} onClose={()=>setSelected(null)}/>}</div>;
}
