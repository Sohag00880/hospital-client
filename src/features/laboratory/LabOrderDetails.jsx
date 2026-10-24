"use client";
import {Modal} from "@/components/ui/Modal";
import {Button} from "@/components/ui/Button";
import {bangladeshTimestamp} from "@/lib/time";
import {useLabOrderQuery,labQueryOptions} from "./laboratoryApi";
import {LabError,StageBadge} from "./LabUI";
import {bookingSourceLabel} from "./TestBookingSource";

const money=value=>Number(value||0).toLocaleString("en-BD",{minimumFractionDigits:2,maximumFractionDigits:2});
function Info({label,children}){return <div className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{children||"Not recorded"}</dd></div>;}
export function LabOrderDetails({id,onClose}){
 const query=useLabOrderQuery(id,labQueryOptions),order=query.currentData?.data;
 const address=order?.address||order?.patient?.address;
 const addressText=typeof address==="string"?address:[address?.village,address?.union?.name,address?.upazila?.name,address?.district?.name].filter(Boolean).join(", ");
 return <Modal open title={order?`Booking details / ${order.orderNumber}`:"Booking details"} size="xl" onClose={onClose}><div className="max-h-[75vh] space-y-5 overflow-y-auto pr-1">
  <LabError error={query.error}/>{query.isError&&<Button variant="outline" onClick={query.refetch}>Retry</Button>}{query.isFetching&&!order&&<p role="status" className="py-6 text-sm text-muted-foreground">Loading booking details...</p>}
  {order&&<>
   <section className="rounded-xl border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-semibold">{order.patient.name}</h3><p className="mt-1 font-mono text-xs text-muted-foreground">MRN {order.patient.mrn}</p></div><StageBadge status={order.status}/></div><dl className="mt-5 grid gap-4 sm:grid-cols-3"><Info label="Phone">{order.patient.phone}</Info><Info label="Gender"><span className="capitalize">{order.patient.sex||"Not recorded"}</span></Info><Info label="Order date">{order.orderedOn}</Info><div className="sm:col-span-3"><Info label="Address">{addressText}</Info></div></dl></section>
   <dl className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-3"><Info label="Booking source">{bookingSourceLabel(order.bookingSource)}</Info><Info label="Referred doctor">{order.referredDoctor}</Info><Info label="Priority"><span className="capitalize">{order.priority}</span></Info><Info label="Booked by">{order.createdByName}</Info><Info label="Booked at">{order.createdAt?bangladeshTimestamp(order.createdAt):null}</Info><Info label="Tests booked">{order.items.length}</Info></dl>
   <section aria-label="Booked tests" className="overflow-hidden rounded-xl border"><h3 className="border-b px-4 py-3 font-semibold">Booked tests ({order.items.length})</h3><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-4 py-3">Test</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Progress</th><th className="px-4 py-3 text-right">Fee (BDT)</th></tr></thead><tbody className="divide-y">{order.items.map(item=>{
    const radiology=item.testSnapshot.category==="radiology",sample=order.samples.find(row=>row.id===item.sampleId);
    return <tr key={item.id}><td className="px-4 py-3"><p className="font-medium">{item.testSnapshot.name}</p><p className="mt-1 text-xs text-muted-foreground">{item.testSnapshot.code} / {item.testSnapshot.specimenType}</p></td><td className="px-4 py-3">{radiology?"Radiology":"Pathology"}</td><td className="px-4 py-3"><span className={item.resultCompletedAt?"text-emerald-700":"text-muted-foreground"}>{item.resultCompletedAt?"Result saved":radiology?(item.radiologyBookingStatus==="completed"?"Completed":item.radiologyBookingStatus==="in_progress"?"In Progress":"Booked"):sample?.collectedAt?"Sample collected":"Awaiting sample"}</span></td><td className="whitespace-nowrap px-4 py-3 text-right font-medium">{money(item.testSnapshot.amount)}</td></tr>;
   })}</tbody><tfoot><tr className="border-t"><th colSpan={3} className="px-4 py-3">Total test fee</th><td className="whitespace-nowrap px-4 py-3 text-right font-semibold">{money(order.items.reduce((sum,item)=>sum+Math.round(Number(item.testSnapshot.amount||0)*100),0)/100)}</td></tr></tfoot></table></div></section>
   {order.notes&&<section className="rounded-xl border p-4"><h3 className="text-sm font-semibold">Booking notes</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{order.notes}</p></section>}
  </>}
  <div className="flex justify-end"><Button variant="outline" onClick={onClose}>Close</Button></div>
 </div></Modal>;
}
