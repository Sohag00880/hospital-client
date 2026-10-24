"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {Pencil,Printer,Eye} from "lucide-react";
import {bangladeshDate,bangladeshTime} from "@/lib/time";
import {useAppSelector} from "@/store/hooks";
import {PageHeader} from "@/components/layout/PageHeader";
import {Card} from "@/components/ui/Card";
import {Button} from "@/components/ui/Button";
import {Input} from "@/components/ui/Input";
import {Select} from "@/components/ui/Select";
import {DataTable} from "@/components/ui/DataTable";
import {useLabOrdersQuery,labQueryOptions} from "./laboratoryApi";
import {LabError,LabField,StageBadge,stages,stageLabel} from "./LabUI";
import {bookingSourceLabel} from "./TestBookingSource";
import {LabOrderDetails} from "./LabOrderDetails";
import {LabOrderEditor} from "./LabOrderEditor";
import {LabDocument} from "./LabDocument";
export function LabTestList(){
  const router=useRouter();
  const permissions=useAppSelector(s=>s.auth.permissions),allowed=permissions.includes("lab.view"),canEdit=permissions.includes("lab.update"),canExport=permissions.includes("lab.export"),canCreate=permissions.includes("lab.create")&&permissions.includes("patient.view");
  const [source,setSource]=useState("");
  const [date,setDate]=useState(null),[status,setStatus]=useState(""),[search,setSearch]=useState(""),[debounced,setDebounced]=useState(""),[page,setPage]=useState(1),[dialog,setDialog]=useState(null);
  useEffect(()=>{setDate(bangladeshDate());},[]);
  useEffect(()=>{const timer=setTimeout(()=>{setDebounced(search);setPage(1);},300);return()=>clearTimeout(timer);},[search]);
  const query=useLabOrdersQuery({date:date || undefined,source:source||undefined,status:status || undefined,search:debounced,page,pageSize:20},{...labQueryOptions,skip:!allowed || date===null}),data=query.currentData?.data;
  if(!allowed)return <LabError error="You do not have permission to view Laboratory."/>;
  return <div className="space-y-5"><PageHeader title="Test List" actions={canCreate&&<Button onClick={()=>router.push("/laboratory/test-booking")}>New Test Booking</Button>}/>
    <Card><div className="grid gap-4 md:grid-cols-4"><LabField label="Order date">{id=><Input id={id} type="date" value={date ?? ""} onChange={event=>{setDate(event.target.value);setPage(1);}}/>}</LabField><LabField label="Search orders" placeholder="Order number, patient, MRN or barcode" value={search} onChange={event=>setSearch(event.target.value)}/><LabField label="Booking source">{id=><Select id={id} value={source} onChange={e=>{setSource(e.target.value);setPage(1);}}><option value="">All sources</option><option value="walk_in">Direct / Walk-in</option><option value="appointment">Doctor Appointment</option><option value="legacy">Earlier booking</option></Select>}</LabField><LabField label="Stage">{id=><Select id={id} value={status} onChange={event=>{setStatus(event.target.value);setPage(1);}}><option value="">All stages</option>{stages.map(value=><option key={value} value={value}>{stageLabel(value)}</option>)}</Select>}</LabField></div></Card>
    <LabError error={query.error}/><DataTable rows={data?.items || []} loading={query.isFetching} rowKey={row=>row.id} emptyTitle="No laboratory orders" columns={[
      {key:"number",header:"Order",accessor:row=>row.orderNumber},{key:"patient",header:"Patient",accessor:row=><div><p className="font-medium">{row.patientName}</p><p className="text-xs text-muted-foreground">{row.mrn}</p></div>},
      {key:"phone",header:"Phone",accessor:row=>row.phone||"-"},
      {key:"source",header:"Source",accessor:row=><div><p className="text-sm">{bookingSourceLabel(row.bookingSource)}</p>{row.referredDoctor&&<p className="mt-1 text-xs text-muted-foreground">Dr / Ref: {row.referredDoctor}</p>}</div>},
      {key:"date",header:"Order date",accessor:row=>row.orderedOn},{key:"orderedTime",header:"Ordered time",accessor:row=>row.createdAt?bangladeshTime(row.createdAt):"-"},
      {key:"amount",header:"Amount",accessor:row=>Number(row.totalAmount ?? 0).toLocaleString("en-BD",{minimumFractionDigits:2,maximumFractionDigits:2})},{key:"priority",header:"Priority",accessor:row=><span className={row.priority==="urgent"?"font-semibold text-destructive":"capitalize"}>{row.priority}</span>},
      {key:"stage",header:"Stage",accessor:row=><StageBadge status={row.status}/>},{key:"actions",header:"Actions",accessor:row=><div className="flex w-max flex-nowrap items-center gap-2 whitespace-nowrap [&>button]:shrink-0"><Button size="sm" variant="outline" onClick={()=>setDialog({type:"view",id:row.id})}><Eye className="h-3.5 w-3.5"/>View</Button>{canEdit&&<Button size="sm" variant="outline" disabled={row.status!=="ordered"||row.canEdit===false||query.isFetching} title={row.status!=="ordered"||row.canEdit===false?"Editing is available only before sample collection":"Edit test booking"} onClick={()=>setDialog({type:"edit",id:row.id})}><Pencil className="h-3.5 w-3.5"/>Edit</Button>}{canExport&&<Button size="sm" className="bg-teal-700 text-white hover:bg-teal-800" onClick={()=>setDialog({type:"print",id:row.id})}><Printer className="h-3.5 w-3.5" />Print</Button>}</div>},
    ]}/><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{data?.total ?? 0} orders · Page {page}</p><div className="flex gap-2"><Button variant="outline" disabled={page===1 || query.isFetching} onClick={()=>setPage(value=>value-1)}>Previous</Button><Button variant="outline" disabled={!data || page*20>=data.total || query.isFetching} onClick={()=>setPage(value=>value+1)}>Next</Button></div></div>
    {dialog?.type==="view"&&<LabOrderDetails id={dialog.id} onClose={()=>setDialog(null)}/>}
    {dialog?.type==="edit"&&<LabOrderEditor id={dialog.id} onClose={()=>setDialog(null)}/>}
    {dialog?.type==="print"&&<LabDocument id={dialog.id} kind="order" closeLabel="Close" onClose={()=>setDialog(null)}/>}
  </div>;
}
