"use client";
import {useEffect,useState} from "react";
import {Select} from "@/components/ui/Select";
import {Button} from "@/components/ui/Button";
import {usePatientAppointmentHistoryQuery} from "@/features/appointments/appointmentsApi";
import {LabError,LabField} from "./LabUI";
export const bookingSourceLabel=value=>({walk_in:"Direct / Walk-in",appointment:"Doctor Appointment",legacy:"Earlier booking"}[value]||"Earlier booking");
export function TestBookingSource({source,onSource,appointmentId,onAppointment,patient,canViewAppointments,onReady}){
 const [page,setPage]=useState(1),[initialized,setInitialized]=useState(false);
 const query=usePatientAppointmentHistoryQuery({patient:patient?.mrn,page,pageSize:50},{skip:!patient||!canViewAppointments||(initialized&&source!=="appointment"),refetchOnMountOrArgChange:true}),data=query.currentData?.data;
 const rows=(data?.items||[]).filter(row=>!["cancelled","refunded"].includes(row.status));
 useEffect(()=>{
  if(!patient||!canViewAppointments){onReady(true);return;}
  if(initialized||query.isFetching||query.isError||!data)return;
  const eligible=(data.items||[]).find(row=>!["cancelled","refunded"].includes(row.status));
  if(!eligible&&page*50<data.total){setPage(value=>value+1);return;}
  setInitialized(true);
  if(eligible){onSource("appointment");onAppointment(eligible.id);}
  onReady(true);
 },[patient,canViewAppointments,initialized,query.isFetching,query.isError,data,page,onSource,onAppointment,onReady]);
 return <section aria-label="Booking source" className="space-y-4 rounded-2xl border bg-card p-5 sm:p-6"><h2 className="text-lg font-semibold">Booking source</h2><LabField label="Patient visit type">{id=><Select id={id} value={source} onChange={e=>{setInitialized(true);onReady(true);setPage(1);onSource(e.target.value);}}><option value="walk_in">Direct / Walk-in</option>{canViewAppointments&&patient&&<option value="appointment">Doctor Appointment</option>}</Select>}</LabField>{patient&&canViewAppointments&&!initialized&&query.isFetching&&<p role="status" className="text-sm text-muted-foreground">Checking patient appointments…</p>}{patient&&canViewAppointments&&!initialized&&query.isError&&<div className="space-y-3"><LabError error={query.error}/><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={query.refetch}>Retry appointment check</Button><Button variant="outline" size="sm" onClick={()=>{setInitialized(true);onSource("walk_in");onReady(true);}}>Continue as Direct / Walk-in</Button></div></div>}{source==="walk_in"&&<p className="text-sm text-muted-foreground">For patients visiting directly for tests. No doctor appointment is required.</p>}{source==="appointment"&&<><LabError error={query.error}/><LabField label="Doctor appointment">{id=><Select id={id} required disabled={query.isFetching||query.isError} value={appointmentId} onChange={e=>onAppointment(e.target.value)}><option value="">{query.isFetching?"Loading appointments…":"Select doctor appointment"}</option>{rows.map(row=><option key={row.id} value={row.id}>{row.date} · {row.doctorName} · {row.status.replaceAll("_"," ")}</option>)}</Select>}</LabField>{!query.isFetching&&!rows.length&&<p className="text-sm text-muted-foreground">No eligible appointments on this page. Use Direct / Walk-in for a test-only visit.</p>}{data?.total>50&&<div className="flex justify-between gap-2"><Button variant="outline" size="sm" disabled={page===1||query.isFetching} onClick={()=>{setPage(p=>p-1);onAppointment("");}}>Previous</Button><Button variant="outline" size="sm" disabled={page*50>=data.total||query.isFetching} onClick={()=>{setPage(p=>p+1);onAppointment("");}}>Next</Button></div>}</>}</section>;
}
