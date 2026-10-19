"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { bangladeshDate } from "@/lib/time";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { useAppointmentReferencesQuery, useBookingDoctorsQuery, useBookingUsersQuery, useAppointmentsQuery, queryOptions } from "./appointmentsApi";
import { BookingDetails } from "./BookingDetails";

const formatAmount = value => Number(value || 0).toLocaleString("en-BD",{minimumFractionDigits:2,maximumFractionDigits:2});
export function AppointmentBookingReport({byReference=false}) {
  const money = value => `${byReference ? "" : "BDT "}${formatAmount(value)}`;
  const permissions=useAppSelector(s=>s.auth.permissions), allowed=permissions.includes("appointment.view");
  const [patientFilter,setPatientFilter]=useState("all");
  const [date,setDate]=useState(""),[ownerId,setOwnerId]=useState(""),[doctorId,setDoctorId]=useState(""),[page,setPage]=useState(1),[dialog,setDialog]=useState(null);
  useEffect(()=>setDate(bangladeshDate()),[]);
  const users=useBookingUsersQuery({date},{...queryOptions,skip:byReference || !allowed || !date});
  const references=useAppointmentReferencesQuery({date},{...queryOptions,skip:!byReference || !allowed || !date});
  const owners=byReference ? references : users;
  const options=(owners.currentData?.data || []).map(owner=>byReference ? {...owner,fullName:owner.code ? `${owner.name} (${owner.code})` : owner.name} : owner);
  const validOwner=options.some(user=>user.id===ownerId) && !owners.isError;
  const ownerFilter=byReference ? {referenceId:ownerId} : {createdBy:ownerId};
  const doctors=useBookingDoctorsQuery({date,...ownerFilter},{...queryOptions,skip:!allowed || !date || !validOwner});
  const doctorOptions=doctors.currentData?.data || [];
  const validDoctor=!doctorId || !doctors.isError && doctorOptions.some(doctor=>doctor.id===doctorId);
  const records=useAppointmentsQuery({date,...ownerFilter,doctorId:doctorId || undefined,patientFilter:byReference?patientFilter:undefined,page,pageSize:20},{...queryOptions,skip:!allowed || !date || !validOwner || !validDoctor});
  const data=validOwner && validDoctor && !doctors.isError && !records.isError ? records.currentData?.data : null;
  const amounts=data?.amounts || {}, total=Object.values(amounts).reduce((sum,item)=>sum+Number(item.amount || 0),0);
  const columns=[
    {key:"serial",header:"Serial",accessor:row=><span>{row.serialNumber ?? row.estimatedSerialNumber ?? "-"}{row.status === "pending" && <span className="block text-xs text-muted-foreground">Estimated</span>}</span>},
    {key:"patient",header:"Patient",accessor:row=><div><p className="font-medium">{row.patientName}</p><p className="text-xs text-muted-foreground">{row.mrn}</p></div>},
    {key:"phone",header:"Phone",accessor:row=>row.phone || "-"},
    {key:"doctor",header:"Doctor",accessor:row=>row.doctorName},
    {key:"visit",header:"Visit type",accessor:row=>row.visitType==="follow_up" ? "Follow-up" : "New"},
    {key:"amount",header:"Amount",accessor:row=>money(row.amount)},
    ...(byReference&&permissions.includes("billing.view")?[
      {key:"tests",header:"Test amount",accessor:row=>row.pcBill?money(row.pcBill.testAmount):"-"},
      {key:"collected",header:"Test collected",accessor:row=>row.pcBill?money(row.pcBill.collected):"-"},
      {key:"hospital",header:"Hospital share",accessor:row=>row.pcBill?(row.pcBill.unconfiguredOrders?"Not configured":money(row.pcBill.hospitalShare)):"-"},
      {key:"pcBill",header:"PC Bill",accessor:row=>row.pcBill?<span className="font-semibold text-emerald-700 dark:text-emerald-400">{money(row.pcBill.pcBill)}</span>:"-"},
    ]:[]),
    ...(!byReference?[{key:"reference",header:"Reference By",accessor:row=>row.referenceName || "-"}]:[]),
    {key:"creator",header:"Created By",accessor:row=>row.createdByName || "-"},
    {key:"status",header:"Status",accessor:row=><span className="capitalize">{row.status.replaceAll("_"," ")}</span>},
    {key:"actions",header:"Actions",accessor:row=><div className="flex gap-2"><Button size="sm" variant="outline" onClick={()=>setDialog({type:"view",row})}>View</Button></div>},
  ];
  if(!allowed)return <p role="alert">You do not have permission to view appointments.</p>;
  const failure=owners.isError || (validOwner && (doctors.isError || records.isError));
  return <div className="space-y-5">
    <PageHeader title={byReference ? "By Reference" : "By Users"} description={byReference ? undefined : "Select an appointment date and booking user to view their patients and amounts."} />
    <Card><div className="grid gap-4 sm:grid-cols-3"><div className="space-y-2"><label htmlFor="booking-user-date" className="text-sm font-medium">Appointment date</label><Input id="booking-user-date" type="date" value={date} onClick={event=>{try{event.currentTarget.showPicker?.();}catch{}}} onChange={event=>{setDate(event.target.value);setOwnerId("");setDoctorId("");setPage(1);setDialog(null);}} /></div><div className="space-y-2"><label htmlFor="booking-user" className="text-sm font-medium">{byReference ? "Reference" : "Booked by user"}</label><Select id="booking-user" value={validOwner?ownerId:""} disabled={!date || owners.isFetching || owners.isError || !options.length} onChange={event=>{setOwnerId(event.target.value);setDoctorId("");setPage(1);setDialog(null);}}><option value="">{owners.isFetching?"Loading...":byReference ? "Select a reference" : "Select a user"}</option>{options.map(user=><option key={user.id} value={user.id}>{user.fullName} ({user.count})</option>)}</Select></div><div className="space-y-2"><label htmlFor="booking-user-doctor" className="text-sm font-medium">Doctor</label><Select id="booking-user-doctor" value={validDoctor?doctorId:""} disabled={!validOwner || doctors.isFetching || doctors.isError || !doctorOptions.length} onChange={event=>{setDoctorId(event.target.value);setPage(1);setDialog(null);}}><option value="">All doctors</option>{doctorOptions.map(doctor=><option key={doctor.id} value={doctor.id}>{doctor.fullName} ({doctor.count})</option>)}</Select></div>{byReference && <div className="space-y-2"><label htmlFor="reference-patients" className="text-sm font-medium">Patients</label><Select id="reference-patients" value={patientFilter} onChange={event=>{setPatientFilter(event.target.value);setPage(1);setDialog(null);}}><option value="all">All patients</option><option value="test_orders">Test Orders</option></Select></div>}</div></Card>
    {failure && <p role="alert" className="text-sm text-destructive">Appointments could not be loaded. Reopen this page to try again.</p>}
    {!date ? <p className="text-sm text-muted-foreground">Choose an appointment date.</p> : !owners.isFetching && !owners.isError && !options.length ? <Card>{byReference ? "No reference appointments for this date." : "No users booked appointments for this date."}</Card> : !validOwner && !owners.isFetching && !owners.isError ? <Card>{byReference ? "Select a reference to view appointments." : "Select a booking user to view appointments."}</Card> : null}
    {validOwner && <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label={byReference ? "Reference appointment totals" : "User appointment totals"}>{[
        ["Appointments",data?.total ?? 0],
        ["Total amount",money(total)],
        ["Completed amount",money(amounts.completed?.amount)],
        ["Refund amount",money(amounts.refunded?.amount)],
        ["Cancelled amount",money(amounts.cancelled?.amount)],
      ].map(([label,value])=><Card key={label}><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{records.isFetching || records.isError || doctors.isFetching || doctors.isError || !validDoctor?"—":value}</p></Card>)}</div>
      {byReference&&permissions.includes("billing.view")&&data?.pcSummary&&<section className="space-y-3" aria-label="PC Bill totals"><h2 className="font-semibold">Reference PC Bill</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["Test amount",data.pcSummary.testAmount],["Test collected",data.pcSummary.collected],["Hospital share",data.pcSummary.hospitalShare],["PC Bill",data.pcSummary.pcBill]].map(([title,value])=><Card key={title}><p className="text-sm text-muted-foreground">{title}</p><p className={`mt-2 text-xl font-semibold ${title==="PC Bill"?"text-emerald-700 dark:text-emerald-400":""}`}>{records.isFetching?"-":money(value)}</p></Card>)}</div>{data.pcSummary.unconfiguredOrders>0&&<p role="alert" className="text-sm text-amber-700">Hospital share is not configured for {data.pcSummary.unconfiguredOrders} test order(s). Set the percentage in Settings ? Configure ? PC Bill.</p>}</section>}
      {!records.isError && !doctors.isError && validDoctor && <DataTable columns={columns} rows={data?.items || []} rowKey={row=>row.id} loading={records.isFetching} emptyTitle="No appointments" />}
      {data && <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{data.total} appointments · Page {page}</p><div className="flex gap-2"><Button variant="outline" aria-label="Previous page" disabled={page===1 || records.isFetching} onClick={()=>setPage(value=>value-1)}><ArrowLeft className="h-4 w-4" /></Button><Button variant="outline" aria-label="Next page" disabled={page*20>=data.total || records.isFetching} onClick={()=>setPage(value=>value+1)}><ArrowRight className="h-4 w-4" /></Button></div></div>}
    </>}
    {dialog?.type==="view" && <BookingDetails row={dialog.row} age={dialog.row.ageYears ?? "Not recorded"} canViewProfile={permissions.includes("patient.view")} onClose={()=>setDialog(null)} />}
  </div>;
}
