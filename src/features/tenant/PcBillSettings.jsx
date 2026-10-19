"use client";
import {useState} from "react";
import {Percent,Save} from "lucide-react";
import {useAppSelector} from "@/store/hooks";
import {Button} from "@/components/ui/Button";
import {Input} from "@/components/ui/Input";
import {useGetPcBillQuery,useUpdatePcBillMutation} from "./tenantApi";
import {ErrorBox} from "@/features/inpatient/InpatientUI";
export function PcBillSettings(){
 const permissions=useAppSelector(s=>s.auth.permissions),allowed=permissions.includes("tenant.view"),editable=permissions.includes("tenant.update");
 const query=useGetPcBillQuery(undefined,{skip:!allowed,refetchOnMountOrArgChange:true});
 const [save,state]=useUpdatePcBillMutation(),[draft,setDraft]=useState(null),[notice,setNotice]=useState(""),[error,setError]=useState(null);
 const data=query.currentData?.data,percentage=draft?.percentage??String(data?.percentage??0);
 if(!allowed)return <ErrorBox error="You do not have permission to view PC Bill settings."/>;
 return <div className="mx-auto max-w-3xl space-y-6"><div><p className="text-sm text-muted-foreground">Settings / Configure</p><h1 className="mt-2 text-2xl font-semibold">PC Bill</h1></div><ErrorBox error={error||query.error}/>{notice&&<p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}{!data?<p role="status">{query.isLoading?"Loading settings...":"Settings could not be loaded."}</p>:<form className="space-y-6 rounded-2xl border bg-card p-6" onSubmit={async e=>{e.preventDefault();setError(null);setNotice("");try{await save({percentage:Number(percentage),expectedRevision:draft?.revision??data.revision}).unwrap();setDraft(null);setNotice("PC Bill percentage saved.");}catch(err){setError(err);}}}><div className="flex items-start gap-3"><div><h2 className="font-semibold">Reference percentage</h2></div></div><div className="max-w-sm space-y-2"><div className="relative"><Input id="pc-bill-percentage" aria-label="Reference percentage (%)" className="pr-10" type="number" required min="0" max="100" step="0.01" value={percentage} disabled={!editable||state.isLoading} onChange={e=>{setDraft({percentage:e.target.value,revision:draft?.revision??data.revision});setNotice("");}}/><Percent className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-muted-foreground"/></div></div><div className="flex flex-wrap gap-3 border-t pt-5">{editable&&<Button type="submit" disabled={state.isLoading||query.isFetching}><Save className="h-4 w-4"/>{state.isLoading?"Saving...":"Save"}</Button>}</div></form>}</div>;
}
