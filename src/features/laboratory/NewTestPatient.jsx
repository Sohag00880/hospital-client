"use client";
import {useEffect,useRef,useState} from "react";
import {Input} from "@/components/ui/Input";
import {Select} from "@/components/ui/Select";
import {Textarea} from "@/components/ui/Textarea";
import {Button} from "@/components/ui/Button";
import {BookingAddress} from "@/features/locations/BookingAddress";
import {useFindPatientDuplicatesMutation} from "@/features/patients/patientsApi";
import {LabField,LabError} from "./LabUI";
export const emptyTestPatient=()=>({firstName:"",lastName:"",phone:"",ageYears:"",sex:"",address:{districtId:"",upazilaId:"",unionId:"",village:""},duplicateOverrideReason:""});
export function NewTestPatient({value,onChange,onUseExisting,onValidation,serverCandidates=[]}){
 const [find]=useFindPatientDuplicatesMutation(),[candidates,setCandidates]=useState([]),[checking,setChecking]=useState(false),[error,setError]=useState(null),[retry,setRetry]=useState(0),generation=useRef(0);
 const phoneDigits=value.phone.replace(/[^\d\u09e6-\u09ef]/g,"").length;
 const phoneReady=/^[+\d\s().\-\u09e6-\u09ef]+$/.test(value.phone)&&phoneDigits>=7&&phoneDigits<=20;
 useEffect(()=>{
  const sequence=++generation.current;setCandidates([]);setError(null);
  if(!phoneReady){setChecking(false);return;}
  setChecking(true);let pending;
  const timer=setTimeout(async()=>{try{pending=find({firstName:value.firstName,lastName:value.lastName,phone:value.phone});const response=await pending.unwrap();if(generation.current===sequence)setCandidates(response.data||[]);}catch(e){if(generation.current===sequence)setError(e);}finally{if(generation.current===sequence)setChecking(false);}},400);
  return ()=>{clearTimeout(timer);pending?.abort();};
 },[value.phone,value.firstName,value.lastName,phoneReady,find,retry]);
 const matches=candidates.length?candidates:serverCandidates;
 const valid=Boolean(value.firstName.trim()&&phoneReady&&value.ageYears!==""&&Number.isInteger(Number(value.ageYears))&&Number(value.ageYears)>=0&&Number(value.ageYears)<=130&&value.sex&&value.address.districtId&&value.address.upazilaId&&value.address.unionId&&!checking&&!error&&(!matches.length||value.duplicateOverrideReason.trim().length>=10));
 useEffect(()=>onValidation(valid),[valid,onValidation]);
 const change=(key,input)=>onChange({...value,[key]:input});
 return <div className="space-y-5"><p className="rounded-lg border p-3 text-sm text-muted-foreground">Register a patient and book tests together. A permanent Patient ID / MRN will be generated on booking.</p><div className="grid gap-4 sm:grid-cols-2"><LabField label="First name" required maxLength={100} value={value.firstName} onChange={e=>change("firstName",e.target.value)}/><LabField label="Last name (optional)" maxLength={100} value={value.lastName} onChange={e=>change("lastName",e.target.value)}/><LabField label="Phone" type="tel" required maxLength={30} placeholder="Patient or guardian phone" value={value.phone} onChange={e=>change("phone",e.target.value)}/><LabField label="Age (years)">{id=><Input id={id} type="number" min="0" max="130" step="1" required value={value.ageYears} onChange={e=>change("ageYears",e.target.value)}/>}</LabField><LabField label="Gender">{id=><Select id={id} required value={value.sex} onChange={e=>change("sex",e.target.value)}><option value="">Choose gender</option>{["male","female","other","unknown"].map(v=><option value={v} key={v}>{v[0].toUpperCase()+v.slice(1)}</option>)}</Select>}</LabField></div>
 {value.phone&&!phoneReady&&<p className="text-sm text-destructive">Enter a valid phone number with 7–20 digits.</p>}
 {checking&&<p role="status" className="text-sm text-muted-foreground">Checking for matching patients…</p>}<LabError error={error}/>{error&&<Button variant="outline" onClick={()=>setRetry(v=>v+1)}>Retry duplicate check</Button>}
 {matches.length>0&&<section aria-label="Possible matching patients" className="space-y-3 rounded-xl border border-amber-400 p-4"><h3 className="font-semibold">This phone is already registered</h3><p className="text-sm text-muted-foreground">Use the existing patient if the details match. A shared family phone can belong to a different patient.</p><ul className="divide-y">{matches.map(row=><li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold">{row.firstName} {row.lastName}</p><p className="mt-1 text-xs text-muted-foreground">{row.mrn} · {row.phone} · {row.sex}</p></div><Button size="sm" variant="outline" onClick={()=>onUseExisting(row)}>Use patient {row.mrn}</Button></li>)}</ul><LabField label="Reason for creating a different patient">{id=><Textarea id={id} required minLength={10} maxLength={500} rows={2} placeholder="For example: a different family member using the same phone" value={value.duplicateOverrideReason} onChange={e=>change("duplicateOverrideReason",e.target.value)}/>}</LabField></section>}
 <BookingAddress value={value.address} onChange={address=>change("address",address)}/></div>;
}
