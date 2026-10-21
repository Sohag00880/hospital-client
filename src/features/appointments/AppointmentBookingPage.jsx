"use client";
import {useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {CheckCircle2} from "lucide-react";
import {useAppSelector} from "@/store/hooks";
import {PageHeader} from "@/components/layout/PageHeader";
import {Button} from "@/components/ui/Button";
import {ReceptionBooking} from "./ReceptionBooking";
export function AppointmentBookingPage({initialDate,initialDoctor}){
 const router=useRouter(),permissions=useAppSelector(s=>s.auth.permissions),[saved,setSaved]=useState(null),[version,setVersion]=useState(0);
 if(!["appointment.view","appointment.create","patient.view"].every(permission=>permissions.includes(permission)))return <p role="alert">You do not have permission to book appointments.</p>;
 return <div className="mx-auto max-w-5xl space-y-5"><PageHeader title="Book a Appointment" actions={<Link href="/appointments" className="text-sm font-medium text-primary hover:underline">All appointments</Link>}/>
  {saved?<section className="space-y-4 rounded-xl border border-emerald-500/30 bg-card p-6" aria-label="Booking confirmation"><div role="status" className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"/><div><h2 className="font-semibold">Appointment booked</h2><p className="mt-1 text-sm text-muted-foreground">Pending confirmation. Estimated serial: {saved.estimatedSerialNumber ?? "—"}.</p></div></div><div className="flex flex-wrap gap-3"><Button onClick={()=>{setSaved(null);setVersion(v=>v+1);}}>Book another appointment</Button><Link href="/appointments" className="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-muted">View appointments</Link></div></section>:<ReceptionBooking key={version} date={initialDate} doctorId={initialDoctor} onClose={()=>router.push("/appointments")} onSaved={setSaved}/>}
 </div>;
}
