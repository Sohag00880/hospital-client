"use client";
import Link from "next/link";
import {useRouter,useSearchParams} from "next/navigation";
import {useAppSelector} from "@/store/hooks";
import {ErrorBox} from "@/features/inpatient/InpatientUI";
import {PatientChargeEditor} from "./IpdCharges";
import {useIpdAccountQuery,useIpdChargeCatalogQuery} from "./ipdApi";

export function IpdChargeEditorPage(){
 const router=useRouter(),params=useSearchParams(),id=params.get("admission")||"";
 const permissions=useAppSelector(s=>s.auth.permissions),allowed=["billing.view","billing.create","inpatient.view"].every(p=>permissions.includes(p)),canEdit=permissions.includes("billing.approve");
 const account=useIpdAccountQuery(id,{skip:!allowed||!id,refetchOnMountOrArgChange:true}),catalog=useIpdChargeCatalogQuery(undefined,{skip:!allowed||!id,refetchOnMountOrArgChange:true});
 const data=account.currentData?.data,back=`/billing/ipd/services${id?`?admission=${id}`:""}`;
 if(!allowed)return <ErrorBox error="You do not have permission to edit patient charges."/>;
 return <div className="space-y-6">
  <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold">Add / edit charges</h1>{data&&<p className="mt-2 text-sm text-muted-foreground">{data.admission.patientName} · {data.admission.admissionNumber} · MRN {data.admission.mrn}</p>}</div><Link href={back} className="rounded-lg border px-4 py-2 text-sm font-medium">Back to patient bill</Link></header>
  {!id?<ErrorBox error="Choose a patient bill before adding charges."/>:account.error||catalog.error?<ErrorBox error={account.error||catalog.error}/>:account.isFetching||catalog.isFetching||!data?<p role="status">Loading patient charges…</p>:data.account.closedAt||data.admission.status==="discharged"?<ErrorBox error="This bill is closed. Charges cannot be edited."/>:data.account.finalizedAt&&!canEdit?<ErrorBox error="Approval permission is required to edit finalized charges."/>:<PatientChargeEditor key={id} data={data} catalog={catalog.currentData?.data||[]} canEdit={canEdit} onClose={()=>router.push(back)} onSaved={()=>router.push(back)}/>}
 </div>;
}
