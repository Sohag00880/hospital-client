"use client";
import {useEffect,useId,useState} from "react";
import Link from "next/link";
import {ArrowLeft,ArrowRight,CalendarClock,CalendarDays,Clock3,Search,UserRound,XCircle} from "lucide-react";
import {useAppSelector} from "@/store/hooks";
import {PageHeader} from "@/components/layout/PageHeader";
import {Button} from "@/components/ui/Button";
import {Input} from "@/components/ui/Input";
import {Select} from "@/components/ui/Select";
import {Textarea} from "@/components/ui/Textarea";
import {Modal} from "@/components/ui/Modal";
import {bangladeshDate,bangladeshTime} from "@/lib/time";
import {formatAddress} from "@/lib/address";
import {usePatientAppointmentsQuery,useAppointmentDoctorsQuery,useDoctorSchedulesQuery,useAppointmentActionMutation,queryOptions} from "./appointmentsApi";

const dayLabel=value=>new Intl.DateTimeFormat("en-GB",{timeZone:"UTC",day:"numeric",month:"short",year:"numeric"}).format(new Date(`${value}T00:00:00Z`));
const statusLabel=value=>({booked:"Confirmed",in_consultation:"In consultation"}[value] || value[0].toUpperCase()+value.slice(1));
const statusColor=value=>({pending:"border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",cancelled:"border-destructive/20 bg-destructive/5 text-destructive",completed:"border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"}[value] || "border-border bg-muted text-foreground");
const failure=error=>typeof error==="string"?error:error?.data?.error?.message || "Unable to complete the request. Please try again.";
function ErrorMessage({error}){return error?<p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{failure(error)}</p>:null;}
function Field({label,children}){const id=useId();return <div className="space-y-1.5"><label htmlFor={id} className="block text-sm font-medium">{label}</label>{children(id)}</div>;}
const sessionTime=row=>{const format=minute=>`${String(Math.floor(minute%1440/60)).padStart(2,"0")}:${String(minute%60).padStart(2,"0")}`;const offset=row.timeZone==="UTC"?360:0;return `${format(row.startMinute+offset)} – ${format(row.endMinute+offset)}`;};

export function AppointmentManagement(){
 const permissions=useAppSelector(s=>s.auth.permissions),allowed=["appointment.view","appointment.update","patient.view"].every(p=>permissions.includes(p));
 const [input,setInput]=useState(""),[patient,setPatient]=useState(""),[page,setPage]=useState(1),[dialog,setDialog]=useState(null),[notice,setNotice]=useState("");
 const query=usePatientAppointmentsQuery({patient,page},{...queryOptions,skip:!allowed||!patient}),data=query.currentData?.data;
 if(!allowed)return <ErrorMessage error="You do not have permission to manage appointments."/>;
 const clear=()=>{setInput("");setPatient("");setPage(1);setDialog(null);setNotice("");};
 return <div className="mx-auto max-w-6xl space-y-5"><PageHeader title="Reschedule & Cancellation" description="Find a patient and manage their pending appointments." actions={<Link href="/appointments" className="text-sm font-medium text-primary hover:underline">All appointments</Link>}/>
  <form className="rounded-xl border border-border bg-card p-5" onSubmit={e=>{e.preventDefault();const value=input.trim();if(!value)return;setNotice("");setDialog(null);if(value===patient&&page===1)query.refetch();setPatient(value);setPage(1);}}>
   <div className="flex flex-wrap items-end gap-3"><div className="min-w-48 flex-1"><Field label="Patient ID / MRN">{id=><Input id={id} required maxLength={100} autoComplete="off" placeholder="Enter patient ID or MRN" value={input} onChange={e=>setInput(e.target.value)}/>}</Field></div><Button type="submit" className="bg-blue-700 text-white hover:bg-blue-800" disabled={!input.trim()||query.isFetching}><Search className="mr-2 h-4 w-4"/>{query.isFetching?"Searching…":"Search patient"}</Button>{(patient||input)&&<Button variant="outline" disabled={query.isFetching} onClick={clear}>Clear</Button>}</div>
  </form>
  {notice&&<p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-400">{notice}</p>}
  {patient&&<ErrorMessage error={query.error}/>}
  {!patient?<div className="rounded-xl border border-dashed border-border px-6 py-14 text-center"><CalendarClock className="mx-auto mb-4 h-9 w-9 text-primary/60"/><h2 className="font-semibold">Find an appointment</h2><p className="mt-2 text-sm text-muted-foreground">Search by Patient ID or MRN to get started.</p></div>:query.isFetching?<div role="status" className="rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">Loading patient appointments…</div>:data&&!query.error?<>
   {!data.patient?<div className="rounded-xl border border-dashed border-border p-10 text-center"><h2 className="font-semibold">No patient found</h2><p className="mt-2 text-sm text-muted-foreground">Check the Patient ID or MRN and search again.</p></div>:<>
    <section aria-label="Patient details" className="flex flex-wrap items-center justify-between gap-5 rounded-xl border border-border bg-card p-5"><div className="flex items-center gap-3"><div className="rounded-xl bg-primary/10 p-3 text-primary"><UserRound className="h-6 w-6"/></div><div><h2 className="text-lg font-semibold">{data.patient.name}</h2><p className="mt-1 text-sm text-muted-foreground">Patient ID: <span className="font-mono text-foreground">{data.patient.mrn}</span>{data.patient.phone?` · ${data.patient.phone}`:""}</p></div></div><dl className="flex gap-6 text-center">{[["Appointments",data.total],["Pending",data.pending],["Cancelled",data.cancelled]].map(([label,value])=><div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-xl font-semibold">{value}</dd></div>)}</dl></section>
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-semibold">Appointments</h2><p className="text-xs text-muted-foreground">Only pending appointments can be rescheduled or cancelled.</p></div>
    {!data.items.length?<p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No appointments found for this patient.</p>:<div className="space-y-3">{data.items.map((row,index)=><section key={row.id} data-appointment-id={row.id} aria-label={`Appointment ${(page-1)*data.pageSize+index+1} with ${row.doctorName} on ${row.date}`} className="rounded-xl border border-border bg-card p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-start gap-3"><div className="rounded-lg bg-muted p-2.5"><CalendarDays className="h-5 w-5 text-muted-foreground"/></div><div><h3 className="font-semibold">{row.doctorName}</h3><p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground"><span>{dayLabel(row.date)}</span>{row.startAt&&<span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5"/>{bangladeshTime(row.startAt)} BD</span>}</p></div></div><span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusColor(row.status)}`}>{statusLabel(row.status)}</span></div>
     <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><div className="space-y-1 text-xs text-muted-foreground"><p>{row.visitType==="follow_up"?"Follow-up":"New visit"} · Fee: BDT {Number(row.amount || 0).toFixed(2)} · {row.serialNumber!=null?`Serial ${row.serialNumber}`:`Estimated serial ${row.estimatedSerialNumber ?? "—"}`}</p><p className="max-w-xl break-words">{formatAddress(row.address)}</p>{row.cancellationReason&&<p>Cancellation reason: {row.cancellationReason}</p>}</div>{row.status==="pending"&&<div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={()=>setDialog({type:"reschedule",row})}><CalendarClock className="mr-1.5 h-4 w-4"/>Reschedule</Button><Button size="sm" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/5" onClick={()=>setDialog({type:"cancel",row})}><XCircle className="mr-1.5 h-4 w-4"/>Cancel appointment</Button></div>}</div>
    </section>)}</div>}
    {data.total>data.pageSize&&<div className="flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">Page {page} of {Math.ceil(data.total/data.pageSize)}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page===1} onClick={()=>setPage(p=>p-1)}><ArrowLeft className="mr-1 h-4 w-4"/>Previous</Button><Button variant="outline" size="sm" disabled={page*data.pageSize>=data.total} onClick={()=>setPage(p=>p+1)}>Next<ArrowRight className="ml-1 h-4 w-4"/></Button></div></div>}
   </>}
  </>:null}
  {dialog&&<AppointmentChangeDialog key={`${dialog.type}:${dialog.row.id}`} type={dialog.type} row={dialog.row} onClose={()=>setDialog(null)} onRefresh={()=>{setDialog(null);query.refetch();}} onSaved={saved=>{setDialog(null);setNotice(dialog.type==="cancel"?"Appointment cancelled successfully.":`Appointment rescheduled to ${dayLabel(saved.date)}. It is pending confirmation.`);}}/>}
 </div>;
}

function AppointmentChangeDialog({type,row,onClose,onSaved,onRefresh}){
 const moving=type==="reschedule",[date,setDate]=useState(row.date<bangladeshDate()?bangladeshDate():row.date),[doctorId,setDoctor]=useState(row.doctorId),[scheduleId,setSchedule]=useState(""),[reason,setReason]=useState(""),[error,setError]=useState(null);
 const doctors=useAppointmentDoctorsQuery({date},{...queryOptions,skip:!moving||!date}),doctorRows=doctors.currentData?.data || [];
 const validDoctor=!doctors.isFetching&&!doctors.isError&&doctorRows.some(r=>r.id===doctorId);
 const schedules=useDoctorSchedulesQuery({date,doctorId},{...queryOptions,skip:!moving||!date||!validDoctor});
 const available=(schedules.currentData?.data || []).filter(r=>r.status==="active"&&r.id!==row.scheduleId&&r.doctorId===doctorId&&r.date===date);
 const [save,state]=useAppointmentActionMutation();
 useEffect(()=>{
  if(!moving||schedules.isFetching||!validDoctor){setSchedule("");return;}
  const options=(schedules.currentData?.data || []).filter(r=>r.status==="active"&&r.id!==row.scheduleId&&r.doctorId===doctorId&&r.date===date);
  setSchedule(previous=>options.some(r=>r.id===previous)?previous:options.length===1?options[0].id:"");
 },[moving,schedules.currentData,schedules.isFetching,validDoctor,doctorId,date,row.scheduleId]);
 const valid=reason.trim().length>=3&&(!moving||validDoctor&&!schedules.isFetching&&!schedules.isError&&available.some(r=>r.id===scheduleId));
 return <Modal open title={moving?"Reschedule appointment":"Cancel appointment"} size={moving?"lg":"md"} onClose={state.isLoading?()=>{}:onClose}><form className="space-y-4" onSubmit={async e=>{e.preventDefault();if(!valid)return;setError(null);try{const result=await save({id:row.id,action:moving?"reschedule":"cancel",expectedRevision:row.revision,reason:reason.trim(),...(moving?{scheduleId}:{})}).unwrap();onSaved(result.data);}catch(error){setError(error);}}}>
  <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm"><p className="font-semibold">{row.patientName}</p><p className="mt-1 text-muted-foreground">{row.doctorName} · {dayLabel(row.date)}{row.startAt?` · ${bangladeshTime(row.startAt)} BD`:""}</p></div>
  <ErrorMessage error={error}/>
  <fieldset disabled={state.isLoading} className="space-y-4">
   {moving?<><div className="grid gap-4 sm:grid-cols-2"><Field label="New appointment date">{id=><Input id={id} type="date" required min={bangladeshDate()} value={date} onChange={e=>{setDate(e.target.value);setDoctor("");setSchedule("");}}/>}</Field><Field label="Doctor">{id=><Select id={id} required value={validDoctor?doctorId:""} disabled={!date||doctors.isFetching||doctors.isError} onChange={e=>{setDoctor(e.target.value);setSchedule("");}}><option value="">{doctors.isFetching?"Loading doctors…":"Select a doctor"}</option>{!doctors.isFetching&&doctorRows.map(r=><option key={r.id} value={r.id}>{r.fullName}</option>)}</Select>}</Field></div>
    <ErrorMessage error={doctors.error || schedules.error}/>
    <Field label="Visiting session">{id=><Select id={id} required disabled={!validDoctor||schedules.isFetching||schedules.isError} value={scheduleId} onChange={e=>setSchedule(e.target.value)}><option value="">{schedules.isFetching?"Loading sessions…":"Select a different session"}</option>{available.map(r=><option key={r.id} value={r.id}>{sessionTime(r)}{r.room?` · ${r.room}`:""}</option>)}</Select>}</Field>
    {validDoctor&&!schedules.isFetching&&!schedules.isError&&!available.length&&<p className="text-xs text-muted-foreground">No alternative sessions. Select another date or doctor.</p>}
    {validDoctor&&doctorId!==row.doctorId&&<p className="text-xs text-muted-foreground">The appointment fee will use the selected doctor&apos;s rate.</p>}
   </>:<p className="text-sm text-muted-foreground">This appointment will be cancelled. Its history will remain available.</p>}
   <Field label={moving?"Reason for rescheduling":"Cancellation reason"}>{id=><Textarea id={id} required minLength={3} maxLength={500} rows={3} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Enter a reason"/>}</Field>
  </fieldset>
  <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">{error?.status===409&&<Button variant="outline" disabled={state.isLoading} onClick={onRefresh}>Refresh appointments</Button>}<Button variant="outline" disabled={state.isLoading} onClick={onClose}>Go back</Button><Button type="submit" variant={moving?"primary":"destructive"} disabled={!valid||state.isLoading}>{state.isLoading?"Saving…":moving?"Save reschedule":"Confirm cancellation"}</Button></div>
 </form></Modal>;
}
