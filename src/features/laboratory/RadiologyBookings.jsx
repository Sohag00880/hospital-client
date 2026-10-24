"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {useAppSelector} from "@/store/hooks";
import {PageHeader} from "@/components/layout/PageHeader";
import {Card} from "@/components/ui/Card";
import {Button} from "@/components/ui/Button";
import {Select} from "@/components/ui/Select";
import {Input} from "@/components/ui/Input";
import {DataTable} from "@/components/ui/DataTable";
import {LabError,LabField} from "./LabUI";
import {useRadiologyBookingsQuery,useUpdateRadiologyBookingStatusMutation,labQueryOptions} from "./laboratoryApi";
const statuses={booked:"Booked",in_progress:"In Progress",completed:"Completed"};
export function RadiologyBookings(){
 const router=useRouter(),permissions=useAppSelector(s=>s.auth.permissions),allowed=permissions.includes("lab.view"),canEdit=permissions.includes("lab.update");
 const [search,setSearch]=useState(""),[debounced,setDebounced]=useState(""),[date,setDate]=useState(""),[status,setStatus]=useState(""),[page,setPage]=useState(1);
 useEffect(()=>{const timer=setTimeout(()=>{setDebounced(search.trim());setPage(1);},300);return()=>clearTimeout(timer);},[search]);
 const query=useRadiologyBookingsQuery({search:debounced,date:date||undefined,bookingStatus:status||undefined,page,pageSize:20},{...labQueryOptions,skip:!allowed}),data=query.currentData?.data;
 if(!allowed)return <LabError error="You do not have permission to view radiology bookings."/>;
 return <div className="space-y-5"><PageHeader title="Radiology Test List" actions={permissions.includes("lab.create")&&permissions.includes("patient.view")&&<Button onClick={()=>router.push("/laboratory/test-booking")}>New Test Booking</Button>}/>
  <section aria-label="Radiology booking summary" aria-busy={query.isFetching} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{[{label:"Total Tests",key:"total",color:"text-foreground"},{label:"Booked",key:"booked",color:"text-blue-700"},{label:"In Progress",key:"inProgress",color:"text-amber-700"},{label:"Completed",key:"completed",color:"text-emerald-700"},{label:"Total Test Fee",key:"totalAmount",color:"text-foreground",amount:true}].map(item=><Card key={item.key} className="space-y-2"><p className="text-sm text-muted-foreground">{item.label}</p><p className={`${item.amount?"break-words text-xl":"text-2xl"} font-semibold tabular-nums ${item.color}`}>{!data?.summary?query.isFetching?"...":"?":item.amount?`BDT ${Number(data.summary[item.key]||0).toLocaleString("en-BD",{minimumFractionDigits:2,maximumFractionDigits:2})}`:Number(data.summary[item.key]||0).toLocaleString("en-BD")}</p></Card>)}</section>
  <Card><div className="grid gap-4 md:grid-cols-3"><LabField label="Search bookings" placeholder="Patient, MRN, phone, Lab ID or test" value={search} onChange={event=>setSearch(event.target.value)}/><LabField label="Booking date">{id=><Input id={id} type="date" value={date} onChange={event=>{setDate(event.target.value);setPage(1);}}/>}</LabField><LabField label="Booking status">{id=><Select id={id} value={status} onChange={event=>{setStatus(event.target.value);setPage(1);}}><option value="">All statuses</option>{Object.entries(statuses).map(([value,label])=><option key={value} value={value}>{label}</option>)}</Select>}</LabField></div></Card>
  <LabError error={query.error}/><DataTable rows={data?.items||[]} rowKey={row=>row.id} loading={query.isFetching} emptyTitle="No radiology bookings" columns={[
   {key:"patient",header:"Patient",accessor:row=><div><p className="font-medium">{row.patientName}</p><p className="mt-1 text-xs text-muted-foreground">{row.mrn} / {row.phone||"No phone"}</p></div>},
   {key:"test",header:"Test",accessor:row=><div><p className="font-medium">{row.testName}</p><p className="mt-1 text-xs text-muted-foreground">{row.code} / {row.modality}</p></div>},
   {key:"booking",header:"Booking",accessor:row=><div><p className="font-mono text-xs">{row.orderNumber}</p><p className="mt-1 text-xs text-muted-foreground">{row.orderedOn}</p></div>},
   {key:"amount",header:"Fee (BDT)",accessor:row=>Number(row.amount||0).toLocaleString("en-BD",{minimumFractionDigits:2,maximumFractionDigits:2})},
   {key:"status",header:"Status",accessor:row=><span className={`whitespace-nowrap text-sm font-medium ${row.bookingStatus==="completed"?"text-emerald-700":"text-muted-foreground"}`}>{statuses[row.bookingStatus]||"Booked"}</span>},
   {key:"actions",header:"Actions",accessor:row=><BookingActions key={`${row.id}:${row.revision}`} row={row} canEdit={canEdit} refreshing={query.isFetching} onOpen={()=>router.push(`/radiology-imaging/report-entry/${row.orderId}`)}/>},
  ]}/><div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{data?.total||0} tests / Page {page}</p><div className="flex gap-2"><Button variant="outline" disabled={page===1||query.isFetching} onClick={()=>setPage(value=>value-1)}>Previous</Button><Button variant="outline" disabled={!data||page*20>=data.total||query.isFetching} onClick={()=>setPage(value=>value+1)}>Next</Button></div></div>
 </div>;
}
function BookingActions({row,canEdit,refreshing,onOpen}){
 const [status,setStatus]=useState(row.bookingStatus||"booked"),[update,state]=useUpdateRadiologyBookingStatusMutation();
 return <div className="space-y-2"><div className="flex w-max items-center gap-2">{canEdit&&<><Select className="w-36" aria-label={`Status for ${row.testName}`} value={status} disabled={refreshing||state.isLoading} onChange={event=>setStatus(event.target.value)}>{Object.entries(statuses).map(([value,label])=><option key={value} value={value} disabled={!!row.resultCompletedAt&&value!=="completed"}>{label}</option>)}</Select><Button size="sm" variant="outline" disabled={refreshing||state.isLoading||status===row.bookingStatus} onClick={()=>update({id:row.orderId,itemId:row.id,expectedRevision:row.revision,status})}>{state.isLoading?"Saving...":"Save status"}</Button></>}<Button size="sm" variant="outline" disabled={state.isLoading} onClick={onOpen}>Open Report</Button></div><LabError error={state.error}/></div>;
}
