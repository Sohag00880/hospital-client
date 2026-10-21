"use client";
import {bangladeshDate} from "@/lib/time";
import {useEffect,useId,useRef,useState} from "react";
import {ReferencePicker} from "@/features/references/ReferencePicker";
import {useBookingReferencesQuery} from "@/features/references/referencesApi";
import {BookingAddress} from "@/features/locations/BookingAddress";
import {Button} from "@/components/ui/Button";
import {Input} from "@/components/ui/Input";
import {Select} from "@/components/ui/Select";
import {useAppointmentDoctorsQuery,useReceptionLookupMutation,useReceptionBookingMutation,queryOptions} from "./appointmentsApi";
function Field({label,children}) {const id=useId();return <div className="space-y-1.5 text-sm font-medium"><label className="block" htmlFor={id}>{label}</label>{children(id)}</div>;}
const empty={name:"",age:"",gender:""};
const emptyAddress={districtId:"",upazilaId:"",unionId:"",village:""};
export function ReceptionBooking({date:initialDate,doctorId:initialDoctor,onClose,onSaved}) {
 const [date,setDate]=useState(initialDate || bangladeshDate()),[doctorId,setDoctor]=useState(initialDoctor || ""),[phone,setPhone]=useState("");
 const [address,setAddress]=useState(emptyAddress),[createNewPatient,setCreateNewPatient]=useState(false);
 const [values,setValues]=useState(empty),[matches,setMatches]=useState([]),[patientId,setPatient]=useState(""),[checked,setChecked]=useState(""),[checking,setChecking]=useState(false),[error,setError]=useState(null);
 const [reference,setReference]=useState(undefined),[referencePending,setReferencePending]=useState(false);
 const references=useBookingReferencesQuery({search:"",pageSize:20},{refetchOnMountOrArgChange:true});
 useEffect(()=>{if(reference===undefined && references.currentData?.data)setReference(references.currentData.data.defaultReference || null);},[reference,references.currentData]);
 const doctors=useAppointmentDoctorsQuery({date},{...queryOptions,skip:!date});
 const [lookup]=useReceptionLookupMutation(),[book,booking]=useReceptionBookingMutation();
 const requestKey=useRef(null),generation=useRef(0),key=`${date}:${doctorId}:${phone}`;
 const choose=p=>{setCreateNewPatient(false);setPatient(p.id);setValues({name:p.name,age:p.age ?? "",gender:p.gender});setAddress(p.address?.district?.id&&p.address?.upazila?.id&&p.address?.union?.id?{districtId:p.address.district.id,upazilaId:p.address.upazila.id,unionId:p.address.union.id,village:p.address.village||""}:emptyAddress);requestKey.current=null;};
 useEffect(()=>{
  const sequence=++generation.current;setCreateNewPatient(false);setChecked("");setMatches([]);setPatient("");setValues(empty);setAddress(emptyAddress);setError(null);requestKey.current=null;
  if(!doctorId || phone.replace(/[^0-9\u09e6-\u09ef]/g,"").length<7){setChecking(false);return;}
  setChecking(true);let pending;
  const timer=setTimeout(async()=>{try{pending=lookup({date,doctorId,phone});const result=await pending.unwrap();if(generation.current!==sequence)return;const list=result.data || [];setMatches(list);setChecked(key);if(list.length===1)choose(list[0]);}catch(e){if(generation.current===sequence)setError(e);}finally{if(generation.current===sequence)setChecking(false);}},450);
  return ()=>{clearTimeout(timer);pending?.abort();};
 },[date,doctorId,phone,key,lookup]);
 const rows=!date || doctors.isFetching || doctors.isError?[]:doctors.currentData?.data || [], available=rows.some(r=>r.id===doctorId),existing=!!patientId,followUp=!!patientId && (matches.find(p=>p.id===patientId)?.visitType || "new")==="follow_up";
 const selectedDoctor=rows.find(r=>r.id===doctorId),amount=Number((followUp ? selectedDoctor?.followUpFee : selectedDoctor?.newVisitFee) ?? 0).toFixed(2);
 useEffect(()=>{requestKey.current=null;},[reference?.id]);
 const change=(field,value)=>{setValues(v=>({...v,[field]:value}));requestKey.current=null;};
 const addressReady=Boolean(address.districtId&&address.upazilaId&&address.unionId);
 const submit=async e=>{e.preventDefault();setError(null);if(checked!==key || checking || !available || reference===undefined || referencePending || references.isError || !addressReady)return;if(matches.length && !patientId && !createNewPatient)return;
  try{if(!requestKey.current)requestKey.current=crypto.randomUUID();const result=await book({bookingKey:requestKey.current,referenceId:reference?.id || null,date,doctorId,phone,name:values.name,age:Number(values.age),gender:values.gender,visitType:followUp?"follow_up":"new",expectedAmount:Number(amount),address,...(createNewPatient?{createNewPatient:true}:{}),...(patientId?{patientId}:{})}).unwrap();onSaved(result.data);}catch(e){setError(e);}
 };
 const message=typeof error==="string"?error:error?.data?.error?.message || (error ? "Unable to complete this request. Please retry." : "");
 return <form onSubmit={submit} className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
  <p className="text-sm text-muted-foreground">Choose a doctor and enter the patient phone number to find an existing patient or book a new patient.</p>
  {message && <p role="alert" className="rounded-lg border border-destructive p-3 text-sm text-destructive">{message}</p>}
  <div className="grid gap-4 sm:grid-cols-2"><Field label="Appointment date (Bangladesh time)">{id=><Input id={id} required type="date" min={bangladeshDate()} disabled={booking.isLoading} value={date} onChange={e=>{setDate(e.target.value);setDoctor("");}}/>}</Field><Field label="Doctor name">{id=><Select id={id} required value={available?doctorId:""} disabled={!date || doctors.isFetching || doctors.isError || booking.isLoading} onChange={e=>setDoctor(e.target.value)}><option value="">{doctors.isFetching?"Loading available doctors…":"Choose available doctor"}</option>{rows.map(r=><option key={r.id} value={r.id}>{r.fullName}</option>)}</Select>}</Field></div>
  {doctors.isError && <p role="alert" className="text-sm text-destructive">Doctors could not be loaded.</p>}
  {date && !doctors.isFetching && !doctors.isError && !rows.length && <p className="rounded-lg bg-muted p-3 text-sm">No doctors are available on this date. Choose another date.</p>}
  <ReferencePicker value={reference} onChange={setReference} onPending={setReferencePending} disabled={booking.isLoading || references.isLoading} />
  {references.isError && <p role="alert" className="text-sm text-destructive">Reference options could not be loaded. Reopen the booking form to try again.</p>}
  <Field label="Phone number">{id=><Input id={id} required type="tel" maxLength={30} disabled={!available || booking.isLoading} placeholder="Enter patient phone number" value={phone} onChange={e=>setPhone(e.target.value)}/>}</Field>
  {checking && <p role="status" className="text-sm text-muted-foreground">Looking up existing patients and recent appointments...</p>}
  {checked===key && <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
   {matches.length>0 && !createNewPatient && <Field label="Choose patient with this phone">{id=><Select id={id} required disabled={booking.isLoading} value={patientId} onChange={e=>{const person=matches.find(p=>p.id===e.target.value);if(person)choose(person);}}><option value="">Select the correct patient</option>{matches.map(p=><option key={p.id} value={p.id}>{p.name} - {p.mrn} - {p.age??"Unknown"} years - {p.gender}</option>)}</Select>}</Field>}
   {matches.length>0 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background p-3">{createNewPatient?<><p className="text-sm font-medium">New patient (same phone number)</p><Button variant="outline" size="sm" disabled={booking.isLoading} onClick={()=>{requestKey.current=null;setCreateNewPatient(false);setValues(empty);setAddress(emptyAddress);setError(null);if(matches.length===1)choose(matches[0]);}}>Choose existing patient</Button></>:<><p className="text-sm text-muted-foreground">Booking for someone else using this number?</p><Button variant="outline" size="sm" disabled={booking.isLoading} onClick={()=>{setCreateNewPatient(true);setPatient("");setValues(empty);setAddress(emptyAddress);setError(null);requestKey.current=null;}}>Add new patient with this number</Button></>}</div>}
   <Field label="Visit type">{id=><Input id={id} readOnly value={followUp?"Follow-up":"New"}/>}</Field>
   {(createNewPatient || existing || matches.length>0) && <p className="text-xs text-muted-foreground">{createNewPatient ? "Enter the new patient details. A separate patient ID will be created with this phone number." : followUp ? "Recent appointment found for this doctor. Existing patient details have been filled automatically." : existing ? "Existing patient found. This is a new visit for this doctor; the same patient record will be used." : matches.length ? "Select the patient to fill details." : ""}</p>}
   <Field label="Amount">{id=><Input id={id} readOnly value={matches.length>1 && !patientId && !createNewPatient ? "" : amount}/>}</Field>
   <Field label="Patient name">{id=><Input id={id} required maxLength={100} readOnly={existing} value={values.name} onChange={e=>change("name",e.target.value)}/>}</Field>
   <div className="grid gap-4 sm:grid-cols-2"><Field label="Age (years)">{id=><Input id={id} required type="number" min="0" max="130" readOnly={existing && matches.find(p=>p.id===patientId)?.age !== null} value={values.age} onChange={e=>change("age",e.target.value)}/>}</Field><Field label="Gender">{id=><Select id={id} required disabled={existing} value={values.gender} onChange={e=>change("gender",e.target.value)}><option value="">Select gender</option>{["male","female","other","unknown"].map(v=><option key={v} value={v}>{v[0].toUpperCase()+v.slice(1)}</option>)}</Select>}</Field></div>
  </div>}
  {checked===key&&(!matches.length||patientId||createNewPatient)&&<BookingAddress value={address} disabled={booking.isLoading} onChange={value=>{setAddress(value);requestKey.current=null;}}/>}
  <div className="flex justify-end gap-2 border-t border-border pt-5"><Button variant="outline" disabled={booking.isLoading} onClick={onClose}>Cancel</Button><Button type="submit" disabled={booking.isLoading || checking || reference===undefined || referencePending || references.isError || checked!==key || !available || !addressReady || !!matches.length && !patientId && !createNewPatient}>{booking.isLoading?"Booking...":"Book appointment"}</Button></div>
 </form>;
}
